/* Transición “pintura derretida”: la sección oscura gotea hacia la clara. Las gotas se estiran y se encogen despacio. */
import { useId } from 'react';
const DR = [[3, 70, 0], [9, 110, 1.4], [15, 52, 2.2], [22, 128, 0.7], [29, 66, 3.1], [36, 98, 1.9], [43, 142, 0.3], [50, 60, 2.6], [57, 104, 1.1], [64, 82, 3.4], [71, 132, 0.9], [78, 58, 2.0], [85, 112, 1.6], [92, 74, 2.9], [97, 96, 0.5]];
export default function Drip({ stops = [['0', '#03060f'], ['1', '#03060f']], height = 170, className = '' }) {
  const id = useId().replace(/:/g, '');
  const W = 1440, base = 34;
  let d = `M0 0 H${W} V${base}`;
  const xs = DR.map(([p]) => (p / 100) * W);
  // borde ondulado con gotas: de derecha a izquierda
  for (let i = DR.length - 1; i >= 0; i--) {
    const x = xs[i], len = DR[i][1], w = 15 + (DR[i][1] % 13);
    d += ` L${x + w + 26} ${base} C${x + w + 4} ${base + 4} ${x + w} ${base + 20} ${x + w * 0.62} ${base + len * 0.55} C${x + w * 0.5} ${base + len} ${x - w * 0.5} ${base + len} ${x - w * 0.62} ${base + len * 0.55} C${x - w} ${base + 20} ${x - w - 4} ${base + 4} ${x - w - 26} ${base}`;
  }
  d += ` L0 ${base} Z`;
  return (
    <svg className={'drip ' + className} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" aria-hidden="true" style={{ height }}>
      <defs>
        <linearGradient id={'g' + id} x1="0" x2="1" y1="0" y2="0">{stops.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}</linearGradient>
        <linearGradient id={'h' + id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#fff" stopOpacity=".22" /></linearGradient>
      </defs>
      <path d={d} fill={`url(#g${id})`} className="drip-body" />
      {DR.map(([p, len, dl], i) => { const x = (p / 100) * W, w = 15 + (len % 13); return <ellipse key={i} className="drip-shine" cx={x - w * 0.28} cy={base + len * 0.55} rx={w * 0.16} ry={len * 0.28} fill={`url(#h${id})`} style={{ animationDelay: `${dl}s` }} />; })}
    </svg>
  );
}
