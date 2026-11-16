import { alignMonthly } from '../data/monthly.js';
export const isTemp = (k) => /^T/.test(k);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
export function scale(k) {
  const neg = hex(isTemp(k) ? '#2f6db5' : '#b8741a'), mid = hex('#f6f3ee'), pos = hex(isTemp(k) ? '#c42a3a' : '#0b8f7a');
  return (v, m) => { const t = Math.max(-1, Math.min(1, v / (m || 1))); const c = t < 0 ? mix(mid, neg, -t) : mix(mid, pos, t); return `rgb(${c[0]},${c[1]},${c[2]})`; };
}
export function pearson(a, b) {
  const n = Math.min(a.length, b.length); let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return sab / Math.sqrt(saa * sbb || 1);
}
export function alignedPair(a, b) {
  const joined = alignMonthly([a.raw, b.raw], { common: true });
  const maps = [a, b].map((series) => new Map(series.raw.map((point, index) => [point.year * 12 + point.month, series.r.y[index]])));
  return { keys: joined.keys, a: joined.keys.map((key) => maps[0].get(key)), b: joined.keys.map((key) => maps[1].get(key)), n: joined.n };
}
export function monthlyCorrelation(a, b) {
  const pair = alignedPair(a, b);
  return { n: pair.n, r: pair.n >= 3 ? pearson(pair.a, pair.b) : NaN };
}
export const q95 = (arr) => { const s = arr.map(Math.abs).sort((a, b) => a - b); return s[Math.floor(s.length * 0.95)] || 1; };
