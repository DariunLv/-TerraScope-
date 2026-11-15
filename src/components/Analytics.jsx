import { lazy, Suspense, useMemo, useState } from 'react';
import { Tabs, Loader, Select, Table, Badge, Button, Alert } from '@mantine/core';
import { IconCalendarTime, IconBolt, IconRuler2, IconUpload, IconChartLine, IconChartHistogram, IconCalendarStats, IconRipple, IconGitCompare, IconShieldCheck, IconTable } from '@tabler/icons-react';
import * as d3 from 'd3';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { ResponsiveCalendar } from '@nivo/calendar';
import { SegmentedControl } from '@mantine/core';
import { Bar } from '@visx/shape';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Group } from '@visx/group';
import { useT } from '../i18n';
import { usePal } from '../palette';
import { V, powerDaily, demoDaily, parseCsv, sourceOf } from '../lib/data';
import { deseason } from '../lib/stats';
import * as A from '../lib/advanced';
import { pearson } from '../lib/viz';
import { PlotView, EChart, olsBand, useWidth } from './charts/hooks';
const P = lazy(() => import('./charts/Plotly'));
const Sci = lazy(() => import('./charts/Sci'));
const MON = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONE = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const Wait = () => <div style={{ padding: 30, textAlign: 'center' }}><Loader size="sm" /></div>;
const f = (x, d = 3) => (x == null || isNaN(x) ? '—' : Math.abs(x) < 0.001 && x !== 0 ? x.toExponential(1) : x.toFixed(d));
const Note = ({ children }) => <p className="mini" style={{ marginTop: 6 }}>{children}</p>;

function Series({ cur, pal, L }) {
  const { r, raw } = cur, an = useMemo(() => deseason(raw), [raw]);
  const x = r.x, yrs = raw.map((p) => `${p.year}-${String(p.month + 1).padStart(2, '0')}`);
  const roll = useMemo(() => { const o = []; let s = 0; an.forEach((v, i) => { s += v; if (i >= 12) s -= an[i - 12]; o.push(i >= 11 ? s / 12 : null); }); return o; }, [an]);
  const b = useMemo(() => olsBand(x, an), [x, an]);
  const D = useMemo(() => A.decompose(raw), [raw]);
  const x1 = useMemo(() => yrs, [yrs]);
  const up = b.fit.map((v, i) => v + b.band[i]), lo = b.fit.map((v, i) => v - b.band[i]);
  return (
    <>
      <Suspense fallback={<Wait />}>
        <P pal={pal} h={380} data={[
          { x: x1, y: an, type: 'scattergl', mode: 'lines', name: L('Anomalía mensual', 'Monthly anomaly'), line: { color: pal.c[5], width: 1 }, opacity: 0.55 },
          { x: x1, y: roll, type: 'scatter', mode: 'lines', name: L('Media móvil 12 m', '12-mo mean'), line: { color: pal.c[1], width: 3 } },
          { x: [...x1, ...x1.slice().reverse()], y: [...up, ...lo.slice().reverse()], fill: 'toself', type: 'scatter', mode: 'none', name: 'IC 95 % (OLS)', fillcolor: 'rgba(251,191,36,.18)', hoverinfo: 'skip' },
          { x: x1, y: b.fit, type: 'scatter', mode: 'lines', name: L('Tendencia', 'Trend'), line: { color: pal.c[3], width: 2.5, dash: 'dash' } },
        ]} layout={{ xaxis: { rangeslider: { thickness: 0.07 }, type: 'date', gridcolor: pal.grid }, yaxis: { title: V[cur.k].u, gridcolor: pal.grid }, hovermode: 'x unified' }} />
        <h4 className="sh">{L('Descomposición clásica (observado = tendencia + estación + residuo)', 'Classical decomposition (observed = trend + season + residual)')}</h4>
        <P pal={pal} h={460} data={[
          { x: x1, y: raw.map((p) => p.v), name: L('Observado', 'Observed'), type: 'scatter', mode: 'lines', line: { color: pal.c[5], width: 1.2 }, xaxis: 'x', yaxis: 'y' },
          { x: x1, y: D.trend, name: L('Tendencia', 'Trend'), type: 'scatter', mode: 'lines', line: { color: pal.c[1], width: 2 }, yaxis: 'y2' },
          { x: x1, y: D.seasonal, name: L('Estacional', 'Seasonal'), type: 'scatter', mode: 'lines', line: { color: pal.c[0], width: 1.2 }, yaxis: 'y3' },
          { x: x1, y: D.residual, name: L('Residuo', 'Residual'), type: 'scatter', mode: 'markers', marker: { color: pal.c[2], size: 3 }, yaxis: 'y4' },
        ]} layout={{ showlegend: false, hovermode: 'x unified', yaxis: { domain: [0.78, 1], gridcolor: pal.grid }, yaxis2: { domain: [0.52, 0.74], gridcolor: pal.grid }, yaxis3: { domain: [0.26, 0.48], gridcolor: pal.grid }, yaxis4: { domain: [0, 0.22], gridcolor: pal.grid }, xaxis: { type: 'date', gridcolor: pal.grid } }} />
        <Note>{L('Fuerza de la estacionalidad', 'Seasonality strength')}: <b>{f(D.seasonalStrength, 2)}</b> · {L('Arrastra para hacer zoom; usa la barra inferior para elegir periodos.', 'Drag to zoom; use the bottom slider to pick periods.')}</Note>
      </Suspense>
    </>
  );
}

