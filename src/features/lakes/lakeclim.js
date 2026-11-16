/* Clima de cada lago (lluvia, evaporación y temperatura de NASA POWER) con caché en memoria,
   balance lluvia − evaporación y vigilancia automática de los últimos 12 meses. */
import { power, demo } from '../../lib/nasa/data';
import * as I from '../../lib/analysis/intel';
import { DATA_VERSION, coverageOf, monthKey, pointsFromArray, monthlyArray } from '../../lib/data/monthly.js';
const cache = new Map(), KS = ['PRECTOTCORR', 'EVLAND', 'T2M'], Y0 = 1981;
/* Datos reales: instantánea/caché válidas, luego POWER. Una instantánea antigua solo sirve
   de respaldo identificado. La simulación requiere elegir expresamente Práctica. */
const kk = (l) => `${(+l.lat).toFixed(2)},${(+l.lon).toFixed(2)}`;
let snapP = null, snapshotAt = 0;
function snapshot(refresh = false) {
  if (refresh || Date.now() - snapshotAt > 3600000) snapP = null;
  if (!snapP) { snapshotAt = Date.now(); snapP = fetch(`${import.meta.env.BASE_URL}datos/clima-lagos.json`, { cache: refresh ? 'reload' : 'default', signal: AbortSignal.timeout(15000) }).then((r) => (r.ok ? r.json() : null)).then((j) => (j?.schemaVersion === DATA_VERSION && j.series && Number.isInteger(j.y0) && Number.isInteger(j.y1) ? j : null)).catch(() => { snapP = null; return null; }); }
  return snapP;
}
const LS = 'ts_clim_v2';
const lsGet = (key) => { try { const o = JSON.parse(localStorage.getItem(LS) || '{}')[key]; return o?.version === DATA_VERSION && Date.now() - o.t < 30 * 864e5 ? o : null; } catch { return null; } };
const lsSet = (key, d, y1) => { try { const all = JSON.parse(localStorage.getItem(LS) || '{}'); all[key] = { version: DATA_VERSION, y0: Y0, y1, t: Date.now(), d: Object.fromEntries(KS.map((k) => [k, monthlyArray(Object.fromEntries(d[k].map((p) => [`${p.year}${String(p.month + 1).padStart(2, '0')}`, p.v])), Y0, y1)])) }; const recent = Object.entries(all).sort((a, b) => b[1].t - a[1].t).slice(0, 200); localStorage.setItem(LS, JSON.stringify(Object.fromEntries(recent))); } catch { /* sin espacio */ } };
export const cachedCount = () => { try { return Object.keys(JSON.parse(localStorage.getItem(LS) || '{}')).length; } catch { return 0; } };
export async function snapshotInfo() { const s = await snapshot(); return s ? { when: s.generado, n: Object.keys(s.series).length, src: s.fuente } : null; }
export function clearClimateCache() { cache.clear(); snapP = null; }
export async function lakeClimate(l, practice, { signal, refresh = false } = {}) {
  signal?.throwIfAborted();
  const key = `${kk(l)},${practice ? 'p' : 'l'}`, entry = cache.get(key);
  if (!refresh && entry && Date.now() - entry.t < 3600000) return entry.value;
  const y1 = new Date().getUTCFullYear() - 1;
  let d = null, src = 'demo', when = null, stale = false, fallback = null;
  if (!practice) {
    const sn = await snapshot(refresh), e = sn?.series?.[kk(l)]; signal?.throwIfAborted();
    if (e) {
      const parsed = Object.fromEntries(KS.map((k) => [k, pointsFromArray(e[k], sn.y0, sn.y1)]));
      if (KS.every((k) => parsed[k].length >= 144)) {
        const retrieved = sn.retrieved?.[kk(l)] || sn.generado;
        fallback = { d: parsed, src: 'snapshot', when: retrieved };
        if (!refresh && sn.y1 >= y1 && Date.now() - Date.parse(retrieved) < 30 * 864e5) ({ d, src, when } = fallback);
      }
    }
    if (!d && !refresh) { const c = lsGet(kk(l)); if (c) { const parsed = Object.fromEntries(KS.map((k) => [k, pointsFromArray(c.d[k], c.y0, c.y1)])); if (KS.every((k) => parsed[k].length >= 144) && c.y1 >= y1) { d = parsed; src = 'cache'; when = new Date(c.t).toISOString(); } } }
    if (!d) {
      try { const r = await power(l.lat, l.lon, KS, Y0, y1, { signal, refresh }); if (KS.every((k) => r[k]?.length >= 144)) { d = r; src = 'live'; when = new Date().toISOString(); lsSet(kk(l), r, y1); } }
      catch (error) { if (signal?.aborted || error.name === 'AbortError') throw error; }
      if (!d && fallback) { ({ d, src, when } = fallback); stale = true; }
    }
    if (!d) throw new Error('CLIMATE_UNAVAILABLE');
  }
  if (!d) d = demo(l.lat, l.lon, KS, Y0, y1);
  signal?.throwIfAborted();
  const live = src !== 'demo', wb = I.waterBalance(d.PRECTOTCORR, d.EVLAND), out = { d, live, src, when, stale, coverage: coverageOf(wb), wb, ann: I.annualSums(wb) };
  if (!wb.length || out.ann.length < 12) throw new Error('CLIMATE_UNAVAILABLE');
  if (!stale) { cache.set(key, { t: Date.now(), value: out }); if (cache.size > 200) cache.delete(cache.keys().next().value); }
  return out;
}
const med = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
/* Últimos 12 meses comparados con los mismos 12 meses de los años anteriores, descontando la tendencia de fondo (z robusto).
   Así el vigía no marca lo que ya se espera por la tendencia, sino lo que se sale de ella. */
