const queue = []; let active = 0;
const abortError = () => new DOMException('Cancelled', 'AbortError');
function drain() {
  while (active < 2 && queue.length) {
    const job = queue.shift();
    job.signal?.removeEventListener('abort', job.cancelQueued);
    if (job.signal?.aborted) { job.reject(abortError()); continue; }
    active++;
    let worker, settled = false;
    const finish = (error, result) => {
      if (settled) return; settled = true; worker?.terminate(); job.signal?.removeEventListener('abort', cancel); active--;
      error ? job.reject(error) : job.resolve(result); drain();
    };
    const cancel = () => finish(abortError());
    job.signal?.addEventListener('abort', cancel, { once: true });
    const fallback = async () => {
      try {
        const { analysisTask } = await import('./tasks');
        const result = await analysisTask(job.type, job.payload, job.onProgress, () => new Promise((resolve, reject) => setTimeout(() => job.signal?.aborted ? reject(abortError()) : resolve(), 0)));
        if (!job.signal?.aborted) finish(null, result); else finish(abortError());
      } catch (error) { finish(error); }
    };
    try {
      if (typeof Worker === 'undefined') { fallback(); continue; }
      worker = new Worker(new URL('./analysis.worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }) => { if ('progress' in data) job.onProgress?.(data.progress); else finish(data.error ? new Error(data.error) : null, data.result); };
      worker.onerror = () => finish(new Error('No se pudo ejecutar el análisis. Reintenta la investigación.'));
      worker.postMessage({ type: job.type, payload: job.payload });
    } catch { worker?.terminate(); fallback(); }
  }
}
export function runAnalysis(type, payload, { signal, onProgress } = {}) {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const job = { type, payload, signal, onProgress, resolve, reject };
    job.cancelQueued = () => { const index = queue.indexOf(job); if (index >= 0) { queue.splice(index, 1); signal.removeEventListener('abort', job.cancelQueued); reject(abortError()); } };
    signal?.addEventListener('abort', job.cancelQueued, { once: true }); queue.push(job); drain();
  });
}
