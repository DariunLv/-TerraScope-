/* Inteligencia ambiental estadística (todo se calcula en el navegador):
   normalidad contextual, detección de anomalías (3 métodos), anomalía conjunta multivariable,
   pronóstico con incertidumbre y validación retrospectiva, señales de alerta temprana y relleno de vacíos.
   Referencias: Liu et al. 2008 (Isolation Forest); Scheffer et al. 2009 y Dakos et al. 2012 (alerta temprana);
   Mahalanobis 1936; Hyndman & Athanasopoulos 2021 (pronóstico y validación). */
import { ols, mannKendall, mean } from './stats';

const MAD = 1.4826;
const med = (a) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const sdev = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, a.length - 1)); };
const quant = (s, q) => { const p = (s.length - 1) * q, i = Math.floor(p), f = p - i; return s[i + 1] !== undefined ? s[i] * (1 - f) + s[i + 1] * f : s[i]; };
export const phi = (z) => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const gauss = (r) => Math.sqrt(-2 * Math.log(Math.max(r(), 1e-12))) * Math.cos(2 * Math.PI * r());

/* ---------- Modelo base: tendencia + ciclo estacional + residuo ---------- */
export function baseline(pts, detrend = true) {
  const x = pts.map((p) => p.x), v = pts.map((p) => p.v), o = ols(x, v), b = detrend ? o.slope : 0, x0 = mean(x);
  const dt = v.map((y, i) => y - b * (x[i] - x0));
  const g = Array.from({ length: 12 }, () => []); pts.forEach((p, i) => g[p.month].push(dt[i]));
  const S = g.map((a) => (a.length ? med(a) : NaN)), gm = mean(S.filter((s) => !isNaN(s))); for (let m = 0; m < 12; m++) if (isNaN(S[m])) S[m] = gm;
  const res = pts.map((p, i) => dt[i] - S[p.month]);
  const pool = MAD * med(res.map((r) => Math.abs(r - med(res)))) || sdev(res) || 1e-9;
  const sm = g.map((a, m) => { const r = a.map((y) => y - S[m]); const s = MAD * med(r.map((y) => Math.abs(y))); return Math.sqrt(0.5 * (s || pool) ** 2 + 0.5 * pool ** 2); });
  const exp = pts.map((p, i) => S[p.month] + b * (x[i] - x0));
  return { x, v, b, x0, S, res, exp, s: pts.map((p) => sm[p.month]), pool, se: o.se };
}

/* ---------- Anomalías: normalidad contextual (por lugar y mes) ---------- */
export function contextual(pts, { thr = 2.5, detrend = true } = {}) {
  const B = baseline(pts, detrend), z = B.res.map((r, i) => r / B.s[i]);
  const flags = z.map((q) => Math.abs(q) >= thr);
  const list = pts.map((p, i) => ({ i, x: p.x, year: p.year, month: p.month, v: p.v, exp: B.exp[i], z: z[i] })).filter((d) => flags[d.i]).sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
  return { ...B, z, flags, list, expected: pts.length * 2 * (1 - phi(thr)) };
}
/* Umbral fijo global: el método ingenuo. Marca los meses extremos del año, no los inusuales para su época. */
export function globalThreshold(pts, thr = 2.5) { const v = pts.map((p) => p.v), m = mean(v), s = sdev(v) || 1e-9; return v.map((y) => Math.abs((y - m) / s) >= thr); }

