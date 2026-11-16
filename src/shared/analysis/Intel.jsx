import Interpret from '../Interpret';
import { stats as seriesStats } from '../charts/chartFacts';
/* Pestaña “Anomalías y futuro” del laboratorio: normalidad contextual, ficha de evidencia,
   pronóstico con incertidumbre validado y señales de alerta temprana. */
import { lazy, Suspense, useMemo, useState } from 'react';
import { Slider, Switch, Alert, Loader } from '@mantine/core';
import { IconRadar2, IconWorld, IconCrystalBall, IconActivityHeartbeat, IconExternalLink, IconShieldCheck, IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { V, sourceOf } from '../../lib/nasa/data';
import { isTemp } from '../../lib/analysis/viz';
import * as I from '../../lib/analysis/intel';
import { useAnalysis } from '../../lib/analysis/useAnalysis';
import { useT } from '../../core/i18n';
import { usePal } from '../../core/palette';
import { EChart, PlotView } from '../charts/hooks';
const Planet2050 = lazy(() => import('./Planet2050'));
const P = lazy(() => import('../charts/Plotly'));
const Wait = () => <div style={{ padding: 30, textAlign: 'center' }}><Loader size="sm" color="forest" /></div>;
export const MES = { es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
const UP = '#c2410c', DOWN = '#1e40af';
const colors = (k) => (isTemp(k) ? [UP, DOWN] : [DOWN, UP]); // [por encima, por debajo]: más calor es naranja; más agua es azul
const MonthBars = ({ flags, pts, color }) => { const c = Array(12).fill(0); flags.forEach((f, i) => { if (f) c[pts[i].month]++; }); const mx = Math.max(1, ...c); return <div className="mbars">{c.map((n, m) => <i key={m} style={{ height: `${8 + (n / mx) * 92}%`, background: n ? color : '#dbe3ee' }} title={String(n)} />)}</div>; };

function Anomalies({ cur, res, pname, L, lang }) {
  const [thr, setThr] = useState(2.5), [detrend, setDetrend] = useState(true), [pick, setPick] = useState(null);
  const k = cur.k, u = V[k].u, d = V[k].d, [cUp, cDn] = colors(k);
  const A = useMemo(() => { const g = I.fillGaps(cur.raw), c = I.contextual(g.pts, { thr, detrend }), gl = I.globalThreshold(g.pts, thr), fo = I.forestFlags(c, Math.max(1, c.list.length) / g.pts.length); return { g, c, gl, fo }; }, [cur, thr, detrend]);
  const J = useMemo(() => (res.list.length > 1 ? I.joint(res.list.map((x) => ({ k: x.k, pts: x.raw })), detrend) : null), [res, detrend]);
  const { g, c, gl, fo } = A, pts = g.pts, n = pts.length, sel = pick != null && pick < n ? pick : (c.list[0]?.i ?? n - 1), sp = pts[sel];
  const lab = pts.map((p) => `${p.year}-${String(p.month + 1).padStart(2, '0')}`);
  const opt = { animationDuration: 500, textStyle: { color: '#5b6b8c' }, grid: { left: 52, right: 16, top: 30, bottom: 62 }, legend: { top: 0, textStyle: { color: '#5b6b8c' }, data: [L('Observado', 'Observed'), L('Lo normal para ese mes', 'Normal for that month'), L('Anomalía', 'Anomaly')] },
    tooltip: { trigger: 'axis', formatter: (ps) => { const i = ps[0].dataIndex; return `<b>${MES[lang][pts[i].month]} ${pts[i].year}</b><br>${L('Observado', 'Observed')}: ${pts[i].v.toFixed(d)} ${u}<br>${L('Esperado', 'Expected')}: ${c.exp[i].toFixed(d)} ${u}<br>z = ${c.z[i].toFixed(2)}${pts[i].rec ? '<br>' + L('dato reconstruido', 'reconstructed value') : ''}`; } },
    xAxis: { type: 'category', data: lab, boundaryGap: false, axisLabel: { color: '#5b6b8c' } }, yAxis: { type: 'value', scale: true, name: u, splitLine: { lineStyle: { color: '#eef2f7' } } },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 22, bottom: 8 }],
    series: [
      { type: 'line', data: c.exp.map((e, i) => e - thr * c.s[i]), stack: 'band', stackStrategy: 'all', symbol: 'none', lineStyle: { opacity: 0 }, silent: true },
      { type: 'line', data: c.s.map((s) => 2 * thr * s), stack: 'band', stackStrategy: 'all', symbol: 'none', lineStyle: { opacity: 0 }, areaStyle: { color: 'rgba(12,90,67,.13)' }, silent: true },
      { name: L('Lo normal para ese mes', 'Normal for that month'), type: 'line', data: c.exp, symbol: 'none', lineStyle: { color: '#0c5a43', type: 'dashed', width: 1.2 }, itemStyle: { color: '#0c5a43' } },
      { name: L('Observado', 'Observed'), type: 'line', data: pts.map((p) => p.v), symbol: 'none', lineStyle: { color: '#1e3a8a', width: 1.4 }, itemStyle: { color: '#1e3a8a' }, markLine: { symbol: 'none', silent: true, lineStyle: { color: '#facc15', width: 2, type: 'solid' }, label: { show: false }, data: [{ xAxis: sel }] } },
      { name: L('Anomalía', 'Anomaly'), type: 'scatter', data: c.list.map((a) => ({ value: [a.i, a.v], itemStyle: { color: a.z > 0 ? cUp : cDn } })), symbolSize: (v, pr) => 7 + Math.min(10, Math.abs(c.z[pr.value[0]]) * 2), itemStyle: { borderColor: '#fff', borderWidth: 1.5 }, z: 5 },
    ] };
  const far = (x) => (Math.abs(x) >= 6 ? L('casi nunca', 'almost never') : `1 ${L('de cada', 'in')} ${Math.max(2, Math.round(1 / (2 * (1 - I.phi(Math.abs(x))))))} ${L('meses', 'months')}`);
  const z = c.z[sel], jr = J?.rows.find((r) => r.year === sp.year && r.month === sp.month);
  const more = c.list.length > c.expected * 1.6 + 1;
  const wv = res.pl.id !== 'csv' ? `https://worldview.earthdata.nasa.gov/?v=${[res.pl.lon - 3, res.pl.lat - 2.2, res.pl.lon + 3, res.pl.lat + 2.2].map((x) => x.toFixed(2)).join(',')}&t=${sp.year}-${String(sp.month + 1).padStart(2, '0')}-15` : null;
  const both = (a, b) => a.reduce((s, f, i) => s + (f && b[i] ? 1 : 0), 0);
  const methods = [[L('Umbral fijo para todo', 'One fixed threshold'), gl, '#868e96', L('Compara cada mes con el promedio de toda la serie. Solo ve los meses extremos del año.', 'Compares each month with the whole-series mean. It only sees the extreme months of the year.')],
    [L('Normalidad contextual', 'Contextual normality'), c.flags, '#0c5a43', L('Compara cada mes con lo normal para ese lugar y esa época. Es el método que usamos.', 'Compares each month with what is normal for that place and season. This is the method we use.')],
    ['Isolation Forest', fo.flags, '#1e3a8a', L('Aprendizaje automático sin etiquetas: aísla los meses raros. Sirve para contrastar.', 'Unsupervised machine learning: isolates odd months. Used as a cross-check.')]];
  const jopt = J && { textStyle: { color: '#5b6b8c' }, grid: { left: 44, right: 16, top: 10, bottom: 56 }, tooltip: { trigger: 'axis', formatter: (ps) => { const r = J.rows[ps[0].dataIndex]; return `<b>${MES[lang][r.month]} ${r.year}</b><br>D² = ${r.d2.toFixed(1)} · p ${r.p < 0.001 ? '< 0.001' : '= ' + r.p.toFixed(3)}`; } },
    xAxis: { type: 'category', data: J.rows.map((r) => `${r.year}-${String(r.month + 1).padStart(2, '0')}`) }, yAxis: { type: 'value', name: 'D²', splitLine: { lineStyle: { color: '#eef2f7' } } }, dataZoom: [{ type: 'inside', start: 60, end: 100 }, { type: 'slider', start: 60, end: 100, height: 20, bottom: 6 }],
    series: [{ type: 'bar', data: J.rows.map((r) => ({ value: +r.d2.toFixed(2), itemStyle: { color: r.p < 0.01 ? '#b91c1c' : r.p < 0.05 ? '#d97706' : '#b8c4d6' } })), barCategoryGap: '10%' }] };
  const pickJ = (e) => { const r = J.rows[e.dataIndex]; const i = pts.findIndex((p) => p.year === r.year && p.month === r.month); if (i >= 0) setPick(i); };
  return (<>
    <p className="sub">{L('Una anomalía no es un valor alto o bajo: es un valor inusual para este lugar y esta época del año. Aquí la app aprende lo normal de cada mes y marca lo que se sale.', 'An anomaly is not a high or low value: it is a value unusual for this place and this time of year. The app learns what is normal each month and flags what falls outside.')}</p>
    <div className="row ctrl">
      <div style={{ flex: 1, minWidth: 220, maxWidth: 380 }}><span className="mini">{L('Qué tan raro debe ser para marcarlo', 'How unusual to flag it')}: <b>{thr.toFixed(1)} σ</b></span><Slider color="forest" min={2} max={4} step={0.1} value={thr} onChange={setThr} label={null} /></div>
      <Switch color="forest" checked={detrend} onChange={(e) => setDetrend(e.currentTarget.checked)} label={L('Descontar la tendencia de fondo', 'Discount the background trend')} />
    </div>
    <EChart option={opt} deps={[A, sel, lang]} h={360} onClick={(e) => { if (e.componentType === 'series') setPick(e.seriesType === 'scatter' ? e.value[0] : e.dataIndex); }} />
    <p className="mini">{L('Franja verde: rango normal. Puntos: meses anómalos. Toca un punto para ver su ficha; arrastra la barra inferior para moverte en el tiempo.', 'Green band: normal range. Dots: anomalous months. Tap a dot for its card; drag the lower bar to move through time.')} {g.missing > 0 && L(`Se rellenaron ${g.missing} meses faltantes y están marcados como reconstruidos.`, `${g.missing} missing months were filled and are marked as reconstructed.`)}</p>
    <Interpret title={L('Anomalías mensuales', 'Monthly anomalies')} facts={`${n} meses analizados; ${c.list.length} anomalías (meses inusuales para su época); el puro azar daría ${c.expected.toFixed(1)}; la más extrema: ${c.list[0] ? MES[lang][c.list[0].month] + ' ' + c.list[0].year + ' a ' + c.list[0].z.toFixed(1) + ' desviaciones' : 'ninguna'}; umbral de rareza elegido`} how={L('Cómo se lee: la línea azul es lo observado, la verde punteada lo normal de cada mes, la franja el rango normal y los puntos los meses que se salen.', 'How to read it: the blue line is observed, the dashed green is each month’s normal, the band is the normal range and the dots are months that fall outside.')} plain={c.list.length > c.expected ? L('Qué dice aquí: hay más meses raros de los que daría el azar; vale la pena revisarlos.', 'What it says here: there are more odd months than chance would give; worth checking.') : L('Qué dice aquí: la cantidad de meses raros es la esperable por azar; no hay comportamiento inusual.', 'What it says here: the number of odd months is what chance gives; nothing unusual.')} next={L('Toca un punto rojo para abrir su ficha de evidencia y revisa si hay una causa conocida (incendio, sequía, cambio de sensor).', 'Tap a red dot to open its evidence card and check for a known cause (fire, drought, sensor change).')} />
    <div className="kpis">
      <div className="kpi"><span>{L('Meses analizados', 'Months analysed')}</span><b>{n}</b></div>
      <div className="kpi"><span>{L('Anomalías detectadas', 'Anomalies detected')}</span><b>{c.list.length}</b></div>
      <div className="kpi"><span>{L('Las que daría el puro azar', 'Expected by chance alone')}</span><b>{c.expected.toFixed(1)}</b></div>
      <div className="kpi"><span>{L('La más extrema', 'Most extreme')}</span><b>{c.list[0] ? `${MES[lang][c.list[0].month]} ${c.list[0].year} (${c.list[0].z.toFixed(1)} σ)` : '—'}</b></div>
    </div>
    <Alert mt="sm" radius="lg" color={more ? 'orange' : 'green'} icon={more ? <IconAlertTriangle size={18} /> : <IconShieldCheck size={18} />}>{more ? L(`Hay más anomalías (${c.list.length}) de las que explicaría el azar (${c.expected.toFixed(1)}): vale la pena investigar qué pasó en esos meses.`, `There are more anomalies (${c.list.length}) than chance would explain (${c.expected.toFixed(1)}): those months deserve a closer look.`) : L('El número de anomalías es el que se espera por azar con este umbral: no hay evidencia de un comportamiento inusual.', 'The number of anomalies matches what chance gives at this threshold: no evidence of unusual behaviour.')}</Alert>
    <motion.div key={sel} className="evidence" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h4 className="sh" style={{ marginTop: 0 }}>{L('Ficha de evidencia', 'Evidence card')} · {MES[lang][sp.month]} {sp.year}</h4>
      <div className="evgrid">
        <div><span>{L('Qué', 'What')}</span><b>{V[k][lang][0]}</b></div>
        <div><span>{L('Dónde', 'Where')}</span><b>{pname}</b></div>
        <div><span>{L('Cuánto', 'How much')}</span><b>{sp.v.toFixed(d)} {u} <small>({L('lo normal', 'normal')}: {c.exp[sel].toFixed(d)})</small></b></div>
        <div><span>{L('Qué tan raro', 'How unusual')}</span><b style={{ color: Math.abs(z) >= thr ? (z > 0 ? cUp : cDn) : undefined }}>{z > 0 ? '+' : ''}{z.toFixed(2)} σ <small>({far(z)})</small></b></div>
        <div><span>{L('Fuente y periodo', 'Source and period')}</span><b>{sourceOf(k)} · {pts[0].year}–{pts[n - 1].year}{sp.rec ? ' · ' + L('reconstruido', 'reconstructed') : ''}</b></div>
        <div><span>{L('Veredicto', 'Verdict')}</span><b>{Math.abs(z) >= thr ? L('Mes anómalo', 'Anomalous month') : L('Dentro de lo normal', 'Within normal')}</b></div>
      </div>
      {jr && (<><span className="mini">{L('Qué más se movió ese mes (en desviaciones respecto de lo normal)', 'What else moved that month (in deviations from normal)')}:</span>
        {J.keys.map((kk, j) => <div key={kk} className="zrow"><span>{V[kk][lang][0]}</span><div><i style={{ width: `${Math.min(50, Math.abs(jr.z[j]) * 12.5)}%`, left: jr.z[j] >= 0 ? '50%' : `${50 - Math.min(50, Math.abs(jr.z[j]) * 12.5)}%`, background: jr.z[j] >= 0 ? colors(kk)[0] : colors(kk)[1] }} /></div><b>{jr.z[j] > 0 ? '+' : ''}{jr.z[j].toFixed(1)}</b></div>)}
        <p className="mini" style={{ margin: '6px 0 0' }}>{L('Anomalía conjunta de todas las variables', 'Joint anomaly of all variables')}: D² = {jr.d2.toFixed(1)}, p {jr.p < 0.001 ? '< 0.001' : '= ' + jr.p.toFixed(3)}. {L('Que varias variables se muevan a la vez es una asociación, no prueba la causa.', 'Several variables moving together is an association, not proof of cause.')}</p></>)}
      {wv && <a className="textlink" href={wv} target="_blank" rel="noreferrer"><IconExternalLink size={14} /> {L('Ver la imagen satelital de ese mes en NASA Worldview', 'See that month’s satellite image in NASA Worldview')}</a>}
    </motion.div>
    {J && (<><h4 className="sh">{L('Anomalía conjunta en el tiempo: ¿cuándo se salieron varias variables a la vez?', 'Joint anomaly through time: when did several variables depart together?')}</h4>
      <EChart option={jopt} deps={[J, lang]} h={230} onClick={pickJ} /><p className="mini">{L('Distancia de Mahalanobis entre lo observado y lo normal, usando todas tus variables. Rojo: p < 0,01. Toca una barra para abrir su ficha.', 'Mahalanobis distance between observed and normal, using all your variables. Red: p < 0.01. Tap a bar to open its card.')}</p></>)}
    <h4 className="sh">{L('¿Por qué no basta un umbral fijo? Tres detectores frente a frente', 'Why is a fixed threshold not enough? Three detectors side by side')}</h4>
    <div className="three">{methods.map(([name, fl, color, txt], i) => <div key={i} className="clf"><b>{name}</b><span className="mini">{txt}</span><MonthBars flags={fl} pts={pts} color={color} /><span className="mini">{MES[lang][0]} → {MES[lang][11]} · <b>{fl.filter(Boolean).length}</b> {L('meses marcados', 'months flagged')}{i !== 1 && <> · {both(fl, c.flags)} {L('coinciden con el contextual', 'match the contextual one')}</>}</span></div>)}</div>
    <p className="mini">{L('Las barras muestran en qué meses del año cae cada alerta. El umbral fijo las amontona en la estación extrema; la normalidad contextual las reparte, porque juzga cada mes contra su propia historia.', 'Bars show in which calendar months alerts fall. The fixed threshold piles them in the extreme season; contextual normality spreads them, because it judges each month against its own history.')}</p>
  </>);
}

