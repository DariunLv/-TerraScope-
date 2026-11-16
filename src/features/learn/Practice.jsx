import Interpret from '../../shared/Interpret';
import { stats as seriesStats } from '../../shared/charts/chartFacts';
import { useState, useMemo } from 'react';
import { Button, Slider } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import Killa, { KillaSay } from '../../killa/Killa';
import { motion } from 'framer-motion';
import { mannKendall, ols } from '../../lib/analysis/stats';
import { useT } from '../../core/i18n';
import SpotlightCard from '../../ui/SpotlightCard';
function gen() {
  const trend = Math.random() < 0.5, n = 40, slope = trend ? 0.035 + Math.random() * 0.04 : 0, y = []; let e = 0;
  for (let i = 0; i < n; i++) { const u = Math.max(Math.random(), 1e-9); e = 0.3 * e + Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random()); y.push(slope * i + e); }
  return { trend, y, p: mannKendall(y).p };
}
function FitLine({ L }) {
  const mk = () => { const sl = (Math.random() - 0.3) * 0.12, y = []; for (let i = 0; i < 30; i++) y.push(sl * i + Math.sqrt(-2 * Math.log(Math.max(Math.random(), 1e-9))) * Math.cos(2 * Math.PI * Math.random()) * 0.7); return y; };
  const [y, setY] = useState(mk); const [s, setS] = useState(0); const [show, setShow] = useState(false);
  const x = y.map((_, i) => i), o = useMemo(() => ols(x, y), [y]), my = y.reduce((a, b) => a + b, 0) / y.length;
  const pred = (sl, i) => my + sl * (i - 14.5), sse = (sl) => y.reduce((a, v, i) => a + (v - pred(sl, i)) ** 2, 0), best = sse(o.slope), mine = sse(s), score = Math.max(0, Math.round(100 * best / mine));
  const lo = Math.min(...y) - 0.6, hi = Math.max(...y) + 0.6, X = (i) => 14 + (i / 29) * 372, Y = (v) => 150 - ((v - lo) / (hi - lo)) * 140;
  return (
    <div className="card panel" style={{ marginTop: 22, textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}><Killa estado={score > 90 ? 'orgullosa' : 'ensenando'} size={150} /></div>
      <h2 style={{ fontSize: 26 }}>{L('Tu turno: ajusta la línea de tendencia', 'Your turn: fit the trend line')}</h2>
      <p className="sub" style={{ margin: '0 auto' }}>{L('Mueve el control hasta que la línea pase lo más cerca posible de los puntos. Las barritas son el error: mientras más cortas, mejor.', 'Move the slider until the line runs as close to the points as possible. The small bars are the error: the shorter, the better.')}</p>
      <svg viewBox="0 0 400 160" style={{ width: '100%', maxWidth: 620, margin: '10px auto', display: 'block' }}>
        {y.map((v, i) => <line key={'e' + i} x1={X(i)} x2={X(i)} y1={Y(v)} y2={Y(pred(s, i))} stroke="#c2410c" strokeOpacity=".45" strokeWidth="2" />)}
        {y.map((v, i) => <circle key={i} cx={X(i)} cy={Y(v)} r="4" fill="#1e3a8a" />)}
        <line x1={X(0)} y1={Y(pred(s, 0))} x2={X(29)} y2={Y(pred(s, 29))} stroke="#0c5a43" strokeWidth="3.5" strokeLinecap="round" />
        {show && <line x1={X(0)} y1={Y(pred(o.slope, 0))} x2={X(29)} y2={Y(pred(o.slope, 29))} stroke="#c2410c" strokeWidth="2.5" strokeDasharray="7 5" />}
      </svg>
      <div style={{ maxWidth: 520, margin: '0 auto' }}><Slider color="forest" min={-0.15} max={0.15} step={0.002} value={s} onChange={setS} label={(v) => v.toFixed(3)} /></div>
      <p style={{ margin: '14px 0 6px' }}><b style={{ fontSize: 22, color: score > 90 ? '#0c5a43' : '#1e3a8a' }}>{score} / 100</b> <span className="mini">{L('puntos de ajuste', 'fit score')}</span></p>
      <div className="btns" style={{ marginTop: 0 }}>
        <button className="textlink" onClick={() => setShow(!show)}>{show ? L('Ocultar la respuesta', 'Hide the answer') : L('Ver la línea que calcula la regresión', 'Show the regression line')}</button>
        <button className="textlink" onClick={() => { setY(mk()); setS(0); setShow(false); }}>{L('Otra serie', 'Another series')}</button>
      </div>
      <Interpret title={L('Ajustar una recta a los datos', 'Fitting a line to the data')} facts={seriesStats('simulated points, arbitrary units',x,y) + `; user slope ${s}; squared error ${mine}; fit score ${score}/100; ${show ? 'revealed regression slope '+o.slope+'; regression p '+o.p : 'model answer is still hidden; explain the user fit without revealing the optimal slope'}`} how={L('La línea verde es tu ajuste. La puntuación compara su error con el mejor ajuste posible en esta simulación.', 'The green line is your fit. The score compares its error with the best possible fit in this simulation.')} plain={L('Busca una recta que reduzca el error del conjunto, no una que pase por todos los puntos.', 'Look for a line that reduces the overall error, not one that passes through every point.')} />
      {show && <p className="mini">{L(`La regresión elige la pendiente que hace mínimo el error total: ${o.slope.toFixed(3)} por paso. La prueba t pregunta si esa pendiente es distinta de cero (aquí p ${o.p < 0.001 ? '< 0,001' : '= ' + o.p.toFixed(3)}).`, `Regression picks the slope with the smallest total error: ${o.slope.toFixed(3)} per step. The t-test asks whether that slope differs from zero (here p ${o.p < 0.001 ? '< 0.001' : '= ' + o.p.toFixed(3)}).`)}</p>}
    </div>
  );
}
export default function Practice() {
  const { t, lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b);
  const [g, setG] = useState(gen); const [ans, setAns] = useState(null); const [sc, setSc] = useState([0, 0]);
  const pick = (a) => { if (ans !== null) return; setAns(a); setSc(([c, n]) => [c + (a === (g.p < 0.05) ? 1 : 0), n + 1]); };
  const next = () => { setG(gen()); setAns(null); };
  const lo = Math.min(...g.y), hi = Math.max(...g.y);
  const pts = g.y.map((v, i) => `${(i / 39) * 300 + 10},${110 - ((v - lo) / (hi - lo)) * 100}`).join(' ');
  const real = g.p < 0.05;
  return (
    <>
      <div className="card panel" style={{ marginTop: 22, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}><KillaSay size={120} estado={ans === null ? (sc[1] ? 'duda' : 'pista') : ans === real ? 'celebrando' : 'avergonzada'} text={ans === null ? L('¿Tendencia real o solo ruido? Mira la línea.', 'Real trend or just noise? Look at the line.') : ans === real ? L('¡Exacto! Buen ojo de detective.', 'Exactly! Great detective eye.') : L('Uy, casi. Te explico abajo.', 'Oops, close. I explain below.')} /></div>
        <h2 style={{ fontSize: 26 }}>{t.gameTitle}</h2><p className="sub" style={{ margin: '0 auto' }}>{t.gameSub}</p>
        <svg viewBox="0 0 320 120" style={{ width: '100%', maxWidth: 520, margin: '14px auto', display: 'block' }}><polyline points={pts} fill="none" stroke="#1e3a8a" strokeWidth="2.5" strokeLinejoin="round" /></svg>
        {ans === null ? (
          <div className="btns" style={{ marginTop: 6 }}><Button onClick={() => pick(true)} color="green" variant="light">{t.gameTrend}</Button><Button onClick={() => pick(false)} color="gray" variant="light">{t.gameNoise}</Button></div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <b style={{ color: ans === real ? '#34d399' : '#fb7185' }}>{ans === real ? <IconCheck size={16} style={{ verticalAlign: '-3px' }} /> : <IconX size={16} style={{ verticalAlign: '-3px' }} />} {t.gameReveal}:</b> {t.gameWas(g.trend, g.p < 0.001 ? '< 0.001' : g.p.toFixed(3))}
            <div><Button mt="sm" onClick={next}>{t.gameNew}</Button></div>
          </motion.div>
        )}
        <p className="mini">{t.gameScore}: {sc[0]} / {sc[1]}</p>
        {ans !== null && <Interpret title={L('Resultado del juego de tendencia', 'Trend game result')} facts={seriesStats('simulated game series, arbitrary units',g.y.map((_,i)=>i),g.y) + `; planted trend ${g.trend}; Mann-Kendall p ${g.p}; significance threshold 0.05; the visual pattern and the statistical test can disagree`} how={L('La línea muestra los datos simulados y la prueba contrasta el patrón con lo esperable por azar.', 'The line shows simulated data and the test compares the pattern with chance.')} plain={L('La respuesta del juego usa la prueba estadística. Una prueba no es una garantía y el ruido puede ocultar una señal sembrada.', 'The game answer uses the statistical test. A test is not a guarantee, and noise may hide a planted signal.')} />}
      </div>
      <FitLine L={L} />
    </>
  );
}