function Distribution({ cur, pal, L }) {
  const { raw } = cur, an = useMemo(() => deseason(raw), [raw]), st = A.describe(an);
  const rows = an.map((v, i) => ({ v, dec: Math.floor(raw[i].year / 10) * 10 }));
  const half = Math.floor(raw.length / 3), first = an.slice(0, half), last = an.slice(-half);
  const ecdf = (a, name) => { const s = [...a].sort((p, q) => p - q); return s.map((v, i) => ({ v, p: (i + 1) / s.length, g: name })); };
  const ec = [...ecdf(first, L('Primer tercio', 'First third')), ...ecdf(last, L('Último tercio', 'Last third'))];
  const ks = (() => { const all = [...first, ...last].sort((a, b) => a - b); let m = 0; const F = (s, v) => s.filter((z) => z <= v).length / s.length; all.forEach((v) => { m = Math.max(m, Math.abs(F(first, v) - F(last, v))); }); return m; })();
  return (
    <div className="two">
      <div>
        <h4 className="sh">{L('Histograma de anomalías + normal', 'Anomaly histogram + normal')}</h4>
        <PlotView deps={[an, pal]} build={(Plot, w) => Plot.plot({ width: w, height: 270, style: { background: 'transparent', color: pal.muted }, x: { label: V[cur.k].u }, y: { grid: true }, marks: [
          Plot.rectY(an, Plot.binX({ y: 'count' }, { x: (d) => d, fill: pal.c[0], fillOpacity: 0.75, thresholds: 24 })),
          Plot.ruleY([0]), Plot.ruleX([0], { stroke: pal.c[3], strokeDasharray: '4 3' }),
        ] })} />
        <Note>{L('Asimetría', 'Skewness')} {f(st.skew, 2)} · {L('curtosis', 'kurtosis')} {f(st.kurt, 2)} · Jarque-Bera p = {f(st.pJB)} → {st.pJB > 0.05 ? L('compatible con normal', 'consistent with normal') : L('se aparta de la normal: por eso usamos pruebas no paramétricas', 'departs from normal: hence non-parametric tests')}</Note>
      </div>
      <div>
        <h4 className="sh">{L('Distribución por década (facetas)', 'Distribution by decade (facets)')}</h4>
        <PlotView deps={[an, pal]} build={(Plot, w) => Plot.plot({ width: w, height: 270, style: { background: 'transparent', color: pal.muted }, marginLeft: 44, x: { label: V[cur.k].u }, y: { axis: null }, fy: { label: null, tickFormat: (d) => `${d}s` }, facet: { data: rows, y: 'dec' }, marks: [Plot.rectY(rows, Plot.binX({ y: 'count' }, { x: 'v', fill: pal.c[1], thresholds: 14 })), Plot.ruleX([0], { stroke: pal.c[3], strokeDasharray: '3 3' })] })} />
        <Note>{L('Si las campanas se desplazan hacia la derecha, hay calentamiento.', 'If the bells shift right, it is warming.')}</Note>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <h4 className="sh">{L('Función de distribución acumulada: primer vs último tercio', 'Empirical CDF: first vs last third')}</h4>
        <PlotView deps={[an, pal]} h={260} build={(Plot, w) => Plot.plot({ width: w, height: 260, style: { background: 'transparent', color: pal.muted }, y: { grid: true, label: 'F(x)' }, x: { label: V[cur.k].u }, color: { range: [pal.c[0], pal.c[2]], legend: true }, marks: [Plot.line(ec, { x: 'v', y: 'p', stroke: 'g', strokeWidth: 2.2 })] })} />
        <Note>{L('Distancia máxima entre curvas (estadístico K-S)', 'Max distance between curves (K-S statistic)')}: <b>{f(ks, 3)}</b></Note>
      </div>
    </div>
  );
}

