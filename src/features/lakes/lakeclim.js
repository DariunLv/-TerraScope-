/* Clima de cada lago (lluvia, evaporación y temperatura de NASA POWER) con caché en memoria,
   balance lluvia − evaporación y vigilancia automática de los últimos 12 meses. */
import { power, demo } from '../../lib/nasa/data';
import * as I from '../../lib/analysis/intel';
const cache = new Map(), KS = ['PRECTOTCORR', 'EVLAND', 'T2M'], Y0 = 1981;
/* Orden de búsqueda de datos reales: 1) instantánea local descargada (public/datos/clima-lagos.json), 2) caché del navegador
   (datos que ya se bajaron antes), 3) NASA POWER en vivo, 4) datos de práctica. Así la demo no depende de internet. */
const kk = (l) => `${(+l.lat).toFixed(2)},${(+l.lon).toFixed(2)}`;
let snapP = null;
function snapshot() {
  if (!snapP) snapP = fetch(`${import.meta.env.BASE_URL}datos/clima-lagos.json`).then((r) => (r.ok ? r.json() : null)).then((j) => (j && j.series ? j : null)).catch(() => null);
  return snapP;
}
const fromArr = (arr, y0) => arr.map((v, i) => (v == null ? null : { year: y0 + Math.floor(i / 12), month: i % 12, x: y0 + Math.floor(i / 12) + (i % 12) / 12, v })).filter(Boolean);
const toArr = (pts, y0 = Y0) => { const n = Math.max(...pts.map((p) => (p.year - y0) * 12 + p.month)) + 1, a = Array(n).fill(null); pts.forEach((p) => { a[(p.year - y0) * 12 + p.month] = +p.v.toFixed(3); }); return a; };
const LS = 'ts_clim_v1';
const lsGet = (key) => { try { const o = JSON.parse(localStorage.getItem(LS) || '{}')[key]; return o && Date.now() - o.t < 30 * 864e5 ? o : null; } catch { return null; } };
const lsSet = (key, d) => { try { const all = JSON.parse(localStorage.getItem(LS) || '{}'); all[key] = { t: Date.now(), d: Object.fromEntries(KS.map((k) => [k, toArr(d[k])])) }; localStorage.setItem(LS, JSON.stringify(all)); } catch { /* sin espacio */ } };
export const cachedCount = () => { try { return Object.keys(JSON.parse(localStorage.getItem(LS) || '{}')).length; } catch { return 0; } };
export async function snapshotInfo() { const s = await snapshot(); return s ? { when: s.generado, n: Object.keys(s.series).length, src: s.fuente } : null; }
export async function lakeClimate(l, practice) {
  const key = `${kk(l)},${practice ? 'p' : 'l'}`; if (cache.has(key)) return cache.get(key);
  let d = null, src = 'demo', when = null;
  if (!practice) {
    const sn = await snapshot(), e = sn?.series?.[kk(l)];
    if (e && KS.every((k) => e[k]?.length > 120)) { d = Object.fromEntries(KS.map((k) => [k, fromArr(e[k], sn.y0 || Y0)])); src = 'snapshot'; when = sn.generado; }
    if (!d) { const c = lsGet(kk(l)); if (c) { d = Object.fromEntries(KS.map((k) => [k, fromArr(c.d[k], Y0)])); src = 'cache'; when = new Date(c.t).toISOString(); } }
    if (!d) { try { const r = await power(l.lat, l.lon, KS, Y0, new Date().getFullYear() - 1); if (KS.every((k) => r[k] && r[k].length > 120)) { d = r; src = 'live'; when = new Date().toISOString(); lsSet(kk(l), r); } } catch { /* sin internet */ } }
  }
  if (!d) d = demo(l.lat, l.lon, KS, Y0, 2025);
  const live = src !== 'demo', wb = I.waterBalance(d.PRECTOTCORR, d.EVLAND), out = { d, live, src, when, wb, ann: I.annualSums(wb) };
  cache.set(key, out); return out;
}
const med = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
/* Últimos 12 meses comparados con los mismos 12 meses de los años anteriores, descontando la tendencia de fondo (z robusto).
   Así el vigía no marca lo que ya se espera por la tendencia, sino lo que se sale de ella. */
export function last12(pts, agg = 'sum') {
  const n = pts.length, m = pts[n - 1].month, vals = [];
  for (let i = n - 1; i >= 11; i -= 1) if (pts[i].month === m) { let s = 0; for (let j = i - 11; j <= i; j++) s += pts[j].v; vals.unshift(agg === 'sum' ? s : s / 12); }
  const k = vals.length - 1; if (k < 10) return null;
  const hx = vals.slice(0, k).map((_, i) => i), hy = vals.slice(0, k), xb = (k - 1) / 2, yb = hy.reduce((a, b) => a + b, 0) / k;
  let sxx = 0, sxy = 0; hx.forEach((x, i) => { sxx += (x - xb) ** 2; sxy += (x - xb) * (hy[i] - yb); });
  const b = sxy / sxx, a = yb - b * xb, res = hy.map((y, i) => y - (a + b * i)), c = med(res), s = 1.4826 * med(res.map((v) => Math.abs(v - c))) || 1e-9, exp = a + b * k;
  return { z: (vals[k] - exp) / s, last: vals[k], normal: exp, n: k, end: pts[n - 1] };
}
export function watchLake(clim) {
  const w = last12(clim.wb, 'sum'), t = last12(clim.d.T2M, 'mean'); if (!w || !t) return null;
  const sev = Math.max(Math.abs(w.z), Math.abs(t.z)), p = Math.min(1, 2 * 2 * (1 - I.phi(sev))); // Bonferroni por mirar dos variables
  return { zw: w.z, zt: t.z, wb: w.last, wbN: w.normal, t: t.last, tN: t.normal, sev, p, level: sev >= 2.5 ? 2 : sev >= 1.5 ? 1 : 0, end: w.end };
}
export const LEVELS = [['Normal', 'Normal', '#0c7a5b'], ['Vigilar', 'Watch', '#d97706'], ['Alerta', 'Alert', '#b91c1c']];
