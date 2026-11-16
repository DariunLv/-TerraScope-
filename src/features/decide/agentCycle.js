import { useStore } from '../../core/store';
import { lakeClimate } from '../lakes/lakeclim';
import { eelSpace } from './decideEngine';
import { km } from '../lakes/lakesData';
import { runAnalysis } from '../../lib/analysis/run';
import { createRequestGuard, aborted } from '../../core/useRequest';
export const STEPS = ['observe', 'learn', 'discover', 'hypothesis', 'evidence', 'verify'];
const EVERY = 15 * 60e3, guard = createRequestGuard();
let timer, initialTimer, unsubscribe, started = false, activeInputs;
const inputs = (state) => [state.lakes, state.practice, state.monitoringPoints, state.monitoringSource];
const same = (a, b) => a?.every((value, index) => value === b[index]);
const load = (key) => { try { const memory = JSON.parse(localStorage.getItem(key) || '{}'); return memory.version === 2 ? memory : {}; } catch { return {}; } };
const identity = (lake) => `${lake.id}@${lake.lat.toFixed(3)},${lake.lon.toFixed(3)}`;
export async function runCycle({ refresh = false } = {}) {
  const state = useStore.getState(), currentInputs = inputs(state), { lakes, practice, monitoringPoints, monitoringSource } = state;
  if (!lakes.length || state.agent.status === 'running' && same(activeInputs, currentInputs) && !refresh) return;
  const request = guard.begin(); activeInputs = currentInputs;
  const set = (patch) => { if (request.current()) useStore.setState((previous) => ({ agent: { ...previous.agent, ...patch } })); };
  const key = `ts_agent_v2:${practice ? 'practice' : 'real'}`, memory = load(key), rows = [], climates = new Map(), predictions = new Map(), events = [];
  const queue = lakes.slice(0, 200); let completed = 0;
  set({ status: 'running', step: 'observe', pct: 0 });
  try {
    await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length && request.current()) {
      const lake = queue.shift();
      try {
        const climate = await lakeClimate(lake, practice, { signal: request.signal, refresh });
        const result = await runAnalysis('lake', { clim: climate, lake }, { signal: request.signal });
        if (result.watch && result.raw && request.current()) {
          climates.set(lake.id, climate); predictions.set(lake.id, result.prediction);
          rows.push({ id: lake.id, name: lake.name, vert: lake.vert, alt: lake.alt, area: lake.area, type: lake.type, ...result.watch, raw: result.raw, source: climate.src, when: climate.when, coverage: climate.coverage, identity: identity(lake), near: monitoringSource && monitoringPoints.length ? Math.min(...monitoringPoints.map((point) => km(lake, point))) : 999, observationsVerified: !!monitoringSource });
        }
      } catch (error) { if (aborted(error) || request.signal.aborted) throw error; }
      set({ pct: Math.round(++completed / Math.min(200, lakes.length) * 100) });
    } }));
    if (!request.current()) return;
    rows.sort((a, b) => a.name.localeCompare(b.name)); set({ step: 'learn' });
    const space = eelSpace(rows), previous = memory.prev || {}, now = {};
    set({ step: 'discover' });
    for (const row of rows) {
      now[row.identity] = { level: row.level };
      if (previous[row.identity] && previous[row.identity].level !== row.level) events.push({ kind: 'change', id: row.id, name: row.name, from: previous[row.identity].level, to: row.level, zw: row.zw, zt: row.zt });
    }
    if (!Object.keys(previous).length) events.push({ kind: 'first', n: rows.length });
    set({ step: 'hypothesis' });
    const needs = rows.filter((row) => row.level >= 1).sort((a, b) => b.sev - a.sev).slice(0, 3).map((row) => ({ id: row.id, name: row.name, why: !row.observationsVerified || row.near > 100 ? 'station' : row.area < 60 ? 'radar' : 'second' }));
    set({ step: 'evidence' });
    let hits = memory.hits || 0, total = memory.total || 0; const keep = [];
    set({ step: 'verify' });
    for (const prediction of memory.ledger || []) {
      const row = rows.find((row) => row.identity === prediction.identity), climate = row && climates.get(row.id), observed = climate?.ann.find((year) => year.year === prediction.year);
      if (observed) { const ok = observed.wb / 12 >= prediction.q05 && observed.wb / 12 <= prediction.q95; total++; if (ok) hits++; events.push({ kind: 'verify', id: row.id, name: row.name, ok, pred: Math.round(prediction.q50 * 12), obs: Math.round(observed.wb), year: prediction.year }); }
      else if (prediction.t > Date.now() - 800 * 864e5) keep.push(prediction);
    }
    for (const row of rows) { const prediction = predictions.get(row.id); if (prediction && !keep.some((item) => item.identity === row.identity && item.year === prediction.year)) keep.push({ ...prediction, identity: row.identity, id: row.id, name: row.name, t: Date.now(), source: row.source }); }
    const log = [...events.map((event) => ({ ...event, t: Date.now() })), ...(memory.log || [])].slice(0, 60), last = Date.now();
    try { localStorage.setItem(key, JSON.stringify({ version: 2, prev: now, ledger: keep, hits, total, log, last })); } catch { /* La vigilancia funciona sin almacenamiento. */ }
    const sources = [...new Set(rows.map((row) => row.source))];
    set({ status: 'idle', step: null, pct: 100, rows, space, needs, log, last, unseen: (useStore.getState().agent.unseen || 0) + events.filter((event) => event.kind !== 'first').length, src: practice ? 'demo' : sources.length === 1 ? sources[0] : sources.length ? 'mixed-real' : 'unavailable', practice, missing: lakes.length - rows.length, limited: lakes.length > 200, ledger: { pending: keep.length, hits, total } });
  } catch (error) { if (request.current() && !aborted(error)) set({ status: 'error', step: null, src: 'unavailable' }); }
  finally { if (request.current() && useStore.getState().agent.status === 'running') set({ status: 'idle', step: null }); }
}
export function startAgent() {
  if (started) return; started = true;
  initialTimer = setTimeout(() => { if (useStore.getState().agent.auto) runCycle(); }, 2500);
  timer = setInterval(() => { if (useStore.getState().agent.auto && !document.hidden) runCycle(); }, EVERY);
  unsubscribe = useStore.subscribe((state, previous) => { if (!same(inputs(state), inputs(previous))) { guard.cancel(); useStore.setState((current) => ({ agent: { ...current.agent, status: 'idle', rows: null, space: null, src: null } })); if (state.agent.auto) { clearTimeout(initialTimer); initialTimer = setTimeout(runCycle, 0); } } });
}
export const nextRunIn = (last) => last ? Math.max(0, Math.round((last + EVERY - Date.now()) / 60e3)) : 0;
export function stopAgent() { clearTimeout(initialTimer); clearInterval(timer); unsubscribe?.(); guard.cancel(); started = false; }
