import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import Ghost from '../../ui/Ghost';
import { Button, Select, Slider, Table, Alert, Loader, Progress } from '@mantine/core';
import { IconFlask, IconDatabase, IconMountain, IconMapPins, IconDropletSearch, IconUpload, IconCalculator, IconRadar2, IconScale, IconSatellite, IconMessageReport, IconRestore, IconRipple } from '@tabler/icons-react';
import PageHead from '../../layout/PageHead';
import { motion, AnimatePresence } from 'framer-motion';
import * as S from '../../lib/analysis/stats';
import { bh } from '../../lib/analysis/advanced';
import { V, power, demo } from '../../lib/nasa/data';
import { LAKES as REF_LAKES, TYPES, BANDS, band, SAMPLE_POINTS, km, parsePoints, parseLakes , vertName } from './lakesData';
import { Balance, Watch, Satellites, Reports } from './LakeTools';
import { LEVELS } from './lakeclim';
import { useStore } from '../../core/store';
import { useT } from '../../core/i18n';
import { usePal } from '../../core/palette';
import { PlotView, EChart, olsBand } from '../../shared/charts/hooks';
import Earth from '../../shared/earth/Earth';
import CountUp from '../../ui/CountUp';
import Interpret from '../../shared/Interpret';
import { tableFacts } from '../../shared/charts/chartFacts';
import { csvError, readCsvFile, csvIssues } from '../../lib/data/csv';
import { useRequest, aborted } from '../../core/useRequest';
import { runAnalysis } from '../../lib/analysis/run';
import { coverageOf } from '../../lib/data/monthly';
const P = lazy(() => import('../../shared/charts/Plotly'));
import { LakeLab } from './LakeLab';
const Wait = () => <div style={{ padding: 30, textAlign: 'center' }}><Loader size="sm" color="forest" /></div>;
const cdf = (x, m, s) => { const z = (x - m) / (s * Math.SQRT2), t = 1 / (1 + 0.3275911 * Math.abs(z)), e = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z); return 0.5 * (1 + (z >= 0 ? e : -e)); };
const pdf = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));