/* ---------- Isolation Forest (Liu, Ting & Zhou 2008) sobre [residuo, salto, media móvil] ---------- */
const cFac = (n) => (n <= 1 ? 0 : 2 * (Math.log(n - 1) + 0.5772156649) - 2 * (n - 1) / n);
export function isolationForest(X, { trees = 120, psi = 256, seed = 7 } = {}) {
  const n = X.length, d = X[0].length, r = rng(seed), m = Math.min(psi, n), hl = Math.ceil(Math.log2(m)), forest = [];
  const build = (idx, h) => {
    if (h >= hl || idx.length <= 1) return { n: idx.length };
    const f = Math.floor(r() * d); let lo = Infinity, hi = -Infinity; idx.forEach((i) => { const q = X[i][f]; if (q < lo) lo = q; if (q > hi) hi = q; });
    if (hi === lo) return { n: idx.length };
    const cut = lo + r() * (hi - lo), L = [], R = []; idx.forEach((i) => (X[i][f] < cut ? L : R).push(i));
    return { f, cut, L: build(L, h + 1), R: build(R, h + 1) };
  };
  for (let t = 0; t < trees; t++) { const idx = Array.from({ length: n }, (_, i) => i); for (let i = 0; i < m; i++) { const j = i + Math.floor(r() * (n - i)); [idx[i], idx[j]] = [idx[j], idx[i]]; } forest.push(build(idx.slice(0, m), 0)); }
  const path = (node, q, h) => (node.f === undefined ? h + cFac(node.n) : path(q[node.f] < node.cut ? node.L : node.R, q, h + 1));
  const c = cFac(m);
  return X.map((q) => 2 ** (-(forest.reduce((s, t) => s + path(t, q, 0), 0) / trees) / c));
}
export function forestFlags(B, share) {
  const r = B.res.map((y, i) => y / B.s[i]);
  const X = r.map((y, i) => [y, i ? y - r[i - 1] : 0, (r[Math.max(0, i - 1)] + y + r[Math.min(r.length - 1, i + 1)]) / 3]);
  const sc = isolationForest(X), k = Math.max(1, Math.round(share * sc.length)), cut = [...sc].sort((a, b) => b - a)[k - 1];
  return { score: sc, flags: sc.map((s) => s >= cut) };
}

/* ---------- Anomalía conjunta de varias variables (distancia de Mahalanobis) ---------- */
function inv(M) {
  const n = M.length, A = M.map((r, i) => [...r.map((v, j) => v + (i === j ? 1e-6 : 0)), ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; const d = A[c][c] || 1e-12; for (let j = 0; j < 2 * n; j++) A[c][j] /= d; for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; } }
  return A.map((r) => r.slice(n));
}
export function joint(series, detrend = true) { // series: [{ k, pts }]
  const key = (p) => p.year * 12 + p.month, zs = series.map((s) => { const c = contextual(s.pts, { detrend }); const m = new Map(); s.pts.forEach((p, i) => m.set(key(p), c.z[i])); return m; });
  const keys = [...zs[0].keys()].filter((q) => zs.every((m) => m.has(q))).sort((a, b) => a - b), p = series.length;
  const Z = keys.map((q) => zs.map((m) => m.get(q))), mu = Array.from({ length: p }, (_, j) => mean(Z.map((r) => r[j])));
  const S = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => Z.reduce((s, r) => s + (r[a] - mu[a]) * (r[b] - mu[b]), 0) / Math.max(1, Z.length - 1))), Si = inv(S);
  const rows = Z.map((r, i) => { const c = r.map((v, j) => v - mu[j]), w = Si.map((row) => row.reduce((s, v, j) => s + v * c[j], 0)), contrib = c.map((v, j) => v * w[j]), d2 = Math.max(0, contrib.reduce((s, v) => s + v, 0));
    const wh = (Math.cbrt(d2 / p) - (1 - 2 / (9 * p))) / Math.sqrt(2 / (9 * p)); return { year: Math.floor(keys[i] / 12), month: keys[i] % 12, x: keys[i] / 12, d2, p: 1 - phi(wh), z: r, contrib }; });
  return { rows, keys: series.map((s) => s.k) };
}

