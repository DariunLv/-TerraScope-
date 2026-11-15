/* Análisis estadístico avanzado (sin dependencias). */
import { mean, senSlope, mannKendall, ols, pT, pZ, deseason } from './stats';
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };
export function quantile(sorted, q) { const p = (sorted.length - 1) * q, i = Math.floor(p), f = p - i; return sorted[i + 1] !== undefined ? sorted[i] * (1 - f) + sorted[i + 1] * f : sorted[i]; }
export function describe(v) {
  const n = v.length, m = mean(v), s = sd(v), srt = [...v].sort((a, b) => a - b);
  let m3 = 0, m4 = 0; v.forEach((x) => { const z = (x - m) / s; m3 += z ** 3; m4 += z ** 4; });
  const skew = m3 / n, kurt = m4 / n - 3, jb = (n / 6) * (skew ** 2 + (kurt ** 2) / 4);
  return { n, mean: m, sd: s, min: srt[0], q1: quantile(srt, 0.25), median: quantile(srt, 0.5), q3: quantile(srt, 0.75), max: srt[n - 1], skew, kurt, jb, pJB: Math.exp(-jb / 2), cv: m !== 0 ? s / Math.abs(m) : NaN };
}
export function acf(y, maxLag = 24) {
  const n = y.length, m = mean(y); let den = 0; for (let i = 0; i < n; i++) den += (y[i] - m) ** 2;
  const out = [];
  for (let k = 1; k <= maxLag; k++) { let num = 0; for (let i = 0; i < n - k; i++) num += (y[i] - m) * (y[i + k] - m); out.push(num / den); }
  return { vals: out, ci: 1.959964 / Math.sqrt(n) };
}
/* Descomposición clásica: tendencia (media móvil centrada 12), estacional (media por mes) y residuo */
export function decompose(pts) {
  const v = pts.map((p) => p.v), n = v.length, tr = new Array(n).fill(null);
  for (let i = 6; i < n - 6; i++) { let s = 0.5 * v[i - 6] + 0.5 * v[i + 6]; for (let j = i - 5; j <= i + 5; j++) s += v[j]; tr[i] = s / 12; }
  const sum = new Array(12).fill(0), cnt = new Array(12).fill(0);
  for (let i = 0; i < n; i++) if (tr[i] != null) { sum[pts[i].month] += v[i] - tr[i]; cnt[pts[i].month]++; }
  const sm = sum.map((s, i) => s / (cnt[i] || 1)), mm = mean(sm), seas = pts.map((p) => sm[p.month] - mm);
  const res = v.map((x, i) => (tr[i] == null ? null : x - tr[i] - seas[i]));
  const rv = res.filter((x) => x != null), strength = Math.max(0, 1 - (sd(rv) ** 2) / (sd(v.map((x, i) => (tr[i] == null ? null : x - tr[i])).filter((x) => x != null)) ** 2));
  return { trend: tr, seasonal: seas, residual: res, seasonalStrength: strength, monthly: sm.map((x) => x + mm) };
}
export function byMonth(pts) { const g = Array.from({ length: 12 }, () => []); pts.forEach((p) => g[p.month].push(p.v)); return g; }
/* Pendiente de Sen móvil en ventanas de w años (sobre medias anuales) */
export function rollingSen(years, y, w = 15) {
  const out = [];
  for (let i = 0; i + w <= years.length; i++) { const xs = years.slice(i, i + w), ys = y.slice(i, i + w), s = senSlope(xs, ys, mannKendall(ys).varS); out.push({ year: xs[Math.floor(w / 2)], slope: s.slope * 10, lo: s.ci[0] * 10, hi: s.ci[1] * 10 }); }
  return out;
}
/* Bootstrap en bloques (b=3) de la pendiente de Sen anual */
export function bootstrapSen(years, y, B = 600, block = 3) {
  const n = y.length, res = [], base = senSlope(years, y, 1).intercept;
  const fit = senSlope(years, y, mannKendall(y).varS), e = y.map((v, i) => v - (fit.intercept + fit.slope * years[i]));
  let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let b = 0; b < B; b++) {
    const ne = []; while (ne.length < n) { const s = Math.floor(rnd() * (n - block + 1)); for (let k = 0; k < block && ne.length < n; k++) ne.push(e[s + k]); }
    const yy = ne.map((r, i) => fit.intercept + fit.slope * years[i] + r); const xs = years;
    const sl = []; for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) sl.push((yy[j] - yy[i]) / (xs[j] - xs[i]));
    sl.sort((a, c) => a - c); res.push(sl[Math.floor(sl.length / 2)] * 10);
  }
  res.sort((a, b) => a - b); return { vals: res, lo: res[Math.floor(B * 0.025)], hi: res[Math.floor(B * 0.975)], est: fit.slope * 10 };
}
/* Welch t entre dos periodos + d de Cohen */
export function welch(a, b) {
  const ma = mean(a), mb = mean(b), va = sd(a) ** 2, vb = sd(b) ** 2, na = a.length, nb = b.length, se = Math.sqrt(va / na + vb / nb), t = (mb - ma) / se;
  const df = (va / na + vb / nb) ** 2 / ((va / na) ** 2 / (na - 1) + (vb / nb) ** 2 / (nb - 1));
  const sp = Math.sqrt(((na - 1) * va + (nb - 1) * vb) / (na + nb - 2));
  return { ma, mb, diff: mb - ma, t, df, p: pT(t, df), d: (mb - ma) / sp };
}
/* Mann-Whitney U (aprox. normal con corrección de empates) */
export function mannWhitney(a, b) {
  const all = [...a.map((v) => [v, 0]), ...b.map((v) => [v, 1])].sort((x, y) => x[0] - y[0]); const r = new Array(all.length);
  for (let i = 0; i < all.length;) { let j = i; while (j + 1 < all.length && all[j + 1][0] === all[i][0]) j++; const rk = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[k] = rk; i = j + 1; }
  let R1 = 0; all.forEach((x, i) => { if (x[1] === 0) R1 += r[i]; });
  const n1 = a.length, n2 = b.length, U = R1 - (n1 * (n1 + 1)) / 2, mu = (n1 * n2) / 2, s = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12), z = (U - mu) / s;
  return { U, z, p: pZ(z), cles: 1 - U / (n1 * n2) };
}
export function extremes(pts, thr = 2) {
  const a = deseason(pts), s = sd(a), byDec = {};
  a.forEach((v, i) => { const d = Math.floor(pts[i].year / 10) * 10; byDec[d] = byDec[d] || { hot: 0, cold: 0 }; if (v / s > thr) byDec[d].hot++; else if (v / s < -thr) byDec[d].cold++; });
  return { s, byDec, list: a.map((v, i) => ({ z: v / s, p: pts[i] })).filter((x) => Math.abs(x.z) > thr).sort((x, y) => Math.abs(y.z) - Math.abs(x.z)).slice(0, 8) };
}
/* Mann-Kendall estacional (Hirsch et al., 1982): suma S y varianza por mes */
export function seasonalMK(pts) {
  let S = 0, vs = 0;
  for (let m = 0; m < 12; m++) { const y = pts.filter((p) => p.month === m).map((p) => p.v); if (y.length < 4) continue; const r = mannKendall(y); S += r.S; vs += r.varS; }
  const Z = S > 0 ? (S - 1) / Math.sqrt(vs) : S < 0 ? (S + 1) / Math.sqrt(vs) : 0;
  return { S, Z, p: pZ(Z) };
}
/* Benjamini-Hochberg: controla la tasa de falsos descubrimientos (Wilks, 2016) */
export function bh(pv, q = 0.05) {
  const idx = pv.map((p, i) => [p, i]).filter((x) => !isNaN(x[0])).sort((a, b) => a[0] - b[0]), m = idx.length; let k = -1;
  idx.forEach(([p], i) => { if (p <= ((i + 1) / m) * q) k = i; });
  const out = pv.map(() => false); for (let i = 0; i <= k; i++) out[idx[i][1]] = true; return out;
}
/* Tendencia para todos los periodos posibles (Liebmann et al., 2010) */
export function sensitivity(years, y, minLen = 10) {
  const out = [];
  for (let i = 0; i < years.length; i++) for (let j = i + minLen - 1; j < years.length; j++) { const o = ols(years.slice(i, j + 1), y.slice(i, j + 1)); out.push([years[i], years[j], o.slope * 10, o.p < 0.05]); }
  return out;
}
/* Años necesarios para detectar la tendencia (Weatherhead et al., 1998) */
export function yearsToDetect(x, y) {
  const o = ols(x, y), res = y.map((v, i) => v - (o.intercept + o.slope * x[i])), s = sd(res), m = mean(res);
  let num = 0, den = 0; for (let i = 0; i < res.length; i++) { den += (res[i] - m) ** 2; if (i) num += (res[i] - m) * (res[i - 1] - m); }
  const phi = Math.max(-0.95, Math.min(0.95, num / den)), w = Math.abs(o.slope);
  return { n: w > 0 ? Math.pow((3.3 * s / w) * Math.sqrt((1 + phi) / (1 - phi)), 2 / 3) : Infinity, phi, sigma: s, have: x[x.length - 1] - x[0] };
}
/* Validación contra estación: sesgo, RMSE, correlación */
export function validate(a, b) {
  const mb = new Map(b.map((p) => [p.year * 12 + p.month, p.v])), A = [], B = [], X = [];
  a.forEach((p) => { const v = mb.get(p.year * 12 + p.month); if (v != null) { A.push(p.v); B.push(v); X.push(p.x); } });
  const n = A.length; if (n < 12) return null;
  const ma = mean(A), mbb = mean(B); let sab = 0, saa = 0, sbb = 0, se = 0;
  for (let i = 0; i < n; i++) { sab += (A[i] - ma) * (B[i] - mbb); saa += (A[i] - ma) ** 2; sbb += (B[i] - mbb) ** 2; se += (A[i] - B[i]) ** 2; }
  return { n, bias: ma - mbb, rmse: Math.sqrt(se / n), r: sab / Math.sqrt(saa * sbb || 1), slopeA: ols(X, A).slope * 10, slopeB: ols(X, B).slope * 10, A, B, X };
}
export { sd, ols };
