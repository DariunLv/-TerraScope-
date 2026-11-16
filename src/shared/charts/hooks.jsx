import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import * as Plot from '@observablehq/plot';
import AutoExplain, { echartsFacts } from './AutoExplain';
export function useWidth() {
  const ref = useRef(null); const [w, setW] = useState(640);
  useEffect(() => { const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width)))); if (ref.current) ro.observe(ref.current); return () => ro.disconnect(); }, []);
  return [ref, w];
}
export function PlotView({ build, deps, h = 260, explain = true, explanation }) {
  const [ref, w] = useWidth(); const [facts, setFacts] = useState('');
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const p = build(Plot, w); el.replaceChildren(p);
    try { const tx = [...p.querySelectorAll('text')].map((t) => t.textContent.trim()).filter((t) => t && !/^[-−\d.,%\s]+$/.test(t)).slice(0, 18).join(' | '); const nums = [...p.querySelectorAll('text')].map((t) => parseFloat(t.textContent.replace(/[−]/g, '-').replace(/,/g, ''))).filter((n) => isFinite(n)); setFacts(`chart labels: ${tx}\naxis values range ${nums.length ? Math.min(...nums) + ' to ' + Math.max(...nums) : 'n/a'}; ${p.querySelectorAll('circle,rect,path').length} drawn marks`); } catch { /* sin texto */ }
    return () => p.remove();
  }, [w, ...deps]);
  return <><div data-chart-kind="observable" ref={ref} style={{ width: '100%', minHeight: h, overflow: 'hidden' }} />{explain && <AutoExplain facts={explanation?.facts || facts + '\nThese are axis labels and drawn marks, not the original observations. Do not infer observation counts or data extremes from ticks.'} {...explanation} />}</>;
}
export function EChart({ option, deps, h = 300, onClick, explain = true, explanation }) {
  const ref = useRef(null); const ch = useRef(null); const cb = useRef(onClick); cb.current = onClick;
  useEffect(() => {
    ch.current = echarts.init(ref.current, null, { renderer: 'canvas' }); ch.current.on('click', (e) => cb.current?.(e));
    const ro = new ResizeObserver(() => ch.current?.resize()); ro.observe(ref.current);
    return () => { ro.disconnect(); ch.current?.dispose(); };
  }, []);
  useEffect(() => { ch.current?.setOption(option, true); }, deps);
  return <><div data-chart-kind="echarts" ref={ref} style={{ width: '100%', height: h }} />{explain && <AutoExplain facts={echartsFacts(option)} {...explanation} />}</>;
}
export function olsBand(x, y) {
  const n = x.length, xb = x.reduce((a, b) => a + b, 0) / n, yb = y.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, sxy = 0; for (let i = 0; i < n; i++) { sxx += (x[i] - xb) ** 2; sxy += (x[i] - xb) * (y[i] - yb); }
  const b = sxy / sxx, a = yb - b * xb; let sse = 0; for (let i = 0; i < n; i++) sse += (y[i] - a - b * x[i]) ** 2;
  const s = Math.sqrt(sse / (n - 2)), t = 1.96;
  const fit = x.map((v) => a + b * v), band = x.map((v) => t * s * Math.sqrt(1 / n + (v - xb) ** 2 / sxx));
  let r2 = 0, syy = 0; for (let i = 0; i < n; i++) syy += (y[i] - yb) ** 2; r2 = 1 - sse / syy;
  return { a, b, fit, band, r2 };
}
