import { lazy, Suspense, useMemo, useState } from 'react';
import { Button, Select, Slider, Table, Alert, Loader, Progress } from '@mantine/core';
import { IconFlask, IconDatabase, IconMountain, IconMapPins, IconDropletSearch, IconUpload, IconCalculator, IconRuler2, IconMapPin } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as S from '../lib/stats';
import { bh } from '../lib/advanced';
import { V, power, demo } from '../lib/data';
import { LAKES, TYPES, BANDS, band, SAMPLE_POINTS, km, parsePoints } from '../lib/lakes';
import { useStore } from '../store';
import { useT } from '../i18n';
import { usePal } from '../palette';
import { PlotView, EChart, olsBand } from './charts/hooks';
import LakeMap from './LakeMap';
import CountUp from '../rb/CountUp';
const P = lazy(() => import('./charts/Plotly'));
const Wait = () => <div style={{ padding: 30, textAlign: 'center' }}><Loader size="sm" color="forest" /></div>;
const cdf = (x, m, s) => { const z = (x - m) / (s * Math.SQRT2), t = 1 / (1 + 0.3275911 * Math.abs(z)), e = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z); return 0.5 * (1 + (z >= 0 ? e : -e)); };
const pdf = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));

function Inventory({ L, lang, setLake, lake }) {
  const rows = [...LAKES].sort((a, b) => b.area - a.area);
  const sun = useMemo(() => { const by = {}; LAKES.forEach((l) => { by[l.vert] = by[l.vert] || {}; by[l.vert][l.type] = (by[l.vert][l.type] || 0) + 1; }); return Object.entries(by).map(([v, ty]) => ({ name: v, children: Object.entries(ty).map(([k, n]) => ({ name: TYPES[k][lang === 'es' ? 0 : 1], value: n, itemStyle: { color: TYPES[k][2] } })) })); }, [lang]);
  const o = { tooltip: { trigger: 'item' }, series: [{ type: 'sunburst', data: sun, radius: ['18%', '92%'], itemStyle: { borderColor: '#fff', borderWidth: 2 }, label: { fontSize: 11, color: '#fff' }, levels: [{}, { itemStyle: { color: '#1e3a8a' }, label: { rotate: 'tangential' } }, {}], emphasis: { focus: 'ancestor' } }] };
  return (
    <div className="two">
      <div><h4 className="sh">{L('Altitud y tamaño de cada lago (pasa el cursor)', 'Altitude and size of each lake (hover)')}</h4>
        <PlotView deps={[lang]} h={330} build={(Plot, w) => Plot.plot({ width: w, height: 330, marginLeft: 50, style: { background: 'transparent', color: '#5b6b8c' }, x: { type: 'log', label: L('Área (km², escala log)', 'Area (km², log scale)'), grid: true }, y: { label: L('Altitud (m)', 'Altitude (m)'), grid: true }, color: { domain: Object.keys(TYPES), range: Object.values(TYPES).map((x) => x[2]) },
          marks: [Plot.ruleY([2000, 4000], { stroke: '#9fb3a6', strokeDasharray: '4 4' }), Plot.dot(LAKES, { x: 'area', y: 'alt', fill: 'type', r: 6, fillOpacity: 0.8, stroke: '#fff', tip: true, title: (d) => `${d.name}\n${d.alt} m · ${d.area} km² · ${d.dep}` })] })} />
        <p className="mini">{L('Las líneas punteadas separan las tres franjas de altitud que usamos en todo el módulo.', 'Dashed lines split the three altitude bands used across the module.')}</p></div>
      <div><h4 className="sh">{L('Vertiente y tipo (número de lagos)', 'Drainage basin and type (number of lakes)')}</h4><EChart option={o} deps={[lang]} h={330} /></div>
      <div style={{ gridColumn: '1 / -1' }}><h4 className="sh">{L('Inventario de referencia', 'Reference inventory')}</h4>
        <div className="tablewrap"><Table fz="sm" verticalSpacing={4} highlightOnHover stickyHeader><Table.Thead><Table.Tr><Table.Th>{L('Nombre', 'Name')}</Table.Th><Table.Th>{L('Región', 'Region')}</Table.Th><Table.Th>{L('Tipo', 'Type')}</Table.Th><Table.Th>{L('Altitud (m)', 'Altitude (m)')}</Table.Th><Table.Th>{L('Área (km²)', 'Area (km²)')}</Table.Th><Table.Th>{L('Vertiente', 'Basin')}</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>{rows.map((l) => <Table.Tr key={l.id} onClick={() => setLake(l.id)} style={{ cursor: 'pointer', background: l.id === lake ? '#e6f5ef' : undefined }}><Table.Td><i className="dot" style={{ background: TYPES[l.type][2] }} />{l.name}</Table.Td><Table.Td>{l.dep}</Table.Td><Table.Td>{TYPES[l.type][lang === 'es' ? 0 : 1]}</Table.Td><Table.Td>{l.alt}</Table.Td><Table.Td>{l.area}</Table.Td><Table.Td>{l.vert}</Table.Td></Table.Tr>)}</Table.Tbody></Table></div>
        <p className="mini">{L('Valores aproximados de referencia para el prototipo. Para uso oficial se reemplaza por el inventario de la ANA y de INAIGEM (el archivo es src/lib/lakes.js).', 'Approximate reference values for the prototype. For official use replace with the ANA and INAIGEM inventories (file src/lib/lakes.js).')}</p></div>
    </div>
  );
}

