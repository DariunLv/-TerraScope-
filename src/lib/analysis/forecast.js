/* Pronóstico de series de tiempo mensuales (puro JS, sin dependencias).
   Modelos: repetir el año pasado, tendencia + estación + AR(1), Holt-Winters aditivo y un conjunto de ambos.
   Se comparan con una prueba rodante: se esconden los últimos meses, se proyecta y se mide el error real. */
const mean = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
const sdev = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, a.length - 1)); };

/* y: valores mensuales consecutivos; m0: mes (0-11) del primer dato */
export function naive(y, m0, h) { const n = y.length; return Array.from({ length: h }, (_, i) => y[n - 12 + (i % 12)]); }

function trendFit(y, m0, win = 240) {
  const n = y.length, s0 = Math.max(0, n - win), Y = y.slice(s0), N = Y.length, M = (t) => (m0 + s0 + t) % 12;
  const S = Array(12).fill(0); let a = 0, b = 0;
  for (let it = 0; it < 5; it++) {
    const de = Y.map((v, t) => v - S[M(t)]), tm = (N - 1) / 2, ym = mean(de);
    let sxy = 0, sxx = 0; de.forEach((v, t) => { sxy += (t - tm) * (v - ym); sxx += (t - tm) ** 2; });
    b = sxx ? sxy / sxx : 0; a = ym - b * tm;
    const g = Array.from({ length: 12 }, () => []); Y.forEach((v, t) => g[M(t)].push(v - (a + b * t)));
    g.forEach((q, m) => { S[m] = q.length ? mean(q) : 0; }); const c = mean(S); for (let m = 0; m < 12; m++) S[m] -= c;
  }
  const res = Y.map((v, t) => v - (a + b * t + S[M(t)])), r0 = res.slice(0, -1), r1 = res.slice(1);
  const m0r = mean(r0), m1r = mean(r1); let num = 0, den = 0; r0.forEach((v, i) => { num += (v - m0r) * (r1[i] - m1r); den += (v - m0r) ** 2; });
  const phi = Math.max(-0.2, Math.min(0.95, den ? num / den : 0));
  return { a, b, S, phi, last: res[N - 1], N, s0 };
}
export function trendSeason(y, m0, h) {
  const f = trendFit(y, m0), n = y.length;
  return Array.from({ length: h }, (_, i) => { const t = f.N - 1 + i + 1; return f.a + f.b * t + f.S[(m0 + f.s0 + t) % 12] + f.phi ** (i + 1) * f.last; });
}

function hwRun(y, p, h = 0) {
  const n = y.length, [al, be, ga] = p; const l0 = mean(y.slice(0, 12)), b0 = (mean(y.slice(12, 24)) - l0) / 12;
  const s = y.slice(0, 12).map((v, i) => v - l0 - b0 * (i - 5.5)); let l = l0 + b0 * 5.5, b = b0, sse = 0, cnt = 0;
  for (let t = 12; t < n; t++) { const sm = s[t % 12], pr = l + b + sm; sse += (y[t] - pr) ** 2; cnt++; const ln = al * (y[t] - sm) + (1 - al) * (l + b); b = be * (ln - l) + (1 - be) * b; s[t % 12] = ga * (y[t] - ln) + (1 - ga) * sm; l = ln; }
  const out = Array.from({ length: h }, (_, i) => l + (i + 1) * b + s[(n + i) % 12]);
  return { sse: cnt ? sse / cnt : Infinity, out };
}
export function hwParams(y) {
  let best = [0.2, 0.01, 0.1], bs = Infinity;
  for (const al of [0.05, 0.15, 0.3, 0.5]) for (const be of [0, 0.01, 0.05]) for (const ga of [0.05, 0.2, 0.4]) { const r = hwRun(y, [al, be, ga]); if (r.sse < bs) { bs = r.sse; best = [al, be, ga]; } }
  return best;
}
export function holtWinters(y, m0, h, params) { return hwRun(y, params || hwParams(y), h).out; }

export const MODELS = ['hw', 'trend', 'ens', 'naive'];
export function run(model, y, m0, h, hwp) {
  if (model === 'naive') return naive(y, m0, h);
  if (model === 'trend') return trendSeason(y, m0, h);
  if (model === 'hw') return holtWinters(y, m0, h, hwp);
  const a = holtWinters(y, m0, h, hwp), b = trendSeason(y, m0, h); return a.map((v, i) => (v + b[i]) / 2);
}

/* prueba rodante: origen cada 6 meses durante ~8 años, proyecta 12 meses y guarda los errores */
export function backtest(y, m0, { H = 12, span = 96, step = 6 } = {}) {
  const n = y.length; if (n < 60 + H) return null;
  const first = Math.max(48, n - span - H), out = {}; MODELS.forEach((m) => { out[m] = { errs: Array.from({ length: H }, () => []), abs: [], sq: [] }; });
  for (let o = first; o + H <= n; o += step) {
    const tr = y.slice(0, o), act = y.slice(o, o + H), hwp = tr.length >= 36 ? hwParams(tr) : undefined;
    MODELS.forEach((m) => { const f = run(m, tr, m0, H, hwp); f.forEach((v, i) => { const e = act[i] - v; out[m].errs[i].push(e); out[m].abs.push(Math.abs(e)); out[m].sq.push(e * e); }); });
  }
  const res = {}; MODELS.forEach((m) => { const o = out[m], sdH = o.errs.map((e) => Math.sqrt(mean(e.map((x) => x * x)))), bias = mean(o.errs.flat()); res[m] = { mae: mean(o.abs), rmse: Math.sqrt(mean(o.sq)), bias, sdH }; });
  const best = MODELS.reduce((a, b) => (res[a].mae <= res[b].mae ? a : b));
  MODELS.forEach((m) => { res[m].skill = res.naive.mae > 0 ? 1 - res[m].mae / res.naive.mae : res[m].mae === 0 ? 0 : -1; });
  return { res, best, folds: Math.floor((n - H - first) / step) + 1 };
}

/* incertidumbre: error típico por horizonte (suavizado) y, más allá de 12 meses, crece despacio */
export function spread(sdH, h) {
  const sm = sdH.map((_, i) => mean(sdH.slice(Math.max(0, i - 1), i + 2))), last = sm[sm.length - 1];
  return Array.from({ length: h }, (_, i) => (i < sm.length ? sm[i] : last * Math.sqrt(1 + (i - sm.length + 1) / 24)));
}
export const climatology = (y, m0) => { const g = Array.from({ length: 12 }, () => []); y.forEach((v, t) => g[(m0 + t) % 12].push(v)); return g.map(mean); };
export function yearComparison(observed, forecast) {
  const previous = observed.slice(-12), next = forecast.slice(0, 12);
  const previousMean = mean(previous), nextMean = mean(next);
  return { previousMean, nextMean, delta: nextMean - previousMean, observedMonths: previous.length, forecastMonths: next.length };
}
export { mean, sdev };
