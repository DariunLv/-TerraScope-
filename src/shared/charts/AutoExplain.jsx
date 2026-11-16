/* Explicación automática para CUALQUIER gráfico: Killa lo explica en palabras simples con los números reales del gráfico.
   Si ya hay un botón “Explícame” cerca (de ese mismo bloque), este se oculta para no repetirlo. */
import { useEffect, useRef, useState } from 'react';
import Interpret from '../Interpret';
import { useT } from '../../core/i18n';
const num = (v) => typeof v === 'number' && isFinite(v);
const f = (v) => (Math.abs(v) >= 100 ? Math.round(v) : +v.toFixed(2));
export function stats(name, xs, ys) {
  const y = ys.filter(num); if (y.length < 2) return '';
  const lo = Math.min(...y), hi = Math.max(...y), first = y[0], last = y[y.length - 1], iLo = ys.indexOf(lo), iHi = ys.indexOf(hi);
  const lbl = (i) => (xs && xs[i] != null ? ` (${String(xs[i]).slice(0, 10)})` : '');
  const d = last - first, dir = Math.abs(d) < (hi - lo) * 0.05 ? 'flat' : d > 0 ? 'rising' : 'falling';
  return `${name || 'series'}: ${y.length} points, min ${f(lo)}${lbl(iLo)}, max ${f(hi)}${lbl(iHi)}, first ${f(first)}, last ${f(last)}, overall ${dir} (${d >= 0 ? '+' : ''}${f(d)})`;
}
export function plotlyFacts(data = [], layout = {}) {
  const t = (x) => (typeof x === 'string' ? x : x?.text || '');
  const out = [];
  if (t(layout.title)) out.push('title: ' + t(layout.title));
  if (t(layout.xaxis?.title)) out.push('x axis: ' + t(layout.xaxis.title));
  if (t(layout.yaxis?.title)) out.push('y axis: ' + t(layout.yaxis.title));
  data.slice(0, 5).forEach((tr) => {
    const nm = tr.name || tr.type || 'series';
    if (tr.type === 'surface' || tr.type === 'heatmap') { const z = (tr.z || []).flat().filter(num); if (z.length) out.push(`${nm} (${tr.type}): values from ${f(Math.min(...z))} to ${f(Math.max(...z))}`); return; }
    if (tr.type === 'pie') { out.push(`pie: ${(tr.labels || []).slice(0, 6).join(', ')}`); return; }
    if (Array.isArray(tr.x) && Array.isArray(tr.y)) {
      if (tr.x.every(num) && tr.y.some((v) => typeof v === 'string')) { const rows = tr.y.map((l, i) => [l, tr.x[i]]).sort((a, b) => b[1] - a[1]); out.push(`${nm} (bars): top ${rows.slice(0, 3).map((r) => `${r[0]} ${f(r[1])}`).join('; ')}; lowest ${rows.slice(-2).map((r) => `${r[0]} ${f(r[1])}`).join('; ')}`); return; }
      const s = stats(nm, tr.x, tr.y); if (s) out.push(s);
    }
  });
  return out.join('\n');
}
export function echartsFacts(opt = {}) {
  const out = []; const t = Array.isArray(opt.title) ? opt.title[0]?.text : opt.title?.text; if (t) out.push('title: ' + t);
  const xs = opt.xAxis?.data || (Array.isArray(opt.xAxis) ? opt.xAxis[0]?.data : null);
  (opt.series || []).slice(0, 5).forEach((s) => { const ys = (s.data || []).map((d) => (num(d) ? d : Array.isArray(d) ? d[1] : d?.value)); const st = stats(s.name || s.type, xs, ys); if (st) out.push(st); });
  return out.join('\n');
}
export default function AutoExplain({ facts, title, kind = 'chart' }) {
  const { lang } = useT(), L = (a, b) => (lang === 'es' ? a : b), ref = useRef(null), [hide, setHide] = useState(false), [ttl, setTtl] = useState(title || '');
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const host = el.closest('.glass,.card,.panel,.mantine-Tabs-panel,section') || el.parentElement?.parentElement;
    const mine = el.querySelector('.interp');
    if (host && [...host.querySelectorAll('.interp')].some((n) => n !== mine && !n.closest('[data-auto-explain]'))) { setHide(true); return; }
    if (!title) { const h = (el.parentElement?.previousElementSibling?.matches?.('h2,h3,h4') ? el.parentElement.previousElementSibling : null) || host?.querySelector('h2,h3,h4'); if (h) setTtl(h.textContent.trim()); }
  });
  const f2 = (facts || '').trim();
  if (hide || !f2) return <span ref={ref} data-auto-explain hidden />;
  const lines = f2.split('\n');
  const plain = L('Qué dice aquí: ', 'What it says here: ') + lines.filter((l) => /points|bars|values|pie/.test(l)).slice(0, 2).join('. ') + '.';
  const how = L('Cómo se lee: el eje horizontal muestra el tiempo o la categoría y el vertical el valor medido; cuanto más alta la línea o la barra, mayor el valor.', 'How to read it: the horizontal axis shows time or category and the vertical axis the measured value; the higher the line or bar, the larger the value.');
  return <div ref={ref} data-auto-explain className="auto-ex"><Interpret title={ttl || L('Gráfico', 'Chart')} facts={`${kind}\n${f2}`} plain={plain} how={how} /></div>;
}