/* ---------- Pronóstico: tendencia + estación + AR(1), con bandas por simulación ---------- */
function fit(pts) {
  const B = baseline(pts, true), r = B.res, n = r.length; let num = 0, den = 0; for (let i = 1; i < n; i++) { num += r[i] * r[i - 1]; den += r[i - 1] ** 2; }
  const ar = Math.max(-0.95, Math.min(0.95, den ? num / den : 0)), innov = r.slice(1).map((y, i) => y - ar * r[i]);
  return { ...B, ar, innov, last: pts[n - 1], rl: r[n - 1], a: mean(B.v) };
}
export function simulate(pts, { years = 10, B = 400, mult = 1, seed = 11 } = {}) {
  const f = fit(pts), r = rng(seed), off = 11 - f.last.month, h = years * 12 + off, paths = []; // off: meses hasta completar el año en curso
  for (let b = 0; b < B; b++) {
    const slope = (f.b + gauss(r) * (f.se || 0)) * mult; let e = f.rl; const out = new Array(h);
    for (let t = 1; t <= h; t++) { const k = f.last.year * 12 + f.last.month + t, m = k % 12, x = k / 12; e = f.ar * e + f.innov[Math.floor(r() * f.innov.length)];
      out[t - 1] = f.S[m] + f.b * (f.last.x - f.x0) + slope * (x - f.last.x) + e; }
    paths.push(out);
  }
  const ann = Array.from({ length: years }, (_, i) => { const a = off + i * 12, vals = paths.map((p) => { let s = 0; for (let t = a; t < a + 12; t++) s += p[t]; return s / 12; }).sort((x, z) => x - z); return { year: f.last.year + 1 + i, q05: quant(vals, 0.05), q25: quant(vals, 0.25), q50: quant(vals, 0.5), q75: quant(vals, 0.75), q95: quant(vals, 0.95) }; });
  const mon = Array.from({ length: h }, (_, t) => { const vals = paths.map((p) => p[t]).sort((x, z) => x - z), k = f.last.year * 12 + f.last.month + t + 1; return { x: k / 12, year: Math.floor(k / 12), month: k % 12, q05: quant(vals, 0.05), q50: quant(vals, 0.5), q95: quant(vals, 0.95) }; });
  return { ann, mon, ar: f.ar, slope: f.b };
}
/* Validación retrospectiva: ¿qué tan bien habría funcionado el pronóstico en los últimos años? */
export function backtest(pts, hold = 5) {
  const cut = pts.length - hold * 12; if (cut < 180) return null;
  const tr = pts.slice(0, cut), te = pts.slice(cut), sim = simulate(tr, { years: hold, B: 300, seed: 5 }), B = baseline(tr, false);
  let inside = 0, mae = 0, naive = 0, n = 0;
  te.forEach((p, i) => { const q = sim.mon[i]; if (!q) return; n++; if (p.v >= q.q05 && p.v <= q.q95) inside++; mae += Math.abs(p.v - q.q50); naive += Math.abs(p.v - B.S[p.month]); });
  if (!n) return null;
  return { n, hold, coverage: inside / n, mae: mae / n, naive: naive / n, skill: 1 - (mae / n) / ((naive / n) || 1e-9) };
}

/* ---------- Señales de alerta temprana (enlentecimiento crítico): varianza y autocorrelación móviles ---------- */
function rolling(r, w, step) {
  const va = [], ac = [], at = [];
  for (let e = w; e <= r.length; e += step) { const s = r.slice(e - w, e), m = mean(s); let v = 0, c = 0; for (let i = 0; i < w; i++) { v += (s[i] - m) ** 2; if (i) c += (s[i] - m) * (s[i - 1] - m); } va.push(v / (w - 1)); ac.push(v ? c / v : 0); at.push(e - 1); }
  return { va, ac, at };
}
const tau = (y) => { const n = y.length; return n > 2 ? mannKendall(y).S / (n * (n - 1) / 2) : 0; };
export function earlyWarning(pts, { frac = 0.5, surr = 200, seed = 3 } = {}) {
  const B = baseline(pts, true), r = B.res, n = r.length, w = Math.max(60, Math.floor(n * frac)); if (n < 180 || w >= n - 12) return null;
  const step = Math.max(1, Math.floor((n - w) / 90)), R = rolling(r, w, step), tV = tau(R.va), tA = tau(R.ac);
  let num = 0, den = 0; for (let i = 1; i < n; i++) { num += r[i] * r[i - 1]; den += r[i - 1] ** 2; } const a = Math.max(-0.95, Math.min(0.95, den ? num / den : 0)), sE = sdev(r) * Math.sqrt(1 - a * a), g = rng(seed);
  let gV = 0, gA = 0;
  for (let b = 0; b < surr; b++) { const s = new Array(n); s[0] = gauss(g) * sdev(r); for (let i = 1; i < n; i++) s[i] = a * s[i - 1] + gauss(g) * sE; const Q = rolling(s, w, step); if (tau(Q.va) >= tV) gV++; if (tau(Q.ac) >= tA) gA++; }
  return { x: R.at.map((i) => pts[i].x), va: R.va, ac: R.ac, tauVar: tV, tauAc: tA, pVar: (gV + 1) / (surr + 1), pAc: (gA + 1) / (surr + 1), win: w, ar: a };
}

