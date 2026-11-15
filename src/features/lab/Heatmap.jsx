import { useMemo } from 'react';
import { deseason } from '../../lib/analysis/stats';
import { scale, q95 } from '../../lib/analysis/viz';
export default function Heatmap({ pts, k, unit, dec }) {
  const { cells, years, m } = useMemo(() => {
    const a = deseason(pts), ys = [...new Set(pts.map((p) => p.year))];
    return { cells: pts.map((p, i) => ({ y: ys.indexOf(p.year), m: p.month, v: a[i], year: p.year })), years: ys, m: q95(a) };
  }, [pts]);
  const col = scale(k), cw = 26, ch = 9, L = 34;
  return (
    <svg viewBox={`0 0 ${L + 12 * cw} ${years.length * ch + 18}`} style={{ width: '100%', maxWidth: 560, display: 'block' }} role="img">
      {['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((l, i) => <text key={i} x={L + i * cw + cw / 2} y="10" fontSize="9" textAnchor="middle" fill="var(--muted)">{l}</text>)}
      {years.map((yr, i) => (yr % 5 === 0 ? <text key={yr} x={L - 4} y={18 + i * ch + 7} fontSize="8" textAnchor="end" fill="var(--muted)">{yr}</text> : null))}
      {cells.map((c, i) => <rect key={i} x={L + c.m * cw + 0.5} y={18 + c.y * ch} width={cw - 1} height={ch - 0.6} rx="1.5" fill={col(c.v, m)}><title>{c.year}-{c.m + 1}: {c.v > 0 ? '+' : ''}{c.v.toFixed(dec)} {unit}</title></rect>)}
    </svg>
  );
}
