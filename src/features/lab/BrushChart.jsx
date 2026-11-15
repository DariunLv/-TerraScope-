import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import { ols, mannKendall } from '../../lib/analysis/stats';
import { useT } from '../../core/i18n';
import { useWidth } from '../../shared/charts/hooks';
/* Serie con foco + contexto (D3): arrastra en la franja inferior para elegir un periodo y recalcular la tendencia al instante. */
export default function BrushChart({ r, unit, dec }) {
  const { lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b);
  const [ref, w] = useWidth(); const H = 320, H2 = 54, m = { l: 50, r: 14, t: 12, b: 24 };
  const [dom, setDom] = useState(null); const [hv, setHv] = useState(null); const ctx = useRef(null);
  const full = [r.x[0], r.x[r.n - 1]], d = dom || full;
  const idx = useMemo(() => { const a = []; for (let i = 0; i < r.n; i++) if (r.x[i] >= d[0] && r.x[i] <= d[1]) a.push(i); return a; }, [r, d[0], d[1]]);
  const sel = useMemo(() => { if (idx.length < 24) return null; const xs = idx.map((i) => r.x[i]), ys = idx.map((i) => r.y[i]), o = ols(xs, ys), mk = mannKendall(ys); return { o, p: mk.p, xs }; }, [idx, r]);
  const sx = d3.scaleLinear().domain(d).range([m.l, w - m.r]);
  const ext = d3.extent(idx.length ? idx.map((i) => r.y[i]) : r.y), pad = (ext[1] - ext[0]) * 0.08 || 1;
  const sy = d3.scaleLinear().domain([ext[0] - pad, ext[1] + pad]).range([H - m.b, m.t]);
  const line = d3.line().defined((i) => r.y[i] != null).x((i) => sx(r.x[i])).y((i) => sy(r.y[i]));
  const rollL = d3.line().defined((i) => r.roll[i] != null).x((i) => sx(r.x[i])).y((i) => sy(r.roll[i])).curve(d3.curveMonotoneX);
  const cx = d3.scaleLinear().domain(full).range([m.l, w - m.r]), cyE = d3.extent(r.roll.filter((v) => v != null)), cy = d3.scaleLinear().domain(cyE).range([H2 - 6, 6]);
  const all = d3.range(r.n), cl = d3.line().defined((i) => r.roll[i] != null).x((i) => cx(r.x[i])).y((i) => cy(r.roll[i]));
  useEffect(() => {
    const b = d3.brushX().extent([[m.l, 0], [w - m.r, H2]]).on('brush end', (e) => { if (!e.sourceEvent) return; if (!e.selection) { setDom(null); return; } const [a, c] = e.selection.map(cx.invert); if (c - a >= 3) setDom([a, c]); });
    const g = d3.select(ctx.current); g.call(b); g.select('.selection').attr('fill', '#0c5a43').attr('fill-opacity', 0.18).attr('stroke', '#0c5a43');
    if (!dom) g.call(b.move, null);
  }, [w, r]);
  useEffect(() => { setDom(null); }, [r]);
  const move = (e) => { const [px] = d3.pointer(e); const x = sx.invert(px); let best = idx[0], bd = 1e9; idx.forEach((i) => { const q = Math.abs(r.x[i] - x); if (q < bd) { bd = q; best = i; } }); setHv(best); };
  const up = sel && sel.o.slope >= 0, sig = sel && sel.p < 0.05;
  return (
    <div ref={ref}>
      <div className="brushinfo">
        <span>{L('Periodo', 'Period')}: <b>{Math.floor(d[0])}–{Math.floor(d[1])}</b></span>
        {sel ? <><span>{L('Tendencia', 'Trend')}: <b style={{ color: up ? '#c2410c' : '#1e40af' }}>{up ? '+' : ''}{(sel.o.slope * 10).toFixed(dec)} {unit} / {L('década', 'decade')}</b></span><span className={'sigpill ' + (sig ? 'yes' : 'no')}>{sig ? L('Significativa', 'Significant') : L('No significativa', 'Not significant')} · p = {sel.p < 0.001 ? '< 0.001' : sel.p.toFixed(3)}</span></> : <span>{L('Elige al menos 2 años', 'Pick at least 2 years')}</span>}
        {dom && <button className="textlink" onClick={() => { setDom(null); d3.select(ctx.current).call(d3.brushX().move, null); }}>{L('Ver todo', 'Show all')}</button>}
      </div>
      <svg width={w} height={H} onPointerMove={move} onPointerLeave={() => setHv(null)} style={{ display: 'block', touchAction: 'pan-y' }}>
        <defs><clipPath id="bc"><rect x={m.l} y={0} width={Math.max(0, w - m.l - m.r)} height={H} /></clipPath><linearGradient id="bg1" x1="0" x2="1"><stop offset="0" stopColor="#0c5a43" /><stop offset="1" stopColor="#1e3a8a" /></linearGradient></defs>
        {sy.ticks(5).map((t) => <g key={t}><line x1={m.l} x2={w - m.r} y1={sy(t)} y2={sy(t)} stroke="var(--line)" /><text x={m.l - 6} y={sy(t) + 4} textAnchor="end" fontSize="12" fill="var(--muted)">{t.toFixed(dec)}</text></g>)}
        {sx.ticks(Math.min(8, Math.max(3, Math.floor(w / 90)))).map((t) => <text key={t} x={sx(t)} y={H - 6} textAnchor="middle" fontSize="12" fill="var(--muted)">{Number.isInteger(t) ? t : t.toFixed(1)}</text>)}
        <g clipPath="url(#bc)">
          <path d={line(idx)} fill="none" stroke="#9fb8d8" strokeWidth="1.1" />
          <motion.path key={d[0] + '-' + d[1] + r.slope} d={rollL(idx)} fill="none" stroke="url(#bg1)" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9 }} />
          {sel && <line x1={sx(sel.xs[0])} y1={sy(sel.o.intercept + sel.o.slope * sel.xs[0])} x2={sx(sel.xs[sel.xs.length - 1])} y2={sy(sel.o.intercept + sel.o.slope * sel.xs[sel.xs.length - 1])} stroke="#c2410c" strokeWidth="2.6" strokeDasharray="7 6" />}
          {r.pettitt?.sig && <line x1={sx(r.pettitt.year)} x2={sx(r.pettitt.year)} y1={m.t} y2={H - m.b} stroke="#1e3a8a" strokeDasharray="3 4" />}
          {hv != null && <g><line x1={sx(r.x[hv])} x2={sx(r.x[hv])} y1={m.t} y2={H - m.b} stroke="#0c5a43" strokeOpacity=".4" /><circle cx={sx(r.x[hv])} cy={sy(r.y[hv])} r="5" fill="#0c5a43" /></g>}
        </g>
        {hv != null && <g transform={`translate(${Math.min(sx(r.x[hv]) + 8, w - 150)},${m.t + 2})`}><rect width="142" height="40" rx="10" fill="#fff" stroke="var(--line)" /><text x="8" y="16" fontSize="12" fontWeight="700" fill="var(--ink)">{r.pts[hv].year}-{String(r.pts[hv].month + 1).padStart(2, '0')}</text><text x="8" y="32" fontSize="12" fill="var(--muted)">{r.y[hv].toFixed(dec)} {unit}</text></g>}
      </svg>
      <svg width={w} height={H2} style={{ display: 'block', marginTop: 4 }}>
        <rect x={m.l} y="0" width={Math.max(0, w - m.l - m.r)} height={H2} rx="8" fill="#f1f6fa" />
        <path d={cl(all)} fill="none" stroke="#1e3a8a" strokeWidth="1.4" />
        <g ref={ctx} />
      </svg>
      <p className="mini">{L('Arrastra sobre la franja inferior para elegir un periodo: la tendencia y su significancia se recalculan al instante. Línea gruesa: promedio de 12 meses. Línea naranja: tendencia del periodo.', 'Drag on the lower strip to pick a period: trend and significance update instantly. Thick line: 12-month average. Orange line: trend for the period.')}</p>
    </div>
  );
}