function AltTrend({ L, lang, pal }) {
  const practice = useStore((s) => s.practice);
  const [k, setK] = useState('T2M'); const [prog, setProg] = useState(null); const [res, setRes] = useState(null);
  const run = async () => {
    const out = []; let live = !practice, done = 0; setProg(0); const q = [...LAKES];
    const one = async (l) => { let d; if (live) { try { d = (await power(l.lat, l.lon, [k], 1981, 2025))[k]; } catch { live = false; } } if (!d) d = demo(l.lat, l.lon, [k], 1981, 2025)[k];
      try { const r = S.analyze(d, {}); out.push({ ...l, perDec: r.perDec, p: r.p }); } catch { /* corta */ } setProg(Math.round((++done / LAKES.length) * 100)); };
    await Promise.all(Array.from({ length: 4 }, async () => { while (q.length) await one(q.shift()); }));
    const sig = bh(out.map((o) => o.p)); out.forEach((o, i) => { o.fdr = sig[i]; }); setRes({ k, live, list: out }); setProg(null);
  };
  const R = res && res.k === k ? res : null;
  const fit = R ? olsBand(R.list.map((d) => d.alt), R.list.map((d) => d.perDec)) : null, ofit = R ? S.ols(R.list.map((d) => d.alt), R.list.map((d) => d.perDec)) : null;
  const srt = R ? [...R.list].sort((a, b) => a.alt - b.alt) : [];
  const box = R ? [0, 1, 2].map((b) => { const v = R.list.filter((d) => band(d.alt) === b).map((d) => d.perDec).sort((a, c) => a - c); if (!v.length) return [0, 0, 0, 0, 0]; const q = (p) => v[Math.min(v.length - 1, Math.floor(p * (v.length - 1) + 0.5))]; return [v[0], q(0.25), q(0.5), q(0.75), v[v.length - 1]]; }) : null;
  const ob = R && { textStyle: { color: '#5b6b8c' }, tooltip: { trigger: 'item' }, grid: { left: 54, right: 12, top: 12, bottom: 28 }, xAxis: { type: 'category', data: BANDS[lang] }, yAxis: { type: 'value', scale: true, splitLine: { lineStyle: { color: '#eef2f7' } } }, series: [{ type: 'boxplot', data: box, itemStyle: { color: 'rgba(12,90,67,.18)', borderColor: '#0c5a43' } }] };
  return (<>
    <div className="row" style={{ alignItems: 'flex-end' }}>
      <Select w={260} label={L('Variable', 'Variable')} data={['T2M', 'TS', 'PRECTOTCORR', 'EVLAND', 'GWETROOT'].map((x) => ({ value: x, label: V[x][lang][0] }))} value={k} onChange={setK} allowDeselect={false} />
      <Button color="forest" loading={prog != null} leftSection={<IconCalculator size={16} />} onClick={run}>{L('Calcular en todos los lagos', 'Compute for all lakes')}</Button>
    </div>
    {prog != null && <Progress value={prog} color="forest" mt={8} animated />}
    {!R && prog == null && <p className="sub" style={{ marginTop: 12 }}>{L('Calcula la tendencia de una variable en todos los lagos del inventario y descubre si depende de la altitud. Así la altitud entra en el análisis en vez de ignorarse.', 'Compute a variable’s trend at every lake in the inventory and find out whether it depends on altitude. Altitude becomes part of the analysis instead of being ignored.')}</p>}
    {R && (<div className="two" style={{ marginTop: 10 }}>
      <div><h4 className="sh">{L('Tendencia por década según la altitud', 'Trend per decade against altitude')}</h4>
        <Suspense fallback={<Wait />}><P pal={pal} h={340} data={[
          ...Object.keys(TYPES).map((ty) => { const g = R.list.filter((d) => d.type === ty); return { x: g.map((d) => d.alt), y: g.map((d) => d.perDec), text: g.map((d) => `${d.name}<br>p = ${d.p < 0.001 ? '<0.001' : d.p.toFixed(3)}${d.fdr ? ' · FDR' : ''}`), mode: 'markers', type: 'scatter', name: TYPES[ty][lang === 'es' ? 0 : 1], marker: { color: TYPES[ty][2], size: g.map((d) => 9 + Math.log10(d.area + 1) * 5), opacity: g.map((d) => (d.fdr ? 0.95 : 0.35)), line: { color: '#fff', width: 1 } }, hovertemplate: '%{text}<br>%{x} m · %{y:.3f}<extra></extra>' }; }),
          { x: srt.map((d) => d.alt), y: srt.map((d) => fit.a + fit.b * d.alt), mode: 'lines', name: `R² = ${fit.r2.toFixed(2)}`, line: { color: '#14213d', dash: 'dash', width: 2 } }]}
          layout={{ xaxis: { title: L('Altitud (m)', 'Altitude (m)'), gridcolor: pal.grid }, yaxis: { title: `${V[k].u} / ${L('década', 'decade')}`, gridcolor: pal.grid, zerolinecolor: '#9aa' } }} /></Suspense></div>
      <div><h4 className="sh">{L('Por franja de altitud', 'By altitude band')}</h4><EChart option={ob} deps={[R, lang]} h={300} />
        <div className="kpis"><div className="kpi"><span>{L('Cambio de la tendencia por cada 1000 m', 'Trend change per 1000 m')}</span><b>{(fit.b * 1000).toFixed(3)} {V[k].u}</b></div><div className="kpi"><span>{L('¿Depende de la altitud? (p)', 'Depends on altitude? (p)')}</span><b style={{ color: ofit.p < 0.05 ? '#0c5a43' : '#868e96' }}>{ofit.p < 0.001 ? '< 0.001' : ofit.p.toFixed(3)}</b></div><div className="kpi"><span>{L('Lagos con tendencia significativa (FDR)', 'Lakes with significant trend (FDR)')}</span><b>{R.list.filter((d) => d.fdr).length} / {R.list.length}</b></div></div></div>
      <p className="mini" style={{ gridColumn: '1 / -1' }}>{ofit.p < 0.05 ? L('La tendencia cambia con la altitud: conviene analizar cada franja por separado.', 'The trend changes with altitude: each band should be analysed separately.') : L('No se ve una dependencia clara con la altitud en esta variable.', 'No clear altitude dependence for this variable.')} {L('Puntos tenues: no significativos tras la corrección por pruebas múltiples.', 'Faint points: not significant after multiple-testing correction.')} {!R.live && L('Datos de práctica (simulados).', 'Practice (simulated) data.')}</p>
    </div>)}
  </>);
}