function Seasonal({ cur, pal, L, lang }) {
  const { raw } = cur, M = lang === 'es' ? MON : MONE, g = A.byMonth(raw);
  const box = g.map((a) => { const s = [...a].sort((x, y) => x - y); return [s[0], A.quantile(s, 0.25), A.quantile(s, 0.5), A.quantile(s, 0.75), s[s.length - 1]]; });
  const n = raw.length / 12, yrs = [...new Set(raw.map((p) => p.year))], third = Math.floor(yrs.length / 3);
  const avg = (sel) => Array.from({ length: 12 }, (_, m) => { const v = raw.filter((p) => p.month === m && sel(p.year)).map((p) => p.v); return v.reduce((a, b) => a + b, 0) / v.length; });
  const e1 = avg((y) => y <= yrs[third - 1]), e2 = avg((y) => y >= yrs[yrs.length - third]);
  const base = { textStyle: { color: pal.muted, fontFamily: 'Inter' }, tooltip: { trigger: 'item' } };
  const o1 = { ...base, grid: { left: 46, right: 12, top: 14, bottom: 28 }, xAxis: { type: 'category', data: M, axisLine: { lineStyle: { color: pal.grid } } }, yAxis: { type: 'value', scale: true, splitLine: { lineStyle: { color: pal.grid } } },
    series: [{ type: 'boxplot', data: box, itemStyle: { color: 'rgba(34,211,238,.25)', borderColor: pal.c[0] }, emphasis: { itemStyle: { borderColor: pal.c[2] } } }] };
  const rmin = Math.min(...e1, ...e2), rmax = Math.max(...e1, ...e2);
  const o2 = { ...base, legend: { data: [L('Primer tercio', 'First third'), L('Último tercio', 'Last third')], textStyle: { color: pal.muted }, top: 0 }, radar: { indicator: M.map((m) => ({ name: m, min: rmin - (rmax - rmin) * 0.1, max: rmax })), axisName: { color: pal.muted }, splitLine: { lineStyle: { color: pal.grid } }, splitArea: { show: false }, axisLine: { lineStyle: { color: pal.grid } } },
    series: [{ type: 'radar', data: [{ value: e1, name: L('Primer tercio', 'First third'), lineStyle: { color: pal.c[0] }, itemStyle: { color: pal.c[0] }, areaStyle: { color: 'rgba(34,211,238,.18)' } }, { value: e2, name: L('Último tercio', 'Last third'), lineStyle: { color: pal.c[2] }, itemStyle: { color: pal.c[2] }, areaStyle: { color: 'rgba(244,114,182,.18)' } }] }] };
  const years = yrs, hm = raw.map((p) => [p.month, years.indexOf(p.year), +p.v.toFixed(3)]);
  const vmin = Math.min(...raw.map((p) => p.v)), vmax = Math.max(...raw.map((p) => p.v));
  const o3 = { ...base, tooltip: { position: 'top' }, grid: { left: 50, right: 20, top: 6, bottom: 46 }, xAxis: { type: 'category', data: M, splitArea: { show: false } }, yAxis: { type: 'category', data: years, axisLabel: { interval: 4 } },
    visualMap: { min: vmin, max: vmax, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: ['#1d4ed8', '#22d3ee', '#fde68a', '#fb7185'] }, textStyle: { color: pal.muted } }, series: [{ type: 'heatmap', data: hm }] };
  return (
    <div className="two">
      <div><h4 className="sh">{L('Caja por mes (ciclo estacional y dispersión)', 'Box by month (seasonal cycle & spread)')}</h4><EChart option={o1} deps={[raw, pal]} h={300} /></div>
      <div><h4 className="sh">{L('Radar del ciclo: ¿se desplazó la estación?', 'Cycle radar: did the season shift?')}</h4><EChart option={o2} deps={[raw, pal]} h={300} /></div>
      <div style={{ gridColumn: '1 / -1' }}><h4 className="sh">{L('Valores crudos año × mes (ECharts)', 'Raw values year × month (ECharts)')}</h4><EChart option={o3} deps={[raw, pal]} h={420} /></div>
      <div style={{ gridColumn: '1 / -1' }}><h4 className="sh">{L('Superficie 3D año × mes (Plotly): gira con el ratón', '3D surface year × month (Plotly): drag to rotate')}</h4>
        <Suspense fallback={<Wait />}><P pal={pal} h={460} data={[{ type: 'surface', x: M, y: years, z: years.map((yr) => Array.from({ length: 12 }, (_, m) => { const p = raw.find((q) => q.year === yr && q.month === m); return p ? p.v : null; })), colorscale: [[0, '#1e40af'], [0.5, '#f7f4ec'], [1, '#c2410c']], showscale: false, contours: { z: { show: true, usecolormap: true, project: { z: true } } } }]} layout={{ margin: { l: 0, r: 0, t: 0, b: 0 }, scene: { xaxis: { title: '' }, yaxis: { title: '' }, zaxis: { title: V[cur.k].u }, camera: { eye: { x: 1.6, y: -1.6, z: 0.9 } } } }} /></Suspense></div>
    </div>
  );
}