function Inventory({ L, lang, setLake, lake }) {
  const { lakes: LAKES, setLakes, lakesSrc } = useStore(); const [bad, setBad] = useState(false);
  const onFile = async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const l = parseLakes(await readCsvFile(f)); if (!l.length) throw Object.assign(new Error('empty'), { issues: l.issues }); setLakes(l, f.name); setBad(false); useStore.getState().sayKilla('confirmado', L(`${l.length} lagos cargados.`, `${l.length} lakes loaded.`) + csvIssues(l, lang)); } catch (error) { setBad(true); useStore.getState().sayKilla('sin-datos', csvError(error, lang)); } finally { e.target.value = ''; } };
  const rows = [...LAKES].sort((a, b) => b.area - a.area);
  const sun = useMemo(() => { const by = {}; LAKES.forEach((l) => { by[l.vert] = by[l.vert] || {}; by[l.vert][l.type] = (by[l.vert][l.type] || 0) + 1; }); return Object.entries(by).map(([v, ty]) => ({ name: vertName(v, lang), children: Object.entries(ty).map(([k, n]) => ({ name: TYPES[k][lang === 'es' ? 0 : 1], value: n, itemStyle: { color: TYPES[k][2] } })) })); }, [lang, LAKES]);
  const o = { tooltip: { trigger: 'item' }, series: [{ type: 'sunburst', data: sun, radius: ['18%', '92%'], itemStyle: { borderColor: '#fff', borderWidth: 2 }, label: { fontSize: 11, color: '#fff' }, levels: [{}, { itemStyle: { color: '#1e3a8a' }, label: { rotate: 'tangential' } }, {}], emphasis: { focus: 'ancestor' } }] };
  return (
    <div className="two">
      <div><h4 className="sh">{L('Altitud y tamaño de cada lago (pasa el cursor)', 'Altitude and size of each lake (hover)')}</h4>
        <PlotView explanation={{title:L('Altitud y tamaño de los lagos', 'Lake altitude and size'),facts:`scatter; source ${lakesSrc || 'approximate reference inventory, not official'}; x area km² on a log scale; y altitude m; no observation dates declared; `+tableFacts(['lake','area km²','altitude m','type'],LAKES.map(l=>[l.name,l.area,l.alt,l.type])),how:L('Cada punto es un lago. El eje de área es logarítmico: distancias iguales representan proporciones, no aumentos absolutos iguales.', 'Each point is a lake. The area axis is logarithmic: equal distances represent ratios, not equal absolute increases.')}} deps={[lang, LAKES]} h={330} build={(Plot, w) => Plot.plot({ width: w, height: 330, marginLeft: 50, style: { background: 'transparent', color: '#5b6b8c' }, x: { type: 'log', label: L('Área (km², escala log)', 'Area (km², log scale)'), grid: true }, y: { label: L('Altitud (m)', 'Altitude (m)'), grid: true }, color: { domain: Object.keys(TYPES), range: Object.values(TYPES).map((x) => x[2]) },
          marks: [Plot.ruleY([2000, 4000], { stroke: '#9fb3a6', strokeDasharray: '4 4' }), Plot.dot(LAKES.filter((d) => d.area > 0), { x: 'area', y: 'alt', fill: 'type', r: 6, fillOpacity: 0.8, stroke: '#fff', tip: true, title: (d) => `${d.name}\n${d.alt} m · ${d.area} km² · ${d.dep}` })] })} />
        <p className="mini">{L('Las líneas punteadas separan las tres franjas de altitud que usamos en todo el módulo.', 'Dashed lines split the three altitude bands used across the module.')}</p></div>
      <div><h4 className="sh">{L('Vertiente y tipo (número de lagos)', 'Drainage basin and type (number of lakes)')}</h4><EChart option={o} deps={[lang, LAKES]} h={330} /></div>
      <div style={{ gridColumn: '1 / -1' }}><h4 className="sh">{L('Inventario de referencia', 'Reference inventory')}</h4>
        <div className="tablewrap"><Table fz="sm" verticalSpacing={4} highlightOnHover stickyHeader><Table.Thead><Table.Tr><Table.Th>{L('Nombre', 'Name')}</Table.Th><Table.Th>{L('Región', 'Region')}</Table.Th><Table.Th>{L('Tipo', 'Type')}</Table.Th><Table.Th>{L('Altitud (m)', 'Altitude (m)')}</Table.Th><Table.Th>{L('Área (km²)', 'Area (km²)')}</Table.Th><Table.Th>{L('Vertiente', 'Basin')}</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>{rows.slice(0, 400).map((l) => <Table.Tr key={l.id} tabIndex={0} aria-selected={l.id === lake} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setLake(l.id); } }} onClick={() => setLake(l.id)} style={{ cursor: 'pointer', background: l.id === lake ? '#e6f5ef' : undefined }}><Table.Td><i className="dot" style={{ background: TYPES[l.type][2] }} />{l.name}</Table.Td><Table.Td>{l.dep}</Table.Td><Table.Td>{TYPES[l.type][lang === 'es' ? 0 : 1]}</Table.Td><Table.Td>{l.alt}</Table.Td><Table.Td>{l.area}</Table.Td><Table.Td>{vertName(l.vert, lang)}</Table.Td></Table.Tr>)}</Table.Tbody></Table></div>
        <Interpret kind="table" title={L('Inventario de lagos', 'Lake inventory')} facts={`source: ${lakesSrc || 'approximate reference inventory, not official'}; total inventory ${LAKES.length}; visible rows ${Math.min(400, rows.length)}; no measurement date is declared for this inventory; ` + tableFacts(['lake', 'region', 'type', 'altitude m', 'area km²', 'basin'], rows.slice(0,400).map((l)=>[l.name,l.dep,TYPES[l.type][lang==='es'?0:1],l.alt,l.area,vertName(l.vert,lang)]))} how={L('Cada fila es un lago. La altitud y el área describen el inventario; no muestran cambios en el tiempo ni el nivel actual del agua.', 'Each row is a lake. Altitude and area describe the inventory; they do not show changes over time or current water level.')} plain={lakesSrc ? L('Estos registros proceden del archivo cargado. Revisa su fuente y fecha antes de tratarlos como mediciones actuales.', 'These records come from the uploaded file. Check source and date before treating them as current measurements.') : L('Este inventario es aproximado y de referencia. Sirve para comparar y probar la herramienta.', 'This is an approximate reference inventory. It supports comparisons and testing.')} />
        <Alert mt="sm" radius="lg" color={lakesSrc ? 'green' : 'blue'}>{lakesSrc ? L(`Usando ${LAKES.length} lagos del archivo ${lakesSrc}. Todo el módulo (planeta, vigía, cobertura y altitud) trabaja ahora con ese inventario.`, `Using ${LAKES.length} lakes from ${lakesSrc}. The whole module (planet, watch, coverage and altitude) now works with that inventory.`) : L('Inventario de referencia con valores aproximados, para demostrar la herramienta. Sube el inventario oficial de la ANA o de INAIGEM en CSV y todo el módulo se recalcula con él.', 'Reference inventory with approximate values, to demonstrate the tool. Upload the official ANA or INAIGEM inventory as CSV and the whole module recomputes with it.')} {!lakesSrc && <>{L('Plantillas:', 'Templates:')} <a href={`${import.meta.env.BASE_URL}plantillas/lagos-plantilla.csv`} download>{L('lagos', 'lakes')}</a> · <a href={`${import.meta.env.BASE_URL}plantillas/puntos-plantilla.csv`} download>{L('puntos de monitoreo', 'monitoring points')}</a></>}</Alert>
        <div className="row" style={{ gap: 18, marginTop: 8 }}><label className="textlink"><IconUpload size={14} /> {L('Subir inventario oficial (CSV: nombre, lat, lon, altitud, area, region, tipo, vertiente)', 'Upload official inventory (CSV: name, lat, lon, altitude, area, region, type, basin)')}<input type="file" accept=".csv,.txt" hidden onChange={onFile} /></label>{lakesSrc && <button className="textlink" onClick={() => setLakes(REF_LAKES, '')}><IconRestore size={14} /> {L('Volver al inventario de referencia', 'Back to the reference inventory')}</button>}</div>
        {bad && <p className="wizerr">{L('No se pudo leer el archivo: necesita al menos las columnas lat y lon.', 'Could not read the file: it needs at least lat and lon columns.')}</p>}</div>
    </div>
  );
}

