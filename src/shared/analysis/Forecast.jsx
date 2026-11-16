/* Pestaña “Predicción”: pronóstico de series de tiempo con varios modelos, prueba rodante de aciertos,
   banda de incertidumbre real (error medido por horizonte) e interpretación de Killa. */
import { lazy, Suspense, useMemo, useState } from 'react';
import { Slider, SegmentedControl, Loader, Alert } from '@mantine/core';
import { IconCrystalBall, IconShieldCheck, IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { V } from '../../lib/nasa/data';
import { fillGaps } from '../../lib/analysis/intel';
import * as F from '../../lib/analysis/forecast';
import { useT } from '../../core/i18n';
import { usePal } from '../../core/palette';
import Interpret from '../Interpret';
import { KillaNote } from '../../killa/Killa';
import { MES } from './Intel';
const P = lazy(() => import('../charts/Plotly'));
const Wait = () => <div style={{ padding: 30, textAlign: 'center' }}><Loader size="sm" color="forest" /></div>;

export default function Forecast({ cur, pname }) {
  const { lang } = useT(), L = (a, b) => (lang === 'es' ? a : b), pal = usePal();
  const [months, setMonths] = useState(24), [model, setModel] = useState('auto'), [show, setShow] = useState('monthly');
  const k = cur.k, u = V[k]?.u || '', d = V[k]?.d ?? 1, name = (V[k]?.[lang]?.[0] || k).toLowerCase();
  const pts = useMemo(() => fillGaps(cur.raw).pts, [cur]), y = useMemo(() => pts.map((p) => p.v), [pts]), m0 = pts[0]?.month ?? 0;
  const bt = useMemo(() => (y.length >= 72 ? F.backtest(y, m0) : null), [y, m0]);
  const used = model === 'auto' ? (bt?.best || 'ens') : model;
  const fc = useMemo(() => F.run(used, y, m0, months, F.hwParams(y)), [used, y, m0, months]);
  const sd = useMemo(() => (bt ? F.spread(bt.res[used].sdH, months) : fc.map(() => F.sdev(y) * 0.5)), [bt, used, months, fc, y]);
  const lastP = pts[pts.length - 1], mk = (i) => { const t = lastP.year * 12 + lastP.month + 1 + i; return { year: Math.floor(t / 12), month: t % 12 }; };
  const fut = fc.map((v, i) => ({ ...mk(i), v, lo: v - 1.645 * sd[i], hi: v + 1.645 * sd[i], l2: v - 0.674 * sd[i], h2: v + 0.674 * sd[i] }));
  const lab = (p) => `${p.year}-${String(p.month + 1).padStart(2, '0')}`;
  const recent = pts.slice(-Math.min(pts.length, 120)), pick = (p) => p.year + p.month / 12 + 1 / 24;
  const NM = { hw: L('Holt-Winters', 'Holt-Winters'), trend: L('Tendencia + estación', 'Trend + season'), ens: L('Conjunto (promedio)', 'Ensemble (average)'), naive: L('Repetir el año pasado', 'Repeat last year') };
  const clim = F.climatology(y, m0), last12 = y.slice(-12), lastYr = mean12(y), fcYr = mean12(fc.slice(-12).length === 12 ? fc.slice(-12) : fc);
  function mean12(a) { return a.reduce((s, v) => s + v, 0) / (a.length || 1); }
  const peak = fut.reduce((a, b) => (b.v > a.v ? b : a)), low = fut.reduce((a, b) => (b.v < a.v ? b : a));
  const end = fut[fut.length - 1], delta = fcYr - lastYr, skill = bt ? bt.res[used].skill : null, ok = bt && skill > 0.05;
  const annual = show === 'annual';
  const traces = [];
  if (!annual) {
    const band = (lo, hi, c, nm) => [{ x: fut.map(lab), y: fut.map((p) => p[lo]), mode: 'lines', line: { width: 0 }, showlegend: false, hoverinfo: 'skip' }, { x: fut.map(lab), y: fut.map((p) => p[hi]), mode: 'lines', line: { width: 0 }, fill: 'tonexty', fillcolor: c, name: nm, hoverinfo: 'skip' }];
    traces.push(...band('lo', 'hi', 'rgba(30,58,138,.13)', L('Rango 90 %', '90 % range')), ...band('l2', 'h2', 'rgba(30,58,138,.27)', L('Rango 50 %', '50 % range')),
      { x: recent.map(lab), y: recent.map((p) => p.v), mode: 'lines', name: L('Observado', 'Observed'), line: { color: '#14213d', width: 2 }, hovertemplate: '%{x}: %{y:.' + d + 'f} ' + u + '<extra></extra>' },
      { x: [lab(lastP), ...fut.map(lab)], y: [lastP.v, ...fut.map((p) => p.v)], mode: 'lines', name: L('Pronóstico: ', 'Forecast: ') + NM[used], line: { color: '#e8590c', width: 3 }, hovertemplate: '%{x}: %{y:.' + d + 'f} ' + u + '<extra></extra>' });
    if (bt) MODELS_OTHER(used).forEach((m, i) => traces.push({ x: fut.map(lab), y: F.run(m, y, m0, months, F.hwParams(y)), mode: 'lines', name: NM[m], line: { width: 1.3, dash: 'dot', color: ['#0c8a6a', '#8b5cf6', '#94a3b8'][i] }, visible: 'legendonly', hovertemplate: '%{x}: %{y:.' + d + 'f}<extra>' + NM[m] + '</extra>' }));
  } else {
    const ann = (arr) => { const m = new Map(); arr.forEach((p) => { const a = m.get(p.year) || [0, 0]; a[0] += p.v; a[1]++; m.set(p.year, a); }); return [...m.entries()].filter(([, a]) => a[1] >= 11).map(([yr, a]) => ({ year: yr, v: a[0] / a[1] })); };
    const ha = ann(pts), fa = ann(fut);
    traces.push({ x: ha.map((p) => p.year), y: ha.map((p) => p.v), mode: 'lines+markers', name: L('Promedio anual observado', 'Observed annual mean'), line: { color: '#14213d', width: 2 }, marker: { size: 5 } },
      { x: fa.map((p) => p.year), y: fa.map((p) => p.v), mode: 'lines+markers', name: L('Promedio anual previsto', 'Forecast annual mean'), line: { color: '#e8590c', width: 3, dash: 'dash' }, marker: { size: 7 } });
  }
  function MODELS_OTHER(m) { return F.MODELS.filter((x) => x !== m); }
  const dir = delta > 0.02 * (Math.abs(lastYr) || 1) ? 'up' : delta < -0.02 * (Math.abs(lastYr) || 1) ? 'down' : 'flat';
  const f2 = (v) => v.toFixed(d);
  const reading = L(
    `Mirando ${name} en ${pname}, la serie tiene un ciclo anual claro y, en conjunto, ${dir === 'up' ? 'sube' : dir === 'down' ? 'baja' : 'se mantiene estable'}. El modelo elegido (${NM[used]}) proyecta que el próximo año promediará ${f2(fcYr)} ${u}, frente a ${f2(lastYr)} ${u} del último año observado (${delta >= 0 ? '+' : ''}${f2(delta)}). El mes más alto sería ${MES.es[peak.month]} ${peak.year} (${f2(peak.v)} ${u}) y el más bajo ${MES.es[low.month]} ${low.year} (${f2(low.v)} ${u}). ${bt ? `Probamos este método en el pasado: se equivocó en promedio ${f2(bt.res[used].mae)} ${u} y mejoró ${Math.round(skill * 100)} % frente a simplemente repetir el año anterior. ${ok ? 'Por eso la proyección merece confianza razonable a 1 año.' : 'Es poca ventaja, así que úsalo con cautela.'}` : 'La serie es corta para comprobar el método, tómalo como ilustración.'} La banda se ensancha con el tiempo: lo lejano es menos seguro.`,
    `Looking at ${name} in ${pname}, the series has a clear yearly cycle and overall ${dir === 'up' ? 'rises' : dir === 'down' ? 'falls' : 'holds steady'}. The chosen model (${NM[used]}) projects that next year will average ${f2(fcYr)} ${u}, versus ${f2(lastYr)} ${u} in the last observed year (${delta >= 0 ? '+' : ''}${f2(delta)}). The highest month would be ${MES.en[peak.month]} ${peak.year} (${f2(peak.v)} ${u}) and the lowest ${MES.en[low.month]} ${low.year} (${f2(low.v)} ${u}). ${bt ? `We tested this method on the past: it was off by ${f2(bt.res[used].mae)} ${u} on average and beat simply repeating last year by ${Math.round(skill * 100)} %. ${ok ? 'So the 1-year projection deserves reasonable confidence.' : 'That is a small edge, so use it with caution.'}` : 'The series is too short to check the method; treat it as an illustration.'} The band widens over time: the far future is less certain.`);
  const facts = `${name} (${u}) at ${pname}. Model ${NM[used]}. Last observed year mean ${f2(lastYr)}. Forecast next-year mean ${f2(fcYr)} (change ${f2(delta)}). Forecast end ${lab(end)}: ${f2(end.v)} (90% range ${f2(end.lo)} to ${f2(end.hi)}). Peak ${lab(peak)} ${f2(peak.v)}, low ${lab(low)} ${f2(low.v)}. ` + (bt ? `Rolling backtest: MAE ${f2(bt.res[used].mae)}, skill vs seasonal-naive ${Math.round(skill * 100)}%, best model ${NM[bt.best]}.` : 'Series too short for a backtest.');
  return (<>
    <p className="sub">{L('Pronóstico con series de tiempo: la app aprende el ciclo anual y la tendencia de esta variable, la proyecta hacia adelante y mide con datos pasados cuánto puede equivocarse.', 'Time-series forecast: the app learns this variable’s yearly cycle and trend, projects it forward, and uses past data to measure how wrong it can be.')}</p>
    <div className="row ctrl">
      <div style={{ flex: 1, minWidth: 220 }}><span className="mini">{L('Meses hacia adelante', 'Months ahead')}: <b>{months}</b></span><Slider color="forest" min={6} max={60} step={6} value={months} onChange={setMonths} label={null} /></div>
      <div style={{ flex: 2, minWidth: 260 }}><span className="mini">{L('Modelo', 'Model')}</span><SegmentedControl fullWidth size="xs" color="forest" value={model} onChange={setModel} data={[{ value: 'auto', label: L('Automático', 'Auto') }, ...F.MODELS.map((m) => ({ value: m, label: NM[m] }))]} /></div>
      <div style={{ minWidth: 150 }}><span className="mini">{L('Vista', 'View')}</span><SegmentedControl fullWidth size="xs" color="forest" value={show} onChange={setShow} data={[{ value: 'monthly', label: L('Mensual', 'Monthly') }, { value: 'annual', label: L('Anual', 'Annual') }]} /></div>
    </div>
    <Suspense fallback={<Wait />}><P pal={pal} h={400} data={traces} layout={{ hovermode: 'x unified', yaxis: { title: u, gridcolor: pal.grid }, xaxis: { gridcolor: pal.grid }, legend: { orientation: 'h', y: 1.14 }, margin: { t: 50 } }} /></Suspense>
    <div className="kpis">
      <div className="kpi"><span>{L('Modelo usado', 'Model used')}</span><b style={{ fontSize: 16 }}>{NM[used]}{model === 'auto' && bt ? L(' (el mejor)', ' (best)') : ''}</b></div>
      <div className="kpi"><span>{L('Próximo año (promedio)', 'Next year (mean)')}</span><b>{f2(fcYr)} {u}</b></div>
      <div className="kpi"><span>{L('Cambio vs último año', 'Change vs last year')}</span><b>{delta >= 0 ? '+' : ''}{f2(delta)} {u}</b></div>
      <div className="kpi"><span>{L('Error típico (prueba)', 'Typical error (test)')}</span><b>{bt ? `${f2(bt.res[used].mae)} ${u}` : '—'}</b></div>
    </div>
    {bt && <div className="fc-bt"><h4>{L('¿Qué modelo acierta más? Prueba con el pasado', 'Which model is most accurate? Test on the past')}</h4>
      {F.MODELS.slice().sort((a, b) => bt.res[a].mae - bt.res[b].mae).map((m) => { const w = 100 * (1 - bt.res[m].mae / (Math.max(...F.MODELS.map((x) => bt.res[x].mae)) * 1.05)); return (
        <div key={m} className={'fc-row' + (m === used ? ' on' : '')}><span>{NM[m]}</span><div><i style={{ width: Math.max(6, w) + '%' }} /></div><b>{f2(bt.res[m].mae)} {u}</b></div>); })}
      <p className="mini">{L(`Error medio absoluto a 12 meses, con ${bt.folds} pruebas rodantes: se esconde un tramo, se proyecta y se compara con lo que pasó. Barra más larga = menor error.`, `Mean absolute error at 12 months over ${bt.folds} rolling tests: a stretch is hidden, projected and compared with what happened. Longer bar = smaller error.`)}</p></div>}
    <KillaNote estado={ok ? 'ensenando' : 'idea'} size={110} title={L('Lo que dice Killa de este pronóstico', 'What Killa says about this forecast')}>{reading}</KillaNote>
    <Interpret title={L('Pronóstico de ', 'Forecast of ') + name} facts={facts} plain={reading} how={L('La línea oscura es lo observado, la naranja el pronóstico y las bandas azules el rango probable.', 'The dark line is observed, the orange line the forecast and the blue bands the likely range.')} />
    <Alert mt="sm" radius="lg" color={!bt ? 'gray' : ok ? 'green' : 'yellow'} icon={ok ? <IconShieldCheck size={18} /> : <IconAlertTriangle size={18} />}>
      {!bt ? L('Se necesitan al menos 6 años de datos mensuales para validar el pronóstico.', 'At least 6 years of monthly data are needed to validate the forecast.') : ok ? L('El método superó a la referencia simple en la prueba: la banda de 90 % usa los errores reales medidos en el pasado.', 'The method beat the simple benchmark in the test: the 90 % band uses real errors measured in the past.') : L('En la prueba este método casi no mejora a repetir el año anterior: confía más en el ciclo estacional que en la tendencia.', 'In the test this method barely beats repeating last year: trust the seasonal cycle more than the trend.')}
    </Alert>
    <p className="mini"><IconInfoCircle size={13} style={{ verticalAlign: '-2px' }} /> {L('Es una proyección estadística, no una certeza: supone que el comportamiento pasado continúa. Modelos: Holt-Winters aditivo, tendencia lineal + ciclo estacional + inercia AR(1), su promedio y la referencia “igual que el año pasado”.', 'This is a statistical projection, not a certainty: it assumes past behaviour continues. Models: additive Holt-Winters, linear trend + seasonal cycle + AR(1) inertia, their average and the “same as last year” benchmark.')}</p>
  </>);
}