function Memory({ cur, pal, L }) {
  const { r } = cur, ac = useMemo(() => A.acf(r.y, 24), [r.y]);
  const [ref, w] = useWidth(); const H = 240, m = { l: 44, r: 10, t: 10, b: 34 };
  const xs = scaleBand({ domain: ac.vals.map((_, i) => i + 1), range: [0, w - m.l - m.r], padding: 0.35 });
  const lim = Math.max(0.3, ...ac.vals.map(Math.abs)) * 1.1; const ys = scaleLinear({ domain: [-lim, lim], range: [H - m.t - m.b, 0] });
  const roll = useMemo(() => (r.annual ? A.rollingSen(r.annual.years, r.annual.y, Math.min(15, r.annual.years.length - 3)) : []), [r.annual]);
  const sx = d3.scaleLinear().domain(d3.extent(roll, (d) => d.year)).range([m.l, w - m.r]);
  const lo2 = d3.min(roll, (d) => d.lo), hi2 = d3.max(roll, (d) => d.hi), sy = d3.scaleLinear().domain([Math.min(lo2, 0), Math.max(hi2, 0)]).nice().range([H - m.b, m.t]);
  const area = d3.area().x((d) => sx(d.year)).y0((d) => sy(d.lo)).y1((d) => sy(d.hi)).curve(d3.curveMonotoneX), line = d3.line().x((d) => sx(d.year)).y((d) => sy(d.slope)).curve(d3.curveMonotoneX);
  return (
    <div className="two">
      <div ref={ref}>
        <h4 className="sh">{L('Autocorrelación (ACF) con visx', 'Autocorrelation (ACF) with visx')}</h4>
        <svg width="100%" viewBox={`0 0 ${w} ${H}`}><Group left={m.l} top={m.t}>
          <line x1="0" x2={w - m.l - m.r} y1={ys(ac.ci)} y2={ys(ac.ci)} stroke={pal.c[3]} strokeDasharray="4 4" /><line x1="0" x2={w - m.l - m.r} y1={ys(-ac.ci)} y2={ys(-ac.ci)} stroke={pal.c[3]} strokeDasharray="4 4" />
          {ac.vals.map((v, i) => <Bar key={i} x={xs(i + 1)} width={xs.bandwidth()} y={Math.min(ys(v), ys(0))} height={Math.abs(ys(v) - ys(0))} rx="3" fill={Math.abs(v) > ac.ci ? pal.c[2] : pal.c[5]} />)}
          <AxisBottom top={H - m.t - m.b} scale={xs} tickValues={[1, 3, 6, 9, 12, 18, 24]} stroke={pal.grid} tickStroke={pal.grid} tickLabelProps={{ fill: pal.muted, fontSize: 11, textAnchor: 'middle' }} label={L('rezago (meses)', 'lag (months)')} labelProps={{ fill: pal.muted, fontSize: 11, textAnchor: 'middle' }} />
          <AxisLeft scale={ys} numTicks={5} stroke={pal.grid} tickStroke={pal.grid} tickLabelProps={{ fill: pal.muted, fontSize: 11, textAnchor: 'end', dx: -4, dy: 3 }} />
        </Group></svg>
        <Note>{L('Barras rosadas salen de la banda ±1,96/√n: hay memoria en la serie. Por eso aplicamos TFPW antes de Mann-Kendall.', 'Pink bars exceed the ±1.96/√n band: the series has memory. That is why we apply TFPW before Mann-Kendall.')}</Note>
      </div>
      <div>
        <h4 className="sh">{L('Pendiente de Sen móvil (ventanas de 15 años) con D3', 'Rolling Sen slope (15-yr windows) with D3')}</h4>
        <svg width="100%" viewBox={`0 0 ${w} ${H}`}>
          <line x1={m.l} x2={w - m.r} y1={sy(0)} y2={sy(0)} stroke={pal.c[2]} strokeDasharray="4 4" />
          <path d={area(roll)} fill="rgba(167,139,250,.25)" /><path d={line(roll)} fill="none" stroke={pal.c[1]} strokeWidth="3" />
          {sx.ticks(5).map((t) => <text key={t} x={sx(t)} y={H - 10} textAnchor="middle" fontSize="11" fill={pal.muted}>{t}</text>)}
          {sy.ticks(4).map((t) => <text key={t} x={m.l - 6} y={sy(t) + 4} textAnchor="end" fontSize="11" fill={pal.muted}>{t.toFixed(2)}</text>)}
        </svg>
        <Note>{L('Si la banda queda por encima de 0 en todas las ventanas, la tendencia es persistente, no un tramo aislado.', 'If the band stays above 0 in every window, the trend is persistent, not an isolated stretch.')}</Note>
      </div>
    </div>
  );
}

function Relations({ cur, res, pal, L, lang }) {
  const others = res.list.filter((x) => x.k !== cur.k), [bk, setBk] = useState(others[0]?.k);
  const B = res.list.find((x) => x.k === bk) || others[0];
  const keys = res.list.map((x) => x.k);
  const hm = keys.map((a) => ({ id: a, data: keys.map((b) => ({ x: b, y: +pearson(res.list.find((z) => z.k === a).r.y, res.list.find((z) => z.k === b).r.y).toFixed(2) })) }));
  if (!B) return <p className="sub">{L('Elige 2 o más variables en el asistente para ver relaciones.', 'Pick 2 or more variables in the wizard to see relationships.')}</p>;
  const n = Math.min(cur.r.y.length, B.r.y.length), xa = B.r.y.slice(0, n), ya = cur.r.y.slice(0, n), ol = olsBand(xa, ya);
  const srt = [...xa.keys()].sort((a, b) => xa[a] - xa[b]);
  return (
    <div className="two">
      <div style={{ height: 380 }}>
        <h4 className="sh">{L('Matriz de correlación (Nivo)', 'Correlation matrix (Nivo)')}</h4>
        <div style={{ height: 330 }}><ResponsiveHeatMap data={hm} margin={{ top: 40, right: 20, bottom: 10, left: 90 }} axisTop={{ tickRotation: -30 }} axisLeft={{}} colors={{ type: 'diverging', scheme: 'red_yellow_blue', divergeAt: 0.5, minValue: 1, maxValue: -1 }} labelTextColor={(c) => (Math.abs(c.value) > 0.6 ? '#ffffff' : '#111111')} borderRadius={6} borderWidth={2} borderColor="rgba(0,0,0,0)" theme={{ text: { fill: pal.muted }, axis: { ticks: { text: { fill: pal.muted, fontSize: 11 } } }, tooltip: { container: { background: pal.card, color: pal.ink } } }} animate /></div>
      </div>
      <div>
        <h4 className="sh">{L('Dispersión + regresión', 'Scatter + regression')} <Select size="xs" w={190} display="inline-block" ml={8} data={others.map((o) => ({ value: o.k, label: V[o.k][lang][0] }))} value={B.k} onChange={setBk} allowDeselect={false} /></h4>
        <Suspense fallback={<Wait />}><P pal={pal} h={330} data={[
          { x: xa, y: ya, type: 'scattergl', mode: 'markers', marker: { color: pal.c[5], size: 5, opacity: 0.55 }, name: L('Meses', 'Months') },
          { x: srt.map((i) => xa[i]), y: srt.map((i) => ol.fit[i]), type: 'scatter', mode: 'lines', line: { color: pal.c[3], width: 3 }, name: `R² = ${ol.r2.toFixed(2)}` },
        ]} layout={{ xaxis: { title: `${V[B.k][lang][0]} (${L('anomalía', 'anomaly')})`, gridcolor: pal.grid }, yaxis: { title: `${V[cur.k][lang][0]} (${L('anomalía', 'anomaly')})`, gridcolor: pal.grid } }} /></Suspense>
        <Note>{L('Correlación no es causalidad: úsala para plantear hipótesis.', 'Correlation is not causation: use it to form hypotheses.')}</Note>
      </div>
    </div>
  );
}