function AltTrend({ L, lang, pal }) {
  const practice = useStore((s) => s.practice), LAKES = useStore((s) => s.lakes);
  const [k, setK] = useState('T2M'); const [prog, setProg] = useState(null); const [res, setRes] = useState(null);
  const begin = useRequest([k, practice, LAKES]);
  useEffect(() => { setProg(null); setRes(null); }, [k, practice, LAKES]);
  const run = async () => {
    const request = begin(), items = [], q = [...LAKES], y1 = new Date().getUTCFullYear() - 1; let done = 0; setProg(0);
    try {
      await Promise.all(Array.from({ length: 4 }, async () => { while (q.length && request.current()) { const lake = q.shift();
        try { const points = practice ? demo(lake.lat, lake.lon, [k], 1981, y1)[k] : (await power(lake.lat, lake.lon, [k], 1981, y1, { signal: request.signal }))[k]; if (points?.length >= 24) items.push({ points, meta: { ...lake, source: practice ? 'demo' : 'NASA POWER', coverage: coverageOf(points) } }); } catch (error) { if (aborted(error)) throw error; }
        if (request.current()) setProg(Math.round(++done / LAKES.length * 70));
      } }));
      const out = await runAnalysis('scan', { items, options: {} }, { signal: request.signal, onProgress: (value) => request.current() && setProg(70 + Math.round(value * 30)) });
      if (!request.current()) return;
      const sig = bh(out.map((o) => o.p)); out.forEach((o, i) => { o.fdr = sig[i]; }); setRes({ k, live: !practice, practice, list: out, missing: LAKES.length - out.length });
    } catch (error) { if (request.current() && !aborted(error)) setRes(null); }
    finally { if (request.current()) setProg(null); }
  };
  const R = res && res.k === k && res.practice === practice && res.list.length >= 3 ? res : null;
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
    {res && !R && prog == null && <p className="mini" role="alert">{L("Se necesitan al menos tres lagos con datos suficientes.", "At least three lakes with sufficient data are needed.")}</p>}
    {R && fit && (<div className="two" style={{ marginTop: 10 }}>
      <div><h4 className="sh">{L('Tendencia por década según la altitud', 'Trend per decade against altitude')}</h4>
        <Suspense fallback={<Wait />}><P pal={pal} h={340} data={[
          ...Object.keys(TYPES).map((ty) => { const g = R.list.filter((d) => d.type === ty); return { x: g.map((d) => d.alt), y: g.map((d) => d.perDec), text: g.map((d) => `${d.name}<br>p ${d.p < 0.001 ? '< 0.001' : '= ' + d.p.toFixed(3)}${d.fdr ? ' · FDR' : ''}`), mode: 'markers', type: 'scatter', name: TYPES[ty][lang === 'es' ? 0 : 1], marker: { color: TYPES[ty][2], size: g.map((d) => 9 + Math.log10(d.area + 1) * 5), opacity: g.map((d) => (d.fdr ? 0.95 : 0.35)), line: { color: '#fff', width: 1 } }, hovertemplate: '%{text}<br>%{x} m · %{y:.3f}<extra></extra>' }; }),
          { x: srt.map((d) => d.alt), y: srt.map((d) => fit.a + fit.b * d.alt), mode: 'lines', name: `R² = ${fit.r2.toFixed(2)}`, line: { color: '#14213d', dash: 'dash', width: 2 } }]}
          layout={{ xaxis: { title: L('Altitud (m)', 'Altitude (m)'), gridcolor: pal.grid }, yaxis: { title: `${V[k].u} / ${L('década', 'decade')}`, gridcolor: pal.grid, zerolinecolor: '#9aa' } }} /></Suspense></div>
      <div><h4 className="sh">{L('Por franja de altitud', 'By altitude band')}</h4><EChart option={ob} deps={[R, lang]} h={300} />
        <div className="kpis"><div className="kpi"><span>{L('Cambio de la tendencia por cada 1000 m', 'Trend change per 1000 m')}</span><b>{(fit.b * 1000).toFixed(3)} {V[k].u}</b></div><div className="kpi"><span>{L('¿Depende de la altitud? (p)', 'Depends on altitude? (p)')}</span><b style={{ color: ofit.p < 0.05 ? '#0c5a43' : '#868e96' }}>{ofit.p < 0.001 ? '< 0.001' : ofit.p.toFixed(3)}</b></div><div className="kpi"><span>{L('Lagos con tendencia significativa (FDR)', 'Lakes with significant trend (FDR)')}</span><b>{R.list.filter((d) => d.fdr).length} / {R.list.length}</b></div></div></div>
      <p className="mini" style={{ gridColumn: '1 / -1' }}>{ofit.p < 0.05 ? L('La tendencia cambia con la altitud: conviene analizar cada franja por separado.', 'The trend changes with altitude: each band should be analysed separately.') : L('No se ve una dependencia clara con la altitud en esta variable.', 'No clear altitude dependence for this variable.')} {L('Puntos tenues: no significativos tras la corrección por pruebas múltiples.', 'Faint points: not significant after multiple-testing correction.')} {!R.live && L('Datos de práctica (simulados).', 'Practice (simulated) data.')} {R.missing > 0 && L(`${R.missing} lagos sin datos suficientes.`, `${R.missing} lakes lack sufficient data.`)}</p>
    </div>)}
  </>);
}