function Coverage({ L, lang, points, setPoints, radius, setRadius, stats, custom, setCustom }) {
  const onFile = async (e) => { const f = e.target.files?.[0]; if (!f) return; const p = parsePoints(await f.text()); if (p.length) { setPoints(p); setCustom(f.name); } };
  const ob = { textStyle: { color: '#5b6b8c' }, tooltip: { trigger: 'axis' }, grid: { left: 44, right: 12, top: 14, bottom: 28 }, xAxis: { type: 'category', data: BANDS[lang] }, yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value} %' }, splitLine: { lineStyle: { color: '#eef2f7' } } }, series: [{ type: 'bar', data: stats.byBand.map((v) => ({ value: Math.round(v), itemStyle: { color: v >= 60 ? '#0c5a43' : v >= 30 ? '#d97706' : '#dc2626', borderRadius: [8, 8, 0, 0] } })), label: { show: true, position: 'top', formatter: '{c} %' }, barWidth: '45%' }] };
  return (<>
    <p className="sub">{L('¿Los puntos de monitoreo representan bien a los lagos? Mide cuántos lagos tienen un punto cerca y en qué franja de altitud faltan.', 'Do monitoring points represent the lakes well? Measure how many lakes have a point nearby and in which altitude band they are missing.')}</p>
    <Alert color={custom ? 'green' : 'blue'} radius="lg" mb="sm">{custom ? L(`Usando ${points.length} puntos del archivo ${custom}.`, `Using ${points.length} points from ${custom}.`) : L('Ejemplo: se usan 16 capitales regionales como si fueran puntos de monitoreo. No es la red oficial de la ANA. Sube el CSV oficial (columnas lat, lon) para el análisis real.', 'Example: 16 regional capitals are used as if they were monitoring points. This is not ANA’s official network. Upload the official CSV (lat, lon columns) for the real analysis.')}</Alert>
    <div className="row" style={{ alignItems: 'center', gap: 22 }}>
      <div style={{ flex: 1, minWidth: 240 }}><span className="mini">{L('Distancia que cuenta como “cerca”', 'Distance that counts as “near”')}: <b>{radius} km</b></span><Slider color="forest" min={10} max={200} step={5} value={radius} onChange={setRadius} label={null} /></div>
      <label className="textlink"><IconUpload size={14} /> {L('Subir puntos de monitoreo (CSV)', 'Upload monitoring points (CSV)')}<input type="file" accept=".csv,.txt" hidden onChange={onFile} /></label>
    </div>
    <div className="kpis" style={{ marginTop: 12 }}>
      <div className="kpi"><span>{L('Lagos con un punto cerca', 'Lakes with a nearby point')}</span><b>{Math.round(stats.cov)} %</b></div>
      <div className="kpi"><span>{L('Lagos sin cobertura', 'Uncovered lakes')}</span><b style={{ color: '#dc2626' }}>{stats.unc.length}</b></div>
      <div className="kpi"><span>{L('Distancia mediana al punto más cercano', 'Median distance to nearest point')}</span><b>{Math.round(stats.med)} km</b></div>
      <div className="kpi"><span>{L('Lago más alejado', 'Most remote lake')}</span><b>{stats.far.name} ({Math.round(stats.far.d)} km)</b></div>
    </div>
    <div className="two" style={{ marginTop: 6 }}>
      <div><h4 className="sh">{L('Cobertura por franja de altitud', 'Coverage by altitude band')}</h4><EChart option={ob} deps={[stats, lang]} h={270} /></div>
      <div><h4 className="sh">{L('Distancia de cada lago a su punto más cercano', 'Distance from each lake to its nearest point')}</h4>
        <PlotView deps={[stats, lang]} h={270} build={(Plot, w) => Plot.plot({ width: w, height: 270, style: { background: 'transparent', color: '#5b6b8c' }, x: { label: 'km' }, y: { grid: true, label: L('lagos', 'lakes') }, marks: [Plot.rectY(stats.d, Plot.binX({ y: 'count' }, { x: 'd', fill: (d) => (d.d <= radius ? '#0c5a43' : '#dc2626'), thresholds: 14, tip: true })), Plot.ruleX([radius], { stroke: '#14213d', strokeDasharray: '5 4', strokeWidth: 2 }), Plot.ruleY([0])] })} /></div>
    </div>
    {stats.unc.length > 0 && <p className="mini"><b>{L('Sin cobertura (en rojo en el mapa)', 'Uncovered (red on the map)')}:</b> {stats.unc.map((l) => l.name).join(' · ')}</p>}
  </>);
}