function Robust({ cur, pal, L }) {
  const { r } = cur, an = r.annual;
  const boot = useMemo(() => (an ? A.bootstrapSen(an.years, an.y, 500) : null), [an]);
  const k = an ? Math.max(5, Math.floor(an.y.length / 3)) : 0;
  const w = an ? A.welch(an.y.slice(0, k), an.y.slice(-k)) : null, mw = an ? A.mannWhitney(an.y.slice(0, k), an.y.slice(-k)) : null;
  const ex = useMemo(() => A.extremes(cur.raw, 2), [cur.raw]);
  const decs = Object.keys(ex.byDec);
  const o = { textStyle: { color: pal.muted }, tooltip: { trigger: 'axis' }, legend: { textStyle: { color: pal.muted }, top: 0 }, grid: { left: 40, right: 10, top: 34, bottom: 24 }, xAxis: { type: 'category', data: decs.map((d) => d + 's') }, yAxis: { type: 'value', splitLine: { lineStyle: { color: pal.grid } } },
    series: [{ name: L('Muy alto (z>2)', 'Very high (z>2)'), type: 'bar', stack: 'a', data: decs.map((d) => ex.byDec[d].hot), itemStyle: { color: pal.warm, borderRadius: [4, 4, 0, 0] } }, { name: L('Muy bajo (z<−2)', 'Very low (z<−2)'), type: 'bar', stack: 'a', data: decs.map((d) => ex.byDec[d].cold), itemStyle: { color: pal.cool } }] };
  if (!an) return null;
  const smk = A.seasonalMK(cur.raw), ytd = A.yearsToDetect(r.x, r.y);
  return (
    <div className="two">
      <div style={{ gridColumn: '1 / -1' }}>
        <div className="kpis">
          <div className="kpi"><span>{L('Mann-Kendall estacional (p)', 'Seasonal Mann-Kendall (p)')}</span><b>{f(smk.p)}</b></div>
          <div className="kpi"><span>{L('Años necesarios para detectar esta tendencia', 'Years needed to detect this trend')}</span><b>{isFinite(ytd.n) ? Math.round(ytd.n) : '—'}</b></div>
          <div className="kpi"><span>{L('Años que tenemos', 'Years we have')}</span><b>{Math.round(ytd.have)}</b></div>
          <div className="kpi"><span>{L('Veredicto de longitud', 'Record-length verdict')}</span><b style={{ color: ytd.have >= ytd.n ? 'var(--ok)' : '#c2410c' }}>{ytd.have >= ytd.n ? L('Suficiente', 'Enough') : L(`Faltan ~${Math.round(ytd.n - ytd.have)} años`, `~${Math.round(ytd.n - ytd.have)} more years`)}</b></div>
        </div>
        <Note>{L('Una tendencia puede ser real y aún no ser significativa: a veces solo falta más tiempo de datos. Estimación con la fórmula de Weatherhead et al. (1998), que depende del ruido y de la memoria de la serie.', 'A trend can be real and not yet significant: sometimes it only needs a longer record. Estimated with Weatherhead et al. (1998), which depends on noise and series memory.')}</Note>
      </div>
      <div>
        <h4 className="sh">{L('Bootstrap en bloques de la pendiente (500 réplicas)', 'Block bootstrap of the slope (500 replicates)')}</h4>
        <PlotView deps={[boot, pal]} build={(Plot, wd) => Plot.plot({ width: wd, height: 250, style: { background: 'transparent', color: pal.muted }, y: { grid: true }, x: { label: `${V[cur.k].u} / ${L('década', 'decade')}` }, marks: [Plot.rectY(boot.vals, Plot.binX({ y: 'count' }, { x: (d) => d, fill: pal.c[1], fillOpacity: 0.8, thresholds: 24 })), Plot.ruleX([0], { stroke: pal.c[2], strokeWidth: 2 }), Plot.ruleX([boot.lo, boot.hi], { stroke: pal.c[3], strokeDasharray: '4 3' }), Plot.ruleX([boot.est], { stroke: pal.c[0], strokeWidth: 2 })] })} />
        <Note>IC 95 % bootstrap: <b>[{f(boot.lo)}, {f(boot.hi)}]</b> · {L('estimado de Sen', 'Sen estimate')}: <b>{f(boot.est)}</b> · {boot.lo * boot.hi > 0 ? L('no incluye 0: tendencia robusta', 'excludes 0: robust trend') : L('incluye 0: cuidado', 'includes 0: be careful')}</Note>
      </div>
      <div>
        <h4 className="sh">{L('Primer vs último tercio de años', 'First vs last third of years')}</h4>
        <div className="kpis">
          <div className="kpi"><span>{L('Diferencia de medias', 'Mean difference')}</span><b>{f(w.diff, V[cur.k].d)} {V[cur.k].u}</b></div>
          <div className="kpi"><span>t de Welch (p)</span><b>{f(w.t, 2)} ({f(w.p)})</b></div>
          <div className="kpi"><span>Mann-Whitney (p)</span><b>{f(mw.p)}</b></div>
          <div className="kpi"><span>d de Cohen</span><b>{f(w.d, 2)}</b></div>
          <div className="kpi"><span>{L('Prob. de superioridad', 'Prob. of superiority')}</span><b>{f(mw.cles, 2)}</b></div>
        </div>
        <Note>{L('Compara dos épocas con una prueba paramétrica y otra no paramétrica; el tamaño del efecto (d) dice cuánto, no solo si.', 'Compares two eras with a parametric and a non-parametric test; effect size (d) says how much, not just whether.')}</Note>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <h4 className="sh">{L('Eventos extremos por década (|z| > 2)', 'Extreme events per decade (|z| > 2)')}</h4>
        <EChart option={o} deps={[cur.raw, pal]} h={260} />
      </div>
    </div>
  );
}