export function last12(pts, agg = 'sum') {
  if (pts.length < 12) return null;
  const n = pts.length, m = pts[n - 1].month, vals = [], dates = [];
  for (let i = n - 1; i >= 11; i--) if (pts[i].month === m) {
    const window = pts.slice(i - 11, i + 1), complete = window.every((point, j) => Number.isFinite(point.v) && monthKey(point) === monthKey(window[0]) + j);
    if (i === n - 1 && !complete) return null;
    if (complete) { const sum = window.reduce((s, p) => s + p.v, 0); vals.unshift(agg === 'sum' ? sum : sum / 12); dates.unshift(pts[i].year); }
  }
  const k = vals.length - 1; if (k < 10) return null;
  const hx = dates.slice(0, k), hy = vals.slice(0, k), xb = hx.reduce((a, b) => a + b, 0) / k, yb = hy.reduce((a, b) => a + b, 0) / k;
  let sxx = 0, sxy = 0; hx.forEach((x, i) => { sxx += (x - xb) ** 2; sxy += (x - xb) * (hy[i] - yb); });
  const b = sxx ? sxy / sxx : 0, a = yb - b * xb, res = hy.map((y, i) => y - (a + b * hx[i])), c = med(res), s = 1.4826 * med(res.map((v) => Math.abs(v - c))) || 1e-9, exp = a + b * dates[k];
  return { z: (vals[k] - exp) / s, last: vals[k], normal: exp, n: k, end: pts[n - 1] };
}
export function watchLake(clim) {
  const w = last12(clim.wb, 'sum'), t = last12(clim.d.T2M, 'mean'); if (!w || !t) return null;
  const sev = Math.max(Math.abs(w.z), Math.abs(t.z)), p = Math.min(1, 2 * 2 * (1 - I.phi(sev))); // Bonferroni por mirar dos variables
  return { zw: w.z, zt: t.z, wb: w.last, wbN: w.normal, t: t.last, tN: t.normal, sev, p, level: sev >= 2.5 ? 2 : sev >= 1.5 ? 1 : 0, end: w.end };
}
export const LEVELS = [['Normal', 'Normal', '#0c7a5b'], ['Vigilar', 'Watch', '#d97706'], ['Alerta', 'Alert', '#b91c1c']];