function Coverage({ L, lang, points, setPoints, radius, setRadius, stats, custom, setCustom }) {
  const onFile = async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const p = parsePoints(await readCsvFile(f)); if (!p.length) throw Object.assign(new Error('empty'), { issues: p.issues }); useStore.getState().setMonitoringPoints(p, f.name); useStore.getState().sayKilla('confirmado', L(`${p.length} puntos válidos cargados.`, `${p.length} valid points loaded.`) + csvIssues(p, lang)); } catch (error) { useStore.getState().sayKilla('sin-datos', csvError(error, lang)); } finally { e.target.value = ''; } };
  const ob = { textStyle: { color: '#5b6b8c' }, tooltip: { trigger: 'axis' }, grid: { left: 44, right: 12, top: 14, bottom: 28 }, xAxis: { type: 'category', data: BANDS[lang] }, yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value} %' }, splitLine: { lineStyle: { color: '#eef2f7' } } }, series: [{ type: 'bar', data: stats.byBand.map((v) => ({ value: Math.round(v), itemStyle: { color: v >= 60 ? '#0c5a43' : v >= 30 ? '#d97706' : '#dc2626', borderRadius: [8, 8, 0, 0] } })), label: { show: true, position: 'top', formatter: '{c} %' }, barWidth: '45%' }] };
  return (<>
    <p className="sub">{L('¿Los puntos de monitoreo representan bien a los lagos? Mide cuántos lagos tienen un punto cerca y en qué franja de altitud faltan.', 'Do monitoring points represent the lakes well? Measure how many lakes have a point nearby and in which altitude band they are missing.')}</p>
    <Alert color={custom ? 'green' : 'blue'} radius="lg" mb="sm">{custom ? L(`Usando ${points.length} puntos del archivo ${custom}.`, `Using ${points.length} points from ${custom}.`) : L('Ejemplo: se usan 16 capitales regionales como si fueran puntos de monitoreo. No es la red oficial de la ANA. Sube el CSV oficial (columnas lat, lon) para el análisis real.', 'Example: 16 regional capitals are used as if they were monitoring points. This is not ANA’s official network. Upload the official CSV (lat, lon columns) for the real analysis.')}</Alert>
    <div className="row" style={{ alignItems: 'center', gap: 22 }}>
      <div style={{ flex: 1, minWidth: 240 }}><span className="mini">{L('Distancia que cuenta como “cerca”', 'Distance that counts as “near”')}: <b>{radius} km</b></span><Slider color="forest" min={10} max={200} step={5} value={radius} onChange={setRadius} label={null} /></div>
      <label className="textlink"><IconUpload size={14} /> {L('Subir puntos de monitoreo (CSV)', 'Upload monitoring points (CSV)')}<input type="file" accept=".csv,.txt" hidden onChange={onFile} /></label>
    </div>
    <div className="kpis" style={{ marginTop: 12 }}>
      <div className="kpi"><Ghost k="globe" i={2} size={70} pos={0} /><span>{L('Lagos con un punto cerca', 'Lakes with a nearby point')}</span><b>{Math.round(stats.cov)} %</b></div>
      <div className="kpi"><Ghost k="alert" i={1} size={70} pos={1} /><span>{L('Lagos sin cobertura', 'Uncovered lakes')}</span><b style={{ color: '#dc2626' }}>{stats.unc.length}</b></div>
      <div className="kpi"><Ghost k="pin" i={3} size={70} pos={2} /><span>{L('Distancia mediana al punto más cercano', 'Median distance to nearest point')}</span><b>{Math.round(stats.med)} km</b></div>
      <div className="kpi"><Ghost k="mountain" i={3} size={70} pos={3} /><span>{L('Lago más alejado', 'Most remote lake')}</span><b>{stats.far.name} ({Math.round(stats.far.d)} km)</b></div>
    </div>
    <div className="two" style={{ marginTop: 6 }}>
      <div><h4 className="sh">{L('Cobertura por franja de altitud', 'Coverage by altitude band')}</h4><EChart option={ob} deps={[stats, lang]} h={270} /></div>
      <div><h4 className="sh">{L('Distancia de cada lago a su punto más cercano', 'Distance from each lake to its nearest point')}</h4>
        <PlotView explanation={{title:L('Distancias a puntos de monitoreo', 'Distances to monitoring points'),facts:`histogram; distance unit km; coverage radius ${radius}; source ${custom || 'illustrative regional-capital points, not an official monitoring network'}; lakes ${stats.d.length}; covered percentage ${stats.cov}; median nearest distance ${stats.med}; `+tableFacts(['lake','nearest distance km'],stats.d.map(l=>[l.name,l.d])),how:L('El histograma agrupa lagos por distancia a un punto del inventario. La línea marca el radio elegido; cercanía no garantiza que exista una medición operativa.', 'The histogram groups lakes by distance to an inventory point. The line marks the selected radius; proximity does not guarantee an operating measurement.')}} deps={[stats, lang]} h={270} build={(Plot, w) => Plot.plot({ width: w, height: 270, style: { background: 'transparent', color: '#5b6b8c' }, x: { label: 'km' }, y: { grid: true, label: L('lagos', 'lakes') }, marks: [Plot.rectY(stats.d, Plot.binX({ y: 'count' }, { x: 'd', fill: (d) => (d.d <= radius ? '#0c5a43' : '#dc2626'), thresholds: 14, tip: true })), Plot.ruleX([radius], { stroke: '#14213d', strokeDasharray: '5 4', strokeWidth: 2 }), Plot.ruleY([0])] })} /></div>
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
          <PlotView explanation={{title:L('Clasificación de agua: ', 'Water classification: ')+BANDS[lang][i],facts:`didactic simulation, not satellite measurements; water-index threshold ${t}; water distribution mean ${b.w[0]}, standard deviation ${b.w[1]}; confusion distribution mean ${b.c[0]}, standard deviation ${b.c[1]}; confusion class ${b.cn}; theoretical classification accuracy ${a*100}%; curves show probability density, not measured water area`,how:L('Las dos curvas muestran distribuciones simuladas de agua y objetos que se confunden con ella. El umbral separa las clases y puede producir errores.', 'The curves show simulated distributions of water and confusing objects. The threshold separates classes and can produce errors.')}} deps={[t, lang]} h={170} build={(Plot, w) => Plot.plot({ width: w, height: 170, marginLeft: 8, marginBottom: 28, style: { background: 'transparent', color: '#5b6b8c' }, y: { axis: null }, x: { label: null }, color: { domain: [L('Agua', 'Water'), L('No agua', 'Not water')], range: ['#1e3a8a', '#c2410c'] }, marks: [Plot.areaY(data, { x: 'x', y1: 0, y2: 'y', fill: 'g', fillOpacity: 0.35 }), Plot.lineY(data, { x: 'x', y: 'y', stroke: 'g', strokeWidth: 1.6 }), Plot.ruleX([t], { stroke: '#14213d', strokeWidth: 2.4 }), Plot.ruleX([best[i][0]], { stroke: '#0c5a43', strokeDasharray: '4 3' })] })} />
          <div className="accbar"><motion.i animate={{ width: `${a * 100}%` }} style={{ background: a > 0.9 ? '#0c5a43' : a > 0.8 ? '#d97706' : '#dc2626' }} /></div>
          <span className="mini">{L('Acierto', 'Accuracy')}: <b>{(a * 100).toFixed(0)} %</b> · {L('mejor umbral', 'best threshold')}: <b style={{ color: '#0c5a43' }}>{best[i][0].toFixed(2)}</b> ({(best[i][1] * 100).toFixed(0)} %)</span>
        </div>); })}
    </div>
    <p className="mini">{L('Línea negra: tu umbral. Línea verde punteada: el mejor umbral de esa franja. Un solo umbral para todo el país no sirve: el óptimo cambia con la altitud, y sobre los 4000 m ni el mejor umbral basta, por eso allí conviene sumar radar (como RADARSAT) y un modelo de elevación.', 'Black line: your threshold. Dashed green: the best threshold for that band. One national threshold does not work: the optimum changes with altitude, and above 4000 m even the best threshold falls short, so radar (such as RADARSAT) and an elevation model should be added there.')}</p>
  </>);
}