function Classifier({ L, lang }) {
  const [t, setT] = useState(0.2);
  // Valores ilustrativos de un índice de agua (tipo NDWI): agua vs. lo que más se confunde con agua en cada franja
  const B = [{ w: [0.5, 0.12], c: [-0.25, 0.14], cn: L('suelo y vegetación', 'soil and vegetation') }, { w: [0.42, 0.14], c: [-0.05, 0.16], cn: L('pastos húmedos y sombras', 'wet grassland and shadows') }, { w: [0.3, 0.16], c: [0.12, 0.15], cn: L('sombras, nieve y hielo', 'shadows, snow and ice') }];
  const acc = (b, th) => 0.5 * ((1 - cdf(th, b.w[0], b.w[1])) + cdf(th, b.c[0], b.c[1]));
  const best = B.map((b) => { let bt = 0, ba = 0; for (let th = -0.4; th <= 0.7; th += 0.01) { const a = acc(b, th); if (a > ba) { ba = a; bt = th; } } return [bt, ba]; });
  const xs = Array.from({ length: 111 }, (_, i) => -0.5 + i * 0.012);
  return (<>
    <p className="sub">{L('Para medir el área de un lago desde satélite se usa un índice de agua y un umbral. En la alta montaña las sombras, la nieve y el agua turbia de origen glaciar se parecen al agua. Mueve el umbral y mira qué pasa en cada franja.', 'Lake area from satellite uses a water index and a threshold. In high mountains shadows, snow and turbid glacial water look like water. Move the threshold and see what happens in each band.')}</p>
    <Alert color="blue" radius="lg" mb="sm">{L('Simulación didáctica con valores ilustrativos: muestra el problema y la solución propuesta (umbral por franja de altitud). No son mediciones.', 'Teaching simulation with illustrative values: it shows the problem and the proposed solution (one threshold per altitude band). These are not measurements.')}</Alert>
    <div style={{ maxWidth: 520 }}><span className="mini">{L('Umbral del índice de agua', 'Water-index threshold')}: <b>{t.toFixed(2)}</b></span><Slider color="navy" min={-0.2} max={0.6} step={0.01} value={t} onChange={setT} label={null} /></div>
    <div className="three">
      {B.map((b, i) => { const a = acc(b, t); const data = xs.flatMap((x) => [{ x, y: pdf(x, b.w[0], b.w[1]), g: L('Agua', 'Water') }, { x, y: pdf(x, b.c[0], b.c[1]), g: L('No agua', 'Not water') }]); return (
        <div key={i} className="clf">
          <b>{BANDS[lang][i]}</b><span className="mini">{L('Se confunde con', 'Confused with')}: {b.cn}</span>
          <PlotView deps={[t, lang]} h={170} build={(Plot, w) => Plot.plot({ width: w, height: 170, marginLeft: 8, marginBottom: 28, style: { background: 'transparent', color: '#5b6b8c' }, y: { axis: null }, x: { label: null }, color: { domain: [L('Agua', 'Water'), L('No agua', 'Not water')], range: ['#1e3a8a', '#c2410c'] }, marks: [Plot.areaY(data, { x: 'x', y1: 0, y2: 'y', fill: 'g', fillOpacity: 0.35 }), Plot.lineY(data, { x: 'x', y: 'y', stroke: 'g', strokeWidth: 1.6 }), Plot.ruleX([t], { stroke: '#14213d', strokeWidth: 2.4 }), Plot.ruleX([best[i][0]], { stroke: '#0c5a43', strokeDasharray: '4 3' })] })} />
          <div className="accbar"><motion.i animate={{ width: `${a * 100}%` }} style={{ background: a > 0.9 ? '#0c5a43' : a > 0.8 ? '#d97706' : '#dc2626' }} /></div>
          <span className="mini">{L('Acierto', 'Accuracy')}: <b>{(a * 100).toFixed(0)} %</b> · {L('mejor umbral', 'best threshold')}: <b style={{ color: '#0c5a43' }}>{best[i][0].toFixed(2)}</b> ({(best[i][1] * 100).toFixed(0)} %)</span>
        </div>); })}
    </div>
    <p className="mini">{L('Línea negra: tu umbral. Línea verde punteada: el mejor umbral de esa franja. Un solo umbral para todo el país no sirve: el óptimo cambia con la altitud, y sobre los 4000 m ni el mejor umbral basta, por eso allí conviene sumar radar (como RADARSAT) y un modelo de elevación.', 'Black line: your threshold. Dashed green: the best threshold for that band. One national threshold does not work: the optimum changes with altitude, and above 4000 m even the best threshold falls short, so radar (such as RADARSAT) and an elevation model should be added there.')}</p>
  </>);
}