function Future({ cur, L, lang, pal }) {
  const [years, setYears] = useState(10), [mult, setMult] = useState(1);
  const k = cur.k, u = V[k].u, d = V[k].d, pts = useMemo(() => I.fillGaps(cur.raw).pts, [cur]);
  const S = useMemo(() => ({ main: I.simulate(pts, { years, mult }), stop: I.simulate(pts, { years, mult: 0, B: 200 }), dbl: I.simulate(pts, { years, mult: 2, B: 200 }) }), [pts, years, mult]);
  const bt = useMemo(() => I.backtest(pts, 5), [pts]);
  const hist = useMemo(() => { const m = new Map(); pts.forEach((p) => { const a = m.get(p.year) || [0, 0]; a[0] += p.v; a[1]++; m.set(p.year, a); }); return [...m.entries()].filter(([, a]) => a[1] === 12).map(([y, a]) => ({ year: y, v: a[0] / a[1] })); }, [pts]);
  const a = S.main.ann, yy = a.map((q) => q.year), last = a[a.length - 1], h0 = hist[hist.length - 1];
  const ok = bt && bt.coverage >= 0.7, short = !bt;
  const band = (lo, hi, c, name) => [{ x: yy, y: a.map((q) => q[lo]), mode: 'lines', line: { width: 0 }, showlegend: false, hoverinfo: 'skip' }, { x: yy, y: a.map((q) => q[hi]), mode: 'lines', line: { width: 0 }, fill: 'tonexty', fillcolor: c, name, hoverinfo: 'skip' }];
  return (<>
    <p className="sub">{L('Si el comportamiento de los últimos años continúa, ¿hacia dónde va esta variable? La app proyecta la tendencia con su incertidumbre y antes comprueba si ese mismo método habría acertado en el pasado.', 'If recent behaviour continues, where is this variable heading? The app projects the trend with its uncertainty, after checking whether the same method would have worked in the past.')}</p>
    <div className="row ctrl">
      <div style={{ flex: 1, minWidth: 200 }}><span className="mini">{L('Años hacia adelante', 'Years ahead')}: <b>{years}</b></span><Slider color="forest" min={3} max={20} value={years} onChange={setYears} label={null} /></div>
      <div style={{ flex: 1, minWidth: 200 }}><span className="mini">{L('¿Y si la tendencia…', 'What if the trend…')} <b>{mult === 0 ? L('se detiene', 'stops') : mult === 1 ? L('sigue igual', 'continues') : mult < 1 ? L('se frena', 'slows') : mult === 2 ? L('se duplica', 'doubles') : L('se acelera', 'speeds up')}</b> (×{mult.toFixed(1)})</span><Slider color="navy" min={0} max={2} step={0.1} value={mult} onChange={setMult} label={null} marks={[{ value: 0 }, { value: 1 }, { value: 2 }]} /></div>
    </div>
    <Suspense fallback={<Wait />}><P pal={pal} h={380} data={[
      ...band('q05', 'q95', 'rgba(30,58,138,.13)', L('Rango 90 %', '90 % range')), ...band('q25', 'q75', 'rgba(30,58,138,.25)', L('Rango 50 %', '50 % range')),
      { x: hist.map((p) => p.year), y: hist.map((p) => p.v), mode: 'lines+markers', name: L('Promedio anual observado', 'Observed annual mean'), line: { color: '#14213d', width: 2 }, marker: { size: 4 }, hovertemplate: '%{x}: %{y:.' + d + 'f} ' + u + '<extra></extra>' },
      { x: [h0.year, ...yy], y: [h0.v, ...a.map((q) => q.q50)], mode: 'lines', name: L('Tu escenario (valor central)', 'Your scenario (central value)'), line: { color: '#1e3a8a', width: 3 }, hovertemplate: '%{x}: %{y:.' + d + 'f} ' + u + '<extra></extra>' },
      { x: yy, y: S.stop.ann.map((q) => q.q50), mode: 'lines', name: L('Si la tendencia se detiene', 'If the trend stops'), line: { color: '#0c5a43', dash: 'dot', width: 2 }, hoverinfo: 'skip' },
      { x: yy, y: S.dbl.ann.map((q) => q.q50), mode: 'lines', name: L('Si se duplica', 'If it doubles'), line: { color: '#b91c1c', dash: 'dot', width: 2 }, hoverinfo: 'skip' }]}
      layout={{ hovermode: 'x unified', yaxis: { title: u, gridcolor: pal.grid }, xaxis: { gridcolor: pal.grid }, shapes: [{ type: 'line', x0: h0.year + 0.5, x1: h0.year + 0.5, yref: 'paper', y0: 0, y1: 1, line: { color: '#9aa', dash: 'dash', width: 1 } }] }} /></Suspense>
    <div className="kpis">
      <div className="kpi"><span>{L(`Valor central en ${last.year}`, `Central value in ${last.year}`)}</span><b>{last.q50.toFixed(d)} {u}</b></div>
      <div className="kpi"><span>{L('Rango de 90 %', '90 % range')}</span><b>{last.q05.toFixed(d)} {L('a', 'to')} {last.q95.toFixed(d)}</b></div>
      <div className="kpi"><span>{L('Cambio respecto de hoy', 'Change from today')}</span><b>{last.q50 - h0.v > 0 ? '+' : ''}{(last.q50 - h0.v).toFixed(d)} {u}</b></div>
      <div className="kpi"><span>{L('Aciertos del rango en la prueba', 'Range hits in the check')}</span><b style={{ color: short ? '#868e96' : ok ? '#0c5a43' : '#b91c1c' }}>{short ? '—' : `${Math.round(bt.coverage * 100)} %`}</b></div>
    </div>
    <Alert mt="sm" radius="lg" color={short ? 'gray' : ok ? 'green' : 'red'} icon={ok ? <IconShieldCheck size={18} /> : <IconAlertTriangle size={18} />}>
      {short ? L('La serie es demasiado corta para comprobar el método: toma la proyección solo como ilustración.', 'The series is too short to check the method: treat the projection as an illustration only.')
        : ok ? L(`Comprobación: escondimos los últimos ${bt.hold} años, proyectamos desde antes y el ${Math.round(bt.coverage * 100)} % de los meses reales cayó dentro del rango de 90 %. Error típico: ${bt.mae.toFixed(d)} ${u}${bt.skill > 0.02 ? `, un ${Math.round(bt.skill * 100)} % mejor que suponer que nada cambia.` : ', similar a suponer que nada cambia: la tendencia aporta poco a esta escala.'}`, `Check: we hid the last ${bt.hold} years, projected from before, and ${Math.round(bt.coverage * 100)} % of real months fell inside the 90 % range. Typical error: ${bt.mae.toFixed(d)} ${u}${bt.skill > 0.02 ? `, ${Math.round(bt.skill * 100)} % better than assuming nothing changes.` : ', similar to assuming nothing changes: the trend adds little at this scale.'}`)
          : L(`Cuidado: en la comprobación solo el ${Math.round(bt.coverage * 100)} % de los meses reales cayó dentro del rango de 90 %. El método no es confiable para esta serie y la app prefiere decirlo antes que dar un número seguro.`, `Careful: in the check only ${Math.round(bt.coverage * 100)} % of real months fell inside the 90 % range. The method is not reliable for this series and the app would rather say so than give a confident number.`)}
    </Alert>
    <p className="mini"><IconInfoCircle size={13} style={{ verticalAlign: '-2px' }} /> {L('Es una proyección condicionada, no una predicción: supone que la tendencia y la variabilidad pasadas continúan. Modelo: tendencia lineal + ciclo estacional + memoria de un mes (AR1), con 400 simulaciones que incluyen la incertidumbre de la pendiente.', 'This is a conditional projection, not a prediction: it assumes past trend and variability continue. Model: linear trend + seasonal cycle + one-month memory (AR1), with 400 simulations that include slope uncertainty.')}</p>
  </>);
}

