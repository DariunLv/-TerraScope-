import { consumeQuota } from './rateLimit.js';
let preferred = null;
const MAX_BODY = 48000;
export function validateChatBody(body) {
  if (typeof body === 'string') { if (body.length > MAX_BODY) throw new Error('BODY_TOO_LARGE'); try { body = JSON.parse(body); } catch { throw new Error('INVALID_BODY'); } }
  if (!body || typeof body !== 'object' || Array.isArray(body) || (body.system != null && typeof body.system !== 'string') || !Array.isArray(body.messages) || !body.messages.length || body.messages.length > 8) throw new Error('INVALID_BODY');
  const system = body.system || '';
  if (system.length > 10000) throw new Error('BODY_TOO_LARGE');
  const messages = body.messages.map((message) => {
    if (!message || typeof message !== 'object' || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string' || !message.content.trim()) throw new Error('INVALID_BODY');
    if (message.content.length > 12000) throw new Error('BODY_TOO_LARGE');
    return { role: message.role, content: message.content.trim() };
  });
  if (system.length + messages.reduce((sum, message) => sum + message.content.length, 0) > 40000 || messages.at(-1).role !== 'user') throw new Error('BODY_TOO_LARGE');
  if (body.provider != null && !['groq', 'gemini'].includes(body.provider)) throw new Error('INVALID_BODY');
  return { system, messages, ...(body.provider ? { provider: body.provider } : {}) };
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'GET') return res.status(200).json({ ok: true, provider: process.env.GROQ_API_KEY ? 'groq' : process.env.GEMINI_API_KEY ? 'gemini' : null });
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'método no permitido' }); }
  let input;
  try { if (+req.headers?.['content-length'] > MAX_BODY) throw new Error('BODY_TOO_LARGE'); input = validateChatBody(req.body); }
  catch (error) { return res.status(error.message === 'BODY_TOO_LARGE' ? 413 : 400).json({ error: 'solicitud inválida: revisa los mensajes y su longitud' }); }
  const controller = new AbortController(), deadline = Date.now() + 28000, timeout = setTimeout(() => controller.abort(), 28000);
  const abort = () => controller.abort(); req.once?.('aborted', abort);
  const post = async (url, init) => {
    controller.signal.throwIfAborted();
    const remaining = deadline - Date.now(); if (remaining <= 0) throw new DOMException('Timeout', 'AbortError');
    const response = await fetch(url, { ...init, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(Math.min(10000, remaining))]) });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  };
  try {
    const ip = String(req.headers?.['x-vercel-forwarded-for'] || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim().slice(0, 128);
    const quota = await consumeQuota(ip, { signal: controller.signal });
    res.setHeader('X-RateLimit-Scope', quota.shared ? 'shared' : 'instance');
    if (!quota.allowed) { res.setHeader('Retry-After', String(quota.retryAfter)); return res.status(429).json({ error: 'demasiadas preguntas seguidas, espera un minuto' }); }
    if (process.env.GROQ_API_KEY) {
      // Public production models; older Llama IDs now require Enterprise access.
      // An unavailable custom model must not prevent trying the public defaults.
      const models = [...new Set([process.env.GROQ_MODEL, preferred, 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'].filter(Boolean))].slice(0, 3);
      for (const model of models) {
        const body = { model, temperature: 0.2, max_completion_tokens: 2048, messages: [{ role: 'system', content: input.system }, ...input.messages] };
        if (/gpt-oss/.test(model)) { body.reasoning_effort = 'low'; body.reasoning_format = 'hidden'; }
        let result;
        try {
          result = await post('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: JSON.stringify(body) });
        } catch (error) { if (controller.signal.aborted) throw error; continue; }
        if (result.status === 401) return res.status(503).json({ code: 'AI_AUTH', error: 'revisa la clave de Groq configurada en el servidor' });
        if (result.status === 429) { res.setHeader('Retry-After', '60'); return res.status(429).json({ error: 'cuota del proveedor alcanzada; espera un momento' }); }
        const content = result.data.choices?.[0]?.message?.content;
        const text = typeof content === 'string' ? content.trim() : '';
        if (result.ok && text) { preferred = model; return res.status(200).json({ text, model, provider: 'groq' }); }
        // Model-specific permissions, retirement, empty responses and transient
        // provider errors can recover on the next model within the same deadline.
      }
      return res.status(503).json({ code: 'AI_UNAVAILABLE', error: 'Groq no pudo responder con los modelos disponibles; vuelve a intentarlo' });
    }
    if (input.provider !== 'groq' && process.env.GEMINI_API_KEY) {
      const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const result = await post(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY }, body: JSON.stringify({ systemInstruction: { parts: [{ text: input.system }] }, contents: input.messages.map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] })), generationConfig: { temperature: 0.2, maxOutputTokens: 900, thinkingConfig: { thinkingBudget: 0 } } }) });
      const text = result.data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
      if (!result.ok || !text) return res.status(result.status === 429 ? 429 : 502).json({ error: 'el proveedor no respondió; reintenta o usa reglas locales' });
      return res.status(200).json({ text, model });
    }
    return res.status(501).json({ code: 'AI_CONFIG', error: 'falta configurar GROQ_API_KEY en el servidor' });
  } catch (error) { return res.status(error.name === 'AbortError' || error.name === 'TimeoutError' ? 504 : error.message === 'QUOTA_UNAVAILABLE' ? 503 : 502).json({ code: error.message === 'QUOTA_UNAVAILABLE' ? 'AI_QUOTA_SERVICE' : controller.signal.aborted ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE', error: 'no se pudo completar la consulta de IA; vuelve a intentarlo' }); }
  finally { clearTimeout(timeout); req.removeListener?.('aborted', abort); }
}