function Summary({ cur, res, L, lang }) {
  const an = deseason(cur.raw), ds = A.describe(cur.raw.map((p) => p.v)), da = A.describe(an);
  const rows = [[L('n (meses)', 'n (months)'), ds.n, da.n], [L('Media', 'Mean'), f(ds.mean), f(da.mean)], [L('Desv. estándar', 'Std. dev.'), f(ds.sd), f(da.sd)], ['CV', f(ds.cv, 2), '—'], [L('Mínimo', 'Min'), f(ds.min), f(da.min)], ['Q1', f(ds.q1), f(da.q1)], [L('Mediana', 'Median'), f(ds.median), f(da.median)], ['Q3', f(ds.q3), f(da.q3)], [L('Máximo', 'Max'), f(ds.max), f(da.max)], [L('Asimetría', 'Skew'), f(ds.skew, 2), f(da.skew, 2)], [L('Curtosis exc.', 'Ex. kurtosis'), f(ds.kurt, 2), f(da.kurt, 2)], ['Jarque-Bera p', f(ds.pJB), f(da.pJB)]];
  const json = () => { const o = res.list.map((x) => ({ variable: x.k, perDecade: x.r.perDec, p_mk: x.r.mk.p, p_ols: x.r.ols.p, level: x.r.level })); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(o, null, 2)], { type: 'application/json' })); a.download = 'resultados.json'; a.click(); };
  return (
    <>
      <Table withTableBorder={false} verticalSpacing={4} fz="sm"><Table.Thead><Table.Tr><Table.Th>{L('Estadístico', 'Statistic')}</Table.Th><Table.Th>{L('Serie original', 'Raw series')}</Table.Th><Table.Th>{L('Anomalías', 'Anomalies')}</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{rows.map((r) => <Table.Tr key={r[0]}><Table.Td>{r[0]}</Table.Td><Table.Td>{r[1]}</Table.Td><Table.Td>{r[2]}</Table.Td></Table.Tr>)}</Table.Tbody></Table>
      <button className="linkbtn" onClick={json}>{L('Descargar resultados (JSON)', 'Download results (JSON)')}</button>
    </>
  );
}

function Periods({ cur, pal, L }) {
  const an = cur.r.annual; if (!an) return null;
  const S = useMemo(() => A.sensitivity(an.years, an.y, 10), [an]);
  const mx = Math.max(...S.map((d) => Math.abs(d[2]))) || 1, pos = S.filter((d) => d[2] > 0).length, sig = S.filter((d) => d[3]).length, opp = S.filter((d) => d[3] && Math.sign(d[2]) !== Math.sign(cur.r.perDec)).length;
  const o = { textStyle: { color: pal.muted }, tooltip: { formatter: (p) => `${p.value[0]}–${p.value[1]}: ${p.value[2].toFixed(3)} ${V[cur.k].u}/${L('década', 'decade')}${p.data.sig ? ' · p<0.05' : ''}` }, grid: { left: 50, right: 16, top: 10, bottom: 96 },
    xAxis: { type: 'category', data: an.years, name: L('Año inicial', 'Start year'), nameLocation: 'middle', nameGap: 26 }, yAxis: { type: 'category', data: an.years, name: L('Año final', 'End year') },
    visualMap: { min: -mx, max: mx, dimension: 2, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: ['#1e40af', '#93b4f0', '#f7f4ec', '#f0a070', '#c2410c'] }, textStyle: { color: pal.muted } },
    series: [{ type: 'heatmap', data: S.map((d) => ({ value: [String(d[0]), String(d[1]), d[2]], sig: d[3], itemStyle: { opacity: d[3] ? 1 : 0.35 } })) }] };
  return (<>
    <h4 className="sh">{L('Todas las tendencias posibles según año inicial y final (10 años o más)', 'Every possible trend by start and end year (10+ years)')}</h4>
    <EChart option={o} deps={[S, pal]} h={460} />
    <div className="kpis" style={{ marginTop: 8 }}>
      <div className="kpi"><span>{L('Periodos analizados', 'Periods analysed')}</span><b>{S.length}</b></div>
      <div className="kpi"><span>{L('Con signo positivo', 'With positive sign')}</span><b>{Math.round((pos / S.length) * 100)} %</b></div>
      <div className="kpi"><span>{L('Significativos', 'Significant')}</span><b>{Math.round((sig / S.length) * 100)} %</b></div>
      <div className="kpi"><span>{L('Significativos con signo contrario', 'Significant with opposite sign')}</span><b>{opp}</b></div>
    </div>
    <Note>{L('Celdas tenues = no significativas. Si eligiendo otros años cambia el signo, cuidado: los periodos cortos engañan (Liebmann et al., 2010). Así nadie puede “escoger” los años que le convienen.', 'Faint cells = not significant. If other years flip the sign, be careful: short periods mislead (Liebmann et al., 2010). Nobody can cherry-pick convenient years.')}</Note>
  </>);
}