function Warning({ cur, L }) {
  const analysis = useAnalysis('warning', { points: cur.raw }, [cur.raw]), e = analysis.value?.result;
  if (analysis.loading) return <Wait />;
  if (analysis.error) return <Alert color="orange">{L('No se pudo completar el análisis. Reintenta.', 'The analysis could not finish. Retry.')}</Alert>;
  if (!e) return <Alert radius="lg" color="gray">{L('Se necesitan al menos 15 años de datos mensuales para buscar señales de alerta temprana.', 'At least 15 years of monthly data are needed to look for early-warning signals.')}</Alert>;
  const sv = e.tauVar > 0 && e.pVar < 0.05, sa = e.tauAc > 0 && e.pAc < 0.05, lvl = sv && sa ? 2 : sv || sa ? 1 : 0;
  const chart = (y, label, color) => <PlotView explanation={{title:L('Alerta temprana: ', 'Early warning: ')+label,facts:seriesStats(label,e.x,y)+`; rolling window ${e.win} months; Kendall variance trend ${e.tauVar}; variance surrogate p ${e.pVar}; Kendall memory trend ${e.tauAc}; memory surrogate p ${e.pAc}; simulated AR(1) surrogates, not a collapse forecast`,how:L('La curva sigue un indicador móvil de variabilidad o memoria. Las pruebas comparan su tendencia con series sin cambio generadas por el método.', 'The curve tracks a rolling variability or memory indicator. Tests compare its trend with no-change series generated by the method.')}} deps={[e]} h={210} build={(Plot, w) => Plot.plot({ width: w, height: 210, marginLeft: 52, style: { background: 'transparent', color: '#5b6b8c' }, x: { label: null, tickFormat: (v) => String(Math.round(v)) }, y: { label, grid: true }, marks: [Plot.areaY(e.x.map((x, i) => ({ x, y: y[i] })), { x: 'x', y1: Math.min(...y), y2: 'y', fill: color, fillOpacity: 0.12 }), Plot.lineY(e.x.map((x, i) => ({ x, y: y[i] })), { x: 'x', y: 'y', stroke: color, strokeWidth: 2 }), Plot.linearRegressionY(e.x.map((x, i) => ({ x, y: y[i] })), { x: 'x', y: 'y', stroke: '#14213d', strokeDasharray: '5 4', ci: 0 })] })} />;
  return (<>
    <p className="sub">{L('Antes de un cambio brusco, muchos sistemas se vuelven más lentos para recuperarse: sus altibajos crecen y cada mes se parece más al anterior. Aquí medimos esas dos huellas a lo largo del tiempo.', 'Before an abrupt shift, many systems recover more slowly: their swings grow and each month resembles the previous one more. Here we measure those two fingerprints through time.')}</p>
    <div className="two">
      <div><h4 className="sh">{L('Variabilidad (varianza móvil)', 'Variability (rolling variance)')}</h4>{chart(e.va, L('varianza', 'variance'), '#c2410c')}
        <div className="kpis"><div className="kpi"><span>{L('Tendencia (τ de Kendall)', 'Trend (Kendall τ)')}</span><b>{e.tauVar.toFixed(2)}</b></div><div className="kpi"><span>p ({L('frente a 200 series sin cambio', 'against 200 no-change series')})</span><b style={{ color: sv ? '#b91c1c' : '#868e96' }}>{e.pVar.toFixed(3)}</b></div></div></div>
      <div><h4 className="sh">{L('Memoria (autocorrelación móvil de un mes)', 'Memory (rolling lag-1 autocorrelation)')}</h4>{chart(e.ac, 'AC1', '#1e3a8a')}
        <div className="kpis"><div className="kpi"><span>{L('Tendencia (τ de Kendall)', 'Trend (Kendall τ)')}</span><b>{e.tauAc.toFixed(2)}</b></div><div className="kpi"><span>p ({L('frente a 200 series sin cambio', 'against 200 no-change series')})</span><b style={{ color: sa ? '#b91c1c' : '#868e96' }}>{e.pAc.toFixed(3)}</b></div></div></div>
    </div>
    <Alert mt="sm" radius="lg" color={lvl === 2 ? 'red' : lvl === 1 ? 'orange' : 'green'} icon={lvl ? <IconAlertTriangle size={18} /> : <IconShieldCheck size={18} />}>
      {lvl === 2 ? L('Las dos huellas aumentan de forma significativa: el sistema podría estar perdiendo estabilidad. Es una señal para vigilar, no un pronóstico de colapso.', 'Both fingerprints rise significantly: the system may be losing stability. It is a signal to watch, not a collapse forecast.')
        : lvl === 1 ? L('Solo una de las dos huellas aumenta de forma significativa: señal débil. Conviene seguir observando.', 'Only one fingerprint rises significantly: weak signal. Keep watching.')
          : L('Ninguna huella aumenta más de lo que pasaría por azar: sin señal de pérdida de estabilidad.', 'Neither fingerprint rises more than chance would give: no sign of stability loss.')}
    </Alert>
    <p className="mini">{L(`Ventana móvil de ${Math.round(e.win / 12)} años sobre la serie sin tendencia ni ciclo estacional. La significancia se obtiene comparando con 200 series simuladas con la misma memoria y sin cambio (Dakos et al., 2012). Ojo: mezclar sensores o reanálisis distintos puede crear señales falsas (Smith et al., 2023).`, `Rolling window of ${Math.round(e.win / 12)} years on the detrended, deseasonalised series. Significance comes from 200 simulated series with the same memory and no change (Dakos et al., 2012). Note: mixing sensors or reanalyses can create false signals (Smith et al., 2023).`)}</p>
  </>);
}

export default function Intel({ cur, res, pname }) {
  const { lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b); const pal = usePal();
  const [tab, setTab] = useState('anom');
  const T = [['anom', IconRadar2, L('Anomalías', 'Anomalies')], ['fut', IconCrystalBall, L('Pronóstico y escenarios', 'Forecast and scenarios')], ['ews', IconActivityHeartbeat, L('Alerta temprana', 'Early warning')]];
  if (cur.raw.length < 60) return <Alert radius="lg" color="gray">{L('Se necesitan al menos 5 años de datos mensuales.', 'At least 5 years of monthly data are needed.')}</Alert>;
  return (<>
    <div className="subtabs">{T.map(([v, Ic, l]) => <button key={v} className={(tab === v ? 'on' : '')} onClick={() => setTab(v)}><Ic size={15} />{l}</button>)}</div>
    <div style={{ paddingTop: 14 }}>
      {tab === 'anom' && <Anomalies cur={cur} res={res} pname={pname} L={L} lang={lang} />}
      {tab === 'fut' && <Future cur={cur} L={L} lang={lang} pal={pal} />}
      {tab === 'ews' && <Warning cur={cur} L={L} />}
    </div>
  </>);
}