export default function Lakes() {
  const { lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b); const pal = usePal();
  const { lake, setLake, openCase } = useStore();
  const [tab, setTab] = useState('inv'); const [points, setPoints] = useState(SAMPLE_POINTS); const [custom, setCustom] = useState(''); const [radius, setRadius] = useState(60);
  const cur = LAKES.find((l) => l.id === lake) || LAKES[0];
  const stats = useMemo(() => {
    const d = LAKES.map((l) => ({ ...l, d: Math.min(...points.map((p) => km(l, p))) })), unc = d.filter((x) => x.d > radius), srt = d.map((x) => x.d).sort((a, b) => a - b);
    return { d, unc, cov: (1 - unc.length / d.length) * 100, med: srt[Math.floor(srt.length / 2)], far: d.reduce((a, b) => (b.d > a.d ? b : a)), byBand: [0, 1, 2].map((b) => { const g = d.filter((x) => band(x.alt) === b); return g.length ? (g.filter((x) => x.d <= radius).length / g.length) * 100 : 0; }) };
  }, [points, radius]);
  const uncovered = useMemo(() => (tab === 'cov' ? new Set(stats.unc.map((l) => l.id)) : null), [tab, stats]);
  const near = stats.d.find((x) => x.id === cur.id);
  const T = [['inv', IconDatabase, L('Inventario', 'Inventory')], ['alt', IconMountain, L('Altitud y tendencia', 'Altitude & trend')], ['cov', IconMapPins, L('Cobertura de monitoreo', 'Monitoring coverage')], ['clf', IconDropletSearch, L('Clasificación del agua', 'Water classification')]];
  return (
    <section id="lagos"><div className="wrap">
      <h2>{L('Lagos y lagunas del Perú', 'Lakes of Peru')}</h2>
      <p className="sub">{L('Un solo lugar para el inventario, las imágenes satelitales en el tiempo, el clima de cada lago y la estadística espacial. Es nuestro prototipo de una plataforma tipo LAGOS para el Perú.', 'One place for the inventory, satellite imagery through time, each lake’s climate and spatial statistics. Our prototype of a LAGOS-style platform for Peru.')}</p>
      <div className="lakekpis">
        {[[LAKES.length, L('lagos y embalses en el inventario de referencia', 'lakes and reservoirs in the reference inventory')], [LAKES.filter((l) => l.alt >= 4000).length, L('están sobre los 4000 m', 'lie above 4000 m')], [Math.round(stats.cov), L(`% tiene un punto de monitoreo a menos de ${radius} km`, `% have a monitoring point within ${radius} km`)]].map(([n, l], i) => <div key={i} className="card stat"><b className="num"><CountUp to={n} duration={1.2} /></b><span>{l}</span></div>)}
      </div>
      <div className="lakegrid">
        <LakeMap points={tab === 'cov' ? points : null} uncovered={uncovered} />
        <div className="card panel ficha">
          <Select searchable label={L('Elige un lago', 'Choose a lake')} data={LAKES.map((l) => ({ value: l.id, label: l.name }))} value={cur.id} onChange={(v) => v && setLake(v)} allowDeselect={false} />
          <AnimatePresence mode="wait">
            <motion.div key={cur.id} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <h3 style={{ margin: '14px 0 2px', fontSize: 20 }}>{cur.name}</h3>
              <span className="stag" style={{ color: TYPES[cur.type][2], borderColor: TYPES[cur.type][2] }}>{TYPES[cur.type][lang === 'es' ? 0 : 1]}</span>
              <div className="fgrid">
                <div><span>{L('Región', 'Region')}</span><b>{cur.dep}</b></div><div><span>{L('Vertiente', 'Basin')}</span><b>{cur.vert}</b></div>
                <div><span>{L('Altitud', 'Altitude')}</span><b>{cur.alt} m</b></div><div><span>{L('Área aprox.', 'Approx. area')}</span><b>{cur.area} km²</b></div>
                <div><span>{L('Coordenadas', 'Coordinates')}</span><b>{cur.lat}°, {cur.lon}°</b></div><div><span>{L('Punto de monitoreo más cercano', 'Nearest monitoring point')}</span><b>{Math.round(near.d)} km</b></div>
              </div>
              <Button fullWidth mt="md" size="md" color="forest" leftSection={<IconFlask size={18} />} onClick={() => openCase({ vars: ['PRECTOTCORR', 'EVLAND', 'T2M', 'GWETROOT'] }, { id: 'custom', lat: cur.lat, lon: cur.lon, name: cur.name })}>{L('Investigar el clima de este lago', 'Investigate this lake’s climate')}</Button>
              <p className="mini">{L('Analiza lluvia, evaporación, temperatura y humedad del suelo en el lago con las mismas pruebas del laboratorio. Si tienes la serie de su área o nivel (por ejemplo de AppEEARS o SWOT), súbela como CSV en el laboratorio.', 'Analyses rain, evaporation, temperature and soil moisture at the lake with the lab’s tests. If you have its area or level series (for example from AppEEARS or SWOT), upload it as CSV in the lab.')}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className="card panel" style={{ marginTop: 14 }}>
        <h3>{L('Estadística espacial', 'Spatial statistics')}</h3>
        <div className="subtabs">{T.map(([v, I, l]) => <button key={v} className={tab === v ? 'on' : ''} onClick={() => setTab(v)}><I size={15} />{l}</button>)}</div>
        <div style={{ paddingTop: 14 }}>
          {tab === 'inv' && <Inventory L={L} lang={lang} setLake={setLake} lake={cur.id} />}
          {tab === 'alt' && <AltTrend L={L} lang={lang} pal={pal} />}
          {tab === 'cov' && <Coverage L={L} lang={lang} points={points} setPoints={setPoints} radius={radius} setRadius={setRadius} stats={stats} custom={custom} setCustom={setCustom} />}
          {tab === 'clf' && <Classifier L={L} lang={lang} />}
        </div>
      </div>
    </div></section>
  );
}
