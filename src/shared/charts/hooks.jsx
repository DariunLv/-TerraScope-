import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import * as Plot from '@observablehq/plot';
export function useWidth() {
  const ref = useRef(null); const [w, setW] = useState(640);
  useEffect(() => { const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width)))); if (ref.current) ro.observe(ref.current); return () => ro.disconnect(); }, []);
  return [ref, w];
}
export function PlotView({ build, deps, h = 260 }) {
  const [ref, w] = useWidth();
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const p = build(Plot, w); el.replaceChildren(p); return () => p.remove();
  }, [w, ...deps]);
  return <div ref={ref} style={{ width: '100%', minHeight: h, overflow: 'hidden' }} />;
}
export function EChart({ option, deps, h = 300, onClick }) {
  const ref = useRef(null); const ch = useRef(null); const cb = useRef(onClick); cb.current = onClick;
  useEffect(() => {
    ch.current = echarts.init(ref.current, null, { renderer: 'canvas' }); ch.current.on('click', (e) => cb.current?.(e));
    const ro = new ResizeObserver(() => ch.current?.resize()); ro.observe(ref.current);
    return () => { ro.disconnect(); ch.current?.dispose(); };
  }, []);
  useEffect(() => { ch.current?.setOption(option, true); }, deps);
  return <div ref={ref} style={{ width: '100%', height: h }} />;
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
