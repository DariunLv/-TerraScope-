import { useState } from 'react';
import { motion } from 'framer-motion';
import { useT } from '../i18n';
const W = 720, H = 330, P = { l: 52, r: 14, t: 14, b: 30 };
export default function Chart({ r, unit, dec }) {
  const { t } = useT();
  const [hv, setHv] = useState(null);
  const x0 = r.x[0], x1 = r.x[r.n - 1];
  let lo = Infinity, hi = -Infinity;
  r.y.forEach((v) => { if (v < lo) lo = v; if (v > hi) hi = v; });
  const pad = (hi - lo) * 0.08 || 1; lo -= pad; hi += pad;
  const sx = (x) => P.l + ((x - x0) / (x1 - x0)) * (W - P.l - P.r);
  const sy = (v) => H - P.b - ((v - lo) / (hi - lo)) * (H - P.t - P.b);
  const line = (arr) => arr.map((v, i) => (v == null ? null : `${sx(r.x[i]).toFixed(1)},${sy(v).toFixed(1)}`)).filter(Boolean);
  const raw = 'M' + line(r.y).join('L');
  const roll = 'M' + line(r.roll).join('L');
  const tr = (x) => r.sen.slope * x + r.sen.intercept;
  const yt = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4);
  const step = r.span > 30 ? 10 : 5;
  const xt = []; for (let y = Math.ceil(x0 / step) * step; y <= x1; y += step) xt.push(y);
  const move = (e) => {
    const b = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - b.left) / b.width) * W;
    const x = x0 + ((px - P.l) / (W - P.l - P.r)) * (x1 - x0);
    let k = Math.round(((x - x0) / (x1 - x0)) * (r.n - 1)); k = Math.max(0, Math.min(r.n - 1, k)); setHv(k);
  };
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} onPointerMove={move} onPointerLeave={() => setHv(null)} role="img" aria-label={t.chartTitle}>
      <defs><linearGradient id="gl" x1="0" x2="1"><stop offset="0" stopColor="#0c5a43" /><stop offset="1" stopColor="#1e3a8a" /></linearGradient></defs>
      {yt.map((v, i) => <g key={i}><line x1={P.l} x2={W - P.r} y1={sy(v)} y2={sy(v)} stroke="var(--line)" strokeOpacity=".5" /><text x={P.l - 6} y={sy(v) + 4} textAnchor="end" fontSize="15" fill="var(--muted)">{v.toFixed(dec)}</text></g>)}
      {xt.map((x) => <text key={x} x={sx(x)} y={H - 8} textAnchor="middle" fontSize="15" fill="var(--muted)">{x}</text>)}
      <path d={raw} fill="none" stroke="#9fb8d8" strokeWidth="1" />
      <motion.path d={roll} fill="none" stroke="url(#gl)" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: 'easeInOut' }} key={roll.length + r.slope} />
      <line x1={sx(x0)} y1={sy(tr(x0))} x2={sx(x1)} y2={sy(tr(x1))} stroke="#c2410c" strokeWidth="2.5" strokeDasharray="7 6" />
      {r.pettitt?.sig && (() => { const px = sx(r.pettitt.year); return <g><line x1={px} x2={px} y1={P.t} y2={H - P.b} stroke="#f0506e" strokeDasharray="3 4" /><text x={px + 4} y={P.t + 12} fontSize="15" fill="#f0506e">{r.pettitt.year}</text></g>; })()}
      {hv != null && <g><line x1={sx(r.x[hv])} x2={sx(r.x[hv])} y1={P.t} y2={H - P.b} stroke="#0c5a43" strokeOpacity=".4" /><circle cx={sx(r.x[hv])} cy={sy(r.y[hv])} r="5" fill="#0c5a43" />
        <g transform={`translate(${Math.min(sx(r.x[hv]) + 8, W - 150)},${P.t + 4})`}><rect width="142" height="40" rx="10" fill="var(--card)" stroke="var(--line)" /><text x="8" y="16" fontSize="15" fill="var(--ink)" fontWeight="700">{r.pts[hv].year}-{String(r.pts[hv].month + 1).padStart(2, '0')}</text><text x="8" y="32" fontSize="15" fill="var(--muted)">{r.y[hv].toFixed(dec)} {unit}</text></g></g>}
    </svg>
  );
}