function Daily({ cur, res, pal, L }) {
  const [d, setD] = useState(null); const [busy, setBusy] = useState(false); const [fail, setFail] = useState(false); const [live, setLive] = useState(false);
  const load = async () => {
    setBusy(true); let x = null, lv = false; const y0 = cur.raw[0].year, y1 = cur.raw[cur.raw.length - 1].year;
    if (res.live && res.pl.id !== 'csv') { try { x = await powerDaily(res.pl.lat, res.pl.lon, cur.k, y0, y1); lv = x.length > 0; } catch { x = null; } }
    if (!x || !x.length) x = demoDaily(res.pl.lat, res.pl.lon, cur.k, y0, y1);
    const t = x.map((p) => p.t), v = x.map((p) => p.v), roll = []; let s = 0; for (let i = 0; i < v.length; i++) { s += v[i]; if (i >= 365) s -= v[i - 365]; if (i >= 364) roll.push(s / 365); }
    setD({ t, v, roll }); setLive(lv); setBusy(false);
  };
  if (cur.k === 'CSV') return <p className="sub">{L('Disponible para variables de NASA POWER.', 'Available for NASA POWER variables.')}</p>;
  return (<>
    <h4 className="sh">{L('Datos diarios con SciChart (WebGL): miles de puntos sin perder fluidez', 'Daily data with SciChart (WebGL): thousands of points, still smooth')}</h4>
    {!d && <Button color="navy" loading={busy} leftSection={<IconBolt size={16} />} onClick={load}>{L('Cargar serie diaria', 'Load daily series')}</Button>}
    {d && !fail && <Suspense fallback={<Wait />}><Sci t={d.t} v={d.v} roll={d.roll} unit={V[cur.k].u} onFail={() => setFail(true)} /></Suspense>}
    {d && fail && <Suspense fallback={<Wait />}><P pal={pal} h={380} data={[{ x: d.t.map((s) => new Date(s * 1000)), y: d.v, type: 'scattergl', mode: 'lines', line: { color: '#1e3a8a', width: 1 }, name: L('Diario', 'Daily') }]} layout={{}} /></Suspense>}
    {d && (() => { const n = d.v.length, from = Math.max(0, n - 365 * 3), sl = d.v.slice(from), mu = sl.reduce((a, b) => a + b, 0) / sl.length, data = sl.map((v, i) => ({ day: new Date(d.t[from + i] * 1000).toISOString().slice(0, 10), value: +(v - mu).toFixed(2) })), mx = Math.max(...data.map((x) => Math.abs(x.value)));
      return (<><h4 className="sh">{L('Calendario de los últimos 3 años (Nivo): cada cuadro es un día', 'Calendar of the last 3 years (Nivo): each cell is a day')}</h4>
        <div style={{ height: 420 }}><ResponsiveCalendar data={data} from={data[0].day} to={data[data.length - 1].day} minValue={-mx} maxValue={mx} emptyColor="#eef2f7" colors={['#1e40af', '#6f93e0', '#c9d7f8', '#f7f4ec', '#f3c9a8', '#e0803f', '#c2410c']} margin={{ top: 20, right: 10, bottom: 10, left: 30 }} yearSpacing={36} monthBorderColor="#ffffff" dayBorderWidth={1} dayBorderColor="#ffffff" theme={{ text: { fill: '#5b6b8c' } }} /></div></>); })()}
    {d && <Note><b>{d.v.length.toLocaleString()}</b> {L('días', 'days')} · {live ? 'NASA POWER' : L('datos de práctica', 'practice data')} · {L('línea naranja: media móvil de 365 días. Arrastra para ampliar, rueda para zoom, doble clic para volver.', 'orange line: 365-day moving mean. Drag to zoom, wheel to zoom, double-click to reset.')}</Note>}
  </>);
}

