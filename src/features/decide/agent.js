/* Centinela IA: un agente que corre solo mientras la app está abierta y recorre el ciclo científico completo:
   OBSERVAR (clima de todos los lagos) → APRENDER (qué es normal para cada uno) → DESCUBRIR (anomalías y patrones que nadie pidió)
   → FORMULAR HIPÓTESIS → BUSCAR EVIDENCIA (qué dato falta) → VERIFICAR (compara contra lo que predijo antes).
   Guarda su memoria en el navegador, así detecta cambios entre una revisión y la siguiente. Todo local. */
import { useStore } from '../../core/store';
import { lakeClimate, watchLake } from '../lakes/lakeclim';
import { eelRaw, eelSpace } from './decideEngine';
import * as I from '../../lib/analysis/intel';
import { km, SAMPLE_POINTS } from '../lakes/lakesData';

export const STEPS = ['observe', 'learn', 'discover', 'hypothesis', 'evidence', 'verify'];
const KEY = 'ts_agent_v1', EVERY = 15 * 60e3;
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const save = (m) => { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* sin espacio */ } };
const tick = () => new Promise((r) => setTimeout(r, 0));
const set = (p) => useStore.setState((s) => ({ agent: { ...s.agent, ...p } }));
let timer = null, started = false;

export async function runCycle() {
  const st = useStore.getState(), { lakes, practice } = st; if (st.agent.status === 'running' || !lakes.length) return;
  const mem = load(), prev = mem.prev || {}, ledger = mem.ledger || [], events = [];
  set({ status: 'running', step: 'observe', pct: 0 });
  const rows = [], clims = new Map(), q = [...lakes]; let done = 0, src = 'demo';
  await Promise.all(Array.from({ length: 4 }, async () => { while (q.length) { const l = q.shift(); try {
    const c = await lakeClimate(l, practice); clims.set(l.id, c); if (c.src !== 'demo') src = c.src; const w = watchLake(c), raw = eelRaw(c, l);
    if (w && raw) rows.push({ id: l.id, name: l.name, vert: l.vert, alt: l.alt, area: l.area, type: l.type, level: w.level, zw: w.zw, zt: w.zt, sev: w.sev, near: Math.min(...SAMPLE_POINTS.map((p) => km(l, p))), raw });
  } catch { /* sin datos */ } set({ pct: Math.round((++done / lakes.length) * 100) }); await tick(); } }));
  rows.sort((a, b) => a.name.localeCompare(b.name));
  set({ step: 'learn', pct: 100 }); await tick();
  const space = eelSpace(rows);
  set({ step: 'discover' }); await tick();
  // cambios desde la revisión anterior
  const now = {}; rows.forEach((r) => { now[r.id] = { level: r.level, zw: +r.zw.toFixed(2), name: r.name }; if (prev[r.id] && prev[r.id].level !== r.level) events.push({ kind: 'change', id: r.id, name: r.name, from: prev[r.id].level, to: r.level, zw: +r.zw.toFixed(2), zt: +r.zt.toFixed(2) }); });
  if (!Object.keys(prev).length) events.push({ kind: 'first', n: rows.length });
  set({ step: 'hypothesis' }); await tick();
  set({ step: 'evidence' }); await tick();
  const needs = rows.filter((r) => r.level >= 1).sort((a, b) => b.sev - a.sev).slice(0, 3).map((r) => ({ id: r.id, name: r.name, why: r.near > 100 ? 'station' : r.area < 60 ? 'radar' : 'second' }));
  // verificación: ¿acertó lo que predijo antes? (cuando ya hay datos del año pronosticado)
  set({ step: 'verify' }); await tick();
  let hits = mem.hits || 0, total = mem.total || 0; const keep = [];
  for (const e of ledger) {
    const c = clims.get(e.id), yr = c?.ann.find((a) => a.year === e.year);
    if (yr) { total++; const m = yr.wb / 12, ok = m >= e.q05 && m <= e.q95; if (ok) hits++; events.push({ kind: 'verify', id: e.id, name: e.name, ok, pred: Math.round(e.q50 * 12), obs: Math.round(yr.wb), year: e.year }); } else if (e.t > Date.now() - 800 * 864e5) keep.push(e);
  }
  // anota nuevas predicciones (una por lago y año) para verificarlas cuando lleguen los datos
  for (const r of rows) { const c = clims.get(r.id), last = c.wb[c.wb.length - 1], year = last.year + 1; if (keep.some((e) => e.id === r.id && e.year === year) || c.ann.some((a) => a.year === year)) continue;
    try { const s = I.simulate(c.wb, { years: 1, B: 150, seed: 11 }).ann[0]; keep.push({ id: r.id, name: r.name, year, t: Date.now(), q05: s.q05, q50: s.q50, q95: s.q95 }); } catch { /* serie corta */ } }
  const log = [...events.map((e) => ({ ...e, t: Date.now() })), ...(mem.log || [])].slice(0, 60);
  save({ prev: now, ledger: keep, hits, total, log, last: Date.now() });
  const unseen = (useStore.getState().agent.unseen || 0) + events.filter((e) => e.kind !== 'first').length;
  set({ status: 'idle', step: null, pct: 100, rows, space, needs, log, last: Date.now(), unseen, src, ledger: { pending: keep.length, hits, total }, practice });
}

export function startAgent() {
  if (started) return; started = true;
  const mem = load(); useStore.setState((s) => ({ agent: { ...s.agent, log: mem.log || [], last: mem.last || null, ledger: { pending: (mem.ledger || []).length, hits: mem.hits || 0, total: mem.total || 0 } } }));
  setTimeout(runCycle, 2500);
  timer = setInterval(() => { if (useStore.getState().agent.auto) runCycle(); }, EVERY);
}
export const nextRunIn = (last) => (last ? Math.max(0, Math.round((last + EVERY - Date.now()) / 60e3)) : 0);
export const stopAgent = () => { clearInterval(timer); started = false; };