/* ---------- Calidad: meses faltantes y relleno marcado como reconstruido ---------- */
export function fillGaps(pts) {
  if (pts.length < 24) return { pts, missing: 0 };
  const key = (p) => p.year * 12 + p.month, have = new Map(pts.map((p) => [key(p), p])), k0 = key(pts[0]), k1 = key(pts[pts.length - 1]);
  if (have.size === k1 - k0 + 1) return { pts, missing: 0 };
  const B = baseline(pts, true), resAt = new Map(pts.map((p, i) => [key(p), B.res[i]])), ks = [...have.keys()].sort((a, b) => a - b), out = []; let miss = 0;
  for (let k = k0; k <= k1; k++) {
    if (have.has(k)) { out.push(have.get(k)); continue; }
    const lo = ks.filter((q) => q < k).pop(), hi = ks.find((q) => q > k), f = (k - lo) / (hi - lo), r = resAt.get(lo) * (1 - f) + resAt.get(hi) * f, x = k / 12;
    out.push({ year: Math.floor(k / 12), month: k % 12, x, v: B.S[k % 12] + B.b * (x - B.x0) + r, rec: true }); miss++;
  }
  return { pts: out, missing: miss };
}

/* ---------- Balance climático de un lago: lluvia menos evaporación ---------- */
export function waterBalance(P, E) { // series mensuales en mm/día -> mm/mes
  const key = (p) => p.year * 12 + p.month, e = new Map(E.map((p) => [key(p), p.v]));
  return P.filter((p) => e.has(key(p))).map((p) => { const days = new Date(Date.UTC(p.year, p.month + 1, 0)).getUTCDate(); return { year: p.year, month: p.month, x: p.x, v: (p.v - e.get(key(p))) * days, p: p.v * days, e: e.get(key(p)) * days }; });
}
export function annualSums(wb) { const m = new Map(); wb.forEach((d) => { const a = m.get(d.year) || { year: d.year, p: 0, e: 0, n: 0 }; a.p += d.p; a.e += d.e; a.n++; m.set(d.year, a); }); return [...m.values()].filter((a) => a.n === 12).map((a) => ({ ...a, wb: a.p - a.e })); }
/* Escenario condicional: cambia la lluvia (dP, fracción) y la temperatura (dT, °C); la evaporación sube alpha por cada °C. */
export function scenario(ann, { dP = 0, dT = 0, alpha = 0.04, base = 10 } = {}) {
  const hist = ann.map((a) => a.wb).sort((x, y) => x - y), p10 = quant(hist, 0.1), recent = ann.slice(-base), sim = recent.map((a) => a.p * (1 + dP) - a.e * (1 + alpha * dT));
  const all = ann.map((a) => a.p * (1 + dP) - a.e * (1 + alpha * dT)), now = mean(recent.map((a) => a.wb)), val = mean(sim), s = sdev(sim) / Math.sqrt(sim.length);
  return { now, val, lo: val - 1.645 * s, hi: val + 1.645 * s, delta: val - now, dry: all.filter((v) => v < p10).length / all.length, p10 };
}
export const SCENARIOS = [['fav', 'Favorable', 'Favorable', { dT: 0.5, dP: 0.1 }, '#0c5a43'], ['mid', 'Intermedio', 'Intermediate', { dT: 1.5, dP: 0 }, '#d97706'], ['crit', 'Crítico', 'Critical', { dT: 2.5, dP: -0.15 }, '#b91c1c']];