export default function Lakes() {
  const { lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b); const pal = usePal();
  const { lake, setLake, openCase, lakes: LAKES, practice } = useStore();
  const [tab, setTab] = useState('inv'); const [one, setOne] = useState('lab'); const points = useStore((state) => state.monitoringPoints), custom = useStore((state) => state.monitoringSource), setPoints = (value) => useStore.getState().setMonitoringPoints(value, useStore.getState().monitoringSource), setCustom = (value) => useStore.getState().setMonitoringPoints(useStore.getState().monitoringPoints, value); const [radius, setRadius] = useState(60); const [watch, setWatch] = useState(null);
  const cur = LAKES.find((l) => l.id === lake) || LAKES[0];
  useEffect(() => { setWatch(null); }, [practice, LAKES]);
  const stats = useMemo(() => {
    const d = LAKES.map((l) => ({ ...l, d: Math.min(...points.map((p) => km(l, p))) })), unc = d.filter((x) => x.d > radius), srt = d.map((x) => x.d).sort((a, b) => a - b);
    return { d, unc, cov: (1 - unc.length / d.length) * 100, med: srt[Math.floor(srt.length / 2)], far: d.reduce((a, b) => (b.d > a.d ? b : a)), byBand: [0, 1, 2].map((b) => { const g = d.filter((x) => band(x.alt) === b); return g.length ? (g.filter((x) => x.d <= radius).length / g.length) * 100 : 0; }) };
  }, [points, radius, LAKES]);
  const uncovered = useMemo(() => (tab === 'cov' ? new Set(stats.unc.map((l) => l.id)) : null), [tab, stats]);
  const alerts = useMemo(() => (tab === 'watch' && watch ? new Map(watch.list.map((o) => [o.id, { color: LEVELS[o.level][2], text: `${LEVELS[o.level][lang === 'es' ? 0 : 1]} · ${o.zw > 0 ? '+' : ''}${o.zw.toFixed(1)} σ / ${o.zt > 0 ? '+' : ''}${o.zt.toFixed(1)} σ` }])) : null), [tab, watch, lang]);
  const near = stats.d.find((x) => x.id === cur.id);
  const ONE = [['lab', IconRipple, L('Novedades del lago', 'Lake lab')], ['bal', IconScale, L('Balance de agua y escenarios', 'Water balance and scenarios')], ['sat', IconSatellite, L('Satélites que lo observan', 'Satellites watching it')], ['rep', IconMessageReport, L('Reportes ciudadanos', 'Citizen reports')]];
  const T = [['inv', IconDatabase, L('Inventario', 'Inventory')], ['watch', IconRadar2, L('Vigía de anomalías', 'Anomaly watch')], ['alt', IconMountain, L('Altitud y tendencia', 'Altitude & trend')], ['cov', IconMapPins, L('Cobertura de monitoreo', 'Monitoring coverage')], ['clf', IconDropletSearch, L('Clasificación del agua', 'Water classification')]];
  return (
    <section id="lagos"><div className="wrap">
      <PageHead lot="lakes" icon={IconRipple} tone="navy" eyebrow={L('Plataforma de lagos', 'Lakes platform')} title={L('Lagos y lagunas del Perú', 'Lakes of Peru')} sub={L('Inventario, imágenes satelitales en el tiempo, clima de cada lago y estadística espacial en un solo lugar. Nuestro prototipo de una plataforma tipo LAGOS para el Perú.', 'Inventory, satellite imagery through time, each lake’s climate and spatial statistics in one place. Our prototype of a LAGOS-style platform for Peru.')} />
      <div className="lakekpis">
        {[[LAKES.length, L('lagos y embalses en el inventario', 'lakes and reservoirs in the inventory')], [LAKES.filter((l) => l.alt >= 4000).length, L('están sobre los 4000 m', 'lie above 4000 m')], [Math.round(stats.cov), L(`% tiene un punto de monitoreo a menos de ${radius} km`, `% have a monitoring point within ${radius} km`)]].map(([n, l], i) => <div key={i} className="card stat"><Ghost k={['water','mountain','sat'][i]} i={i+1} size={120} pos={i+3} /><b className="num"><CountUp to={n} duration={1.2} /></b><span>{l}</span></div>)}
      </div>
      <div className="lakegrid">
        <div className="card lakemap"><Earth mode="lakes" points={tab === 'cov' ? points : null} uncovered={uncovered} alerts={alerts} /></div>
        <div className="card panel ficha"><Ghost k="pin" i={2} size={190} pos={0} />
          <Select searchable label={L('Elige un lago', 'Choose a lake')} data={LAKES.map((l) => ({ value: l.id, label: l.name }))} value={cur.id} onChange={(v) => v && setLake(v)} allowDeselect={false} />
          <AnimatePresence mode="wait">
            <motion.div key={cur.id} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <h3 style={{ margin: '14px 0 2px', fontSize: 20 }}>{cur.name}</h3>
              <span className="stag" style={{ color: TYPES[cur.type][2], borderColor: TYPES[cur.type][2] }}>{TYPES[cur.type][lang === 'es' ? 0 : 1]}</span>
              <div className="fgrid">
                <div><span>{L('Región', 'Region')}</span><b>{cur.dep}</b></div><div><span>{L('Vertiente', 'Basin')}</span><b>{vertName(cur.vert, lang)}</b></div>
                <div><span>{L('Altitud', 'Altitude')}</span><b>{cur.alt} m</b></div><div><span>{L('Área aprox.', 'Approx. area')}</span><b>{cur.area} km²</b></div>
                <div><span>{L('Coordenadas', 'Coordinates')}</span><b>{cur.lat}°, {cur.lon}°</b></div><div><span>{L('Punto de monitoreo más cercano', 'Nearest monitoring point')}</span><b>{Math.round(near.d)} km</b></div>
              </div>
              <Button fullWidth mt="md" size="md" color="forest" leftSection={<IconFlask size={18} />} onClick={() => openCase({ vars: ['PRECTOTCORR', 'EVLAND', 'T2M', 'GWETROOT'] }, { id: 'custom', lat: cur.lat, lon: cur.lon, name: cur.name })}>{L('Investigar el clima de este lago', 'Investigate this lake’s climate')}</Button>
              <p className="mini">{L('Abre el laboratorio con lluvia, evaporación, temperatura y humedad del suelo de este lago: tendencia, anomalías y pronóstico.', 'Opens the lab with this lake’s rain, evaporation, temperature and soil moisture: trend, anomalies and forecast.')}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className="card panel" style={{ marginTop: 14 }}><Ghost k="calm" i={0} size={170} pos={1} />
        <h3>{L('Este lago', 'This lake')}: {cur.name}</h3>
        <div className="subtabs">{ONE.map(([v, I, l]) => <button key={v} className={one === v ? 'on' : ''} onClick={() => setOne(v)}><I size={15} />{l}</button>)}</div>
        <div style={{ paddingTop: 14 }}>
          {one === 'lab' && <LakeLab lake={cur} L={L} lang={lang} />}
          {one === 'bal' && <Balance lake={cur} L={L} lang={lang} />}
          {one === 'sat' && <Satellites lake={cur} L={L} lang={lang} />}
          {one === 'rep' && <Reports lake={cur} L={L} lang={lang} />}
        </div>
      </div>
      <div className="card panel" style={{ marginTop: 14 }}><Ghost k="radar" i={1} size={170} pos={3} />
        <h3>{L('Todos los lagos: estadística espacial', 'All lakes: spatial statistics')}</h3>
        <div className="subtabs">{T.map(([v, I, l]) => <button key={v} className={tab === v ? 'on' : ''} onClick={() => setTab(v)}><I size={15} />{l}</button>)}</div>
        <div style={{ paddingTop: 14 }}>
          {tab === 'inv' && <Inventory L={L} lang={lang} setLake={setLake} lake={cur.id} />}
          {tab === 'watch' && <Watch L={L} lang={lang} state={watch} setState={setWatch} />}
          {tab === 'alt' && <AltTrend L={L} lang={lang} pal={pal} />}
          {tab === 'cov' && <Coverage L={L} lang={lang} points={points} setPoints={setPoints} radius={radius} setRadius={setRadius} stats={stats} custom={custom} setCustom={setCustom} />}
          {tab === 'clf' && <Classifier L={L} lang={lang} />}
        </div>
      </div>
    </div></section>
  );
}