function Validation({ cur, pal, L }) {
  const [st, setSt] = useState(null); const [sim, setSim] = useState(false); const [err, setErr] = useState('');
  const onFile = async (e) => { const fl = e.target.files?.[0]; if (!fl) return; const pts = parseCsv(await fl.text()); if (pts.length < 12) { setErr(L('No se encontraron al menos 12 meses con fecha y valor.', 'Fewer than 12 months with date and value were found.')); return; } setErr(''); setSim(false); setSt(pts); };
  const sample = () => { let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647); setSim(true); setSt(cur.raw.filter((p) => p.year >= 1995).map((p) => ({ ...p, v: p.v * 0.94 + 0.4 + (rnd() - 0.5) * 0.6 * (Math.abs(p.v) * 0.1 + 0.3) }))); };
  const v = st ? A.validate(cur.raw, st) : null;
  return (<>
    <h4 className="sh">{L('Compara el dato satelital/modelo con una estación en tierra', 'Compare the satellite/model value with a ground station')}</h4>
    <p className="mini" style={{ fontSize: 14 }}>{L(`Esta variable viene de ${sourceOf(cur.k)} (rejilla de ~50 km). Sube un CSV mensual o diario de una estación (SENAMHI, Climate Data Online) para medir cuánto se parece.`, `This variable comes from ${sourceOf(cur.k)} (~50 km grid). Upload a monthly or daily station CSV (SENAMHI, Climate Data Online) to measure how close it is.`)}</p>
    <div className="row"><Button component="label" color="forest" leftSection={<IconUpload size={16} />}>{L('Subir CSV de estación', 'Upload station CSV')}<input type="file" accept=".csv,.txt" hidden onChange={onFile} /></Button><Button variant="default" onClick={sample}>{L('Ver un ejemplo simulado', 'See a simulated example')}</Button></div>
    {err && <Alert color="orange" mt="sm" radius="lg">{err}</Alert>}
    {st && !v && <Alert color="orange" mt="sm" radius="lg">{L('Las fechas de la estación no coinciden con la serie (se necesitan 12 meses en común).', 'Station dates do not overlap the series (12 common months needed).')}</Alert>}
    {v && (<>
      {sim && <Alert color="blue" mt="sm" radius="lg">{L('Ejemplo simulado: no es una estación real.', 'Simulated example: not a real station.')}</Alert>}
      <div className="kpis" style={{ marginTop: 10 }}>
        <div className="kpi"><span>{L('Meses en común', 'Common months')}</span><b>{v.n}</b></div>
        <div className="kpi"><span>{L('Sesgo (modelo − estación)', 'Bias (model − station)')}</span><b>{f(v.bias, 2)} {V[cur.k].u}</b></div>
        <div className="kpi"><span>RMSE</span><b>{f(v.rmse, 2)} {V[cur.k].u}</b></div>
        <div className="kpi"><span>{L('Correlación', 'Correlation')}</span><b>{f(v.r, 2)}</b></div>
        <div className="kpi"><span>{L('Tendencia modelo / estación', 'Trend model / station')}</span><b>{f(v.slopeA, 2)} / {f(v.slopeB, 2)}</b></div>
      </div>
      <Suspense fallback={<Wait />}><P pal={pal} h={340} data={[{ x: v.B, y: v.A, type: 'scattergl', mode: 'markers', marker: { color: pal.c[1], size: 6, opacity: 0.6 }, name: L('Meses', 'Months') }, { x: [Math.min(...v.B), Math.max(...v.B)], y: [Math.min(...v.B), Math.max(...v.B)], mode: 'lines', line: { color: pal.c[2], dash: 'dash' }, name: '1:1' }]} layout={{ xaxis: { title: L('Estación', 'Station'), gridcolor: pal.grid }, yaxis: { title: sourceOf(cur.k), gridcolor: pal.grid } }} /></Suspense>
      <Note>{Math.sign(v.slopeA) === Math.sign(v.slopeB) ? L('Las dos fuentes coinciden en el signo de la tendencia: la conclusión es más confiable.', 'Both sources agree on the trend sign: the conclusion is more reliable.') : L('Las fuentes no coinciden en el signo: confía más en la estación y revisa el punto.', 'Sources disagree on sign: trust the station more and review the point.')}</Note>
    </>)}
  </>);
}

export default function Analytics({ cur, res }) {
  const { lang } = useT(); const pal = usePal(); const L = (a, b) => (lang === 'es' ? a : b);
  const G = [
    [L('Tendencia', 'Trend'), [['series', IconChartLine, L('Serie y descomposición', 'Series & decomposition'), Series], ['per', IconCalendarTime, L('Todos los periodos', 'All periods'), Periods], ['rob', IconShieldCheck, L('Robustez', 'Robustness'), Robust]]],
    [L('Forma y estaciones', 'Shape & seasons'), [['dist', IconChartHistogram, L('Distribución', 'Distribution'), Distribution], ['seas', IconCalendarStats, L('Ciclo estacional', 'Seasonal cycle'), Seasonal]]],
    [L('Relaciones', 'Relations'), [['rel', IconGitCompare, L('Entre variables', 'Between variables'), Relations], ['mem', IconRipple, L('Memoria', 'Memory'), Memory]]],
    [L('Datos', 'Data'), [['day', IconBolt, L('Serie diaria', 'Daily series'), Daily], ['val', IconRuler2, L('Validar con estación', 'Validate with station'), Validation], ['sum', IconTable, L('Tabla resumen', 'Summary table'), Summary]]],
  ];
  const [g, setG] = useState('0'); const [tab, setTab] = useState('series');
  const tabs = G[+g][1], act = tabs.find((x) => x[0] === tab) || tabs[0], C = act[3];
  return (
    <div>
      <SegmentedControl fullWidth color="forest" value={g} onChange={(v) => { setG(v); setTab(G[+v][1][0][0]); }} data={G.map((x, i) => ({ label: x[0], value: String(i) }))} />
      <div className="subtabs">{tabs.map(([v, I, l]) => <button key={v} className={act[0] === v ? 'on' : ''} onClick={() => setTab(v)}><I size={15} />{l}</button>)}</div>
      <div key={act[0] + cur.k} style={{ paddingTop: 12 }}><C cur={cur} res={res} pal={pal} L={L} lang={lang} /></div>
    </div>
  );
}
