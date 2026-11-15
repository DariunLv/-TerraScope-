/* Herramientas del módulo de lagos:
   Balance  -> lluvia menos evaporación del lago elegido, tendencia y escenarios “¿qué pasaría si…?”
   Watch    -> vigía: revisa todos los lagos y avisa cuáles se salen de lo normal
   Satellites -> constelación virtual: qué misiones de la NASA observaron el lago (Earthdata CMR)
   Reports  -> ciencia ciudadana: reporte validado con React Hook Form + Zod y contraste con los datos */
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Slider, Alert, Loader, Progress, Table, Select, Textarea, TextInput, Stepper } from '@mantine/core';
import { IconRadar2, IconExternalLink, IconSatellite, IconSend, IconDownload, IconTrash, IconCheck, IconAlertTriangle, IconShieldCheck, IconArrowRight, IconArrowLeft, IconWifiOff } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as S from '../../lib/analysis/stats';
import * as I from '../../lib/analysis/intel';
import { bh } from '../../lib/analysis/advanced';
import { lakeClimate, watchLake, LEVELS } from './lakeclim';
import { MISSIONS, cmrCoverage, deepLinks } from '../../lib/nasa/nasa';
import { TYPES } from './lakesData';
import { useStore } from '../../core/store';
import { usePal } from '../../core/palette';
import Interpret from '../../shared/Interpret';
import { EChart, PlotView } from '../../shared/charts/hooks';
import { MES } from '../../shared/analysis/Intel';
const P = lazy(() => import('../../shared/charts/Plotly'));
const Wait = () => <div style={{ padding: 30, textAlign: 'center' }}><Loader size="sm" color="forest" /></div>;
const sg = (x, d = 0) => (x == null || isNaN(x) ? '—' : `${x > 0 ? '+' : ''}${x.toFixed(d)}`);

/* ---------------- Balance hídrico y escenarios ---------------- */
export function Balance({ lake, L, lang }) {
  const practice = useStore((s) => s.practice), pal = usePal();
  const [clim, setClim] = useState(null), [dT, setDT] = useState(1.5), [dP, setDP] = useState(-10), [al, setAl] = useState(4);
  useEffect(() => { let dead = false; setClim(null); lakeClimate(lake, practice).then((c) => { if (!dead) setClim(c); }); return () => { dead = true; }; }, [lake.id, lake.lat, practice]);
  const R = useMemo(() => { if (!clim) return null; let r = null; try { r = S.analyze(clim.wb, {}); } catch { /* corta */ } return r; }, [clim]);
  if (!clim) return <Wait />;
  const ann = clim.ann, yrs = ann.map((a) => a.year), alpha = al / 100;
  const o = { textStyle: { color: '#5b6b8c' }, legend: { top: 0, textStyle: { color: '#5b6b8c' } }, grid: { left: 54, right: 96, top: 34, bottom: 50 }, tooltip: { trigger: 'axis', valueFormatter: (v) => `${Math.round(v)} mm` }, dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 6 }],
    xAxis: { type: 'category', data: yrs }, yAxis: { type: 'value', name: L('mm por año', 'mm per year'), splitLine: { lineStyle: { color: '#eef2f7' } } },
    series: [{ name: L('Lluvia', 'Rain'), type: 'bar', data: ann.map((a) => Math.round(a.p)), itemStyle: { color: '#3b66d1', borderRadius: [4, 4, 0, 0] } }, { name: L('Evaporación', 'Evaporation'), type: 'bar', data: ann.map((a) => Math.round(a.e)), itemStyle: { color: '#ea580c', borderRadius: [4, 4, 0, 0] } },
      { name: L('Balance (lluvia − evaporación)', 'Balance (rain − evaporation)'), type: 'line', data: ann.map((a) => Math.round(a.wb)), smooth: true, symbolSize: 5, lineStyle: { color: '#0c5a43', width: 3 }, itemStyle: { color: '#0c5a43' }, markLine: { symbol: 'none', silent: true, lineStyle: { color: '#14213d', type: 'dashed' }, label: { formatter: L('año seco (10 %)', 'dry year (10 %)'), color: '#14213d', position: 'insideEndTop' }, data: [{ yAxis: Math.round(I.scenario(ann).p10) }] } }] };
  const mine = I.scenario(ann, { dT, dP: dP / 100, alpha }), rows = [[L('Hoy (últimos 10 años)', 'Today (last 10 years)'), I.scenario(ann, {}), '#5b6b8c'], ...I.SCENARIOS.map(([, es, en, sc, c]) => [`${L(es, en)} (${sg(sc.dT, 1)} °C, ${sg(sc.dP * 100)} % ${L('lluvia', 'rain')})`, I.scenario(ann, { ...sc, alpha }), c]), [L('Tu escenario', 'Your scenario'), mine, '#1e3a8a']].reverse();
  const perDec = R ? R.perDec * 12 : 0; // mm/mes por década -> mm/año por década
  return (<>
    <p className="sub">{L('El nivel de un lago depende, sobre todo, de cuánta agua entra por lluvia y cuánta sale por evaporación. Aquí está ese balance para', 'A lake’s level depends mostly on how much water enters as rain and leaves as evaporation. Here is that balance for')} <b>{lake.name}</b>.</p>
    <EChart option={o} deps={[clim, lang]} h={320} />
    <Interpret title={L('Lluvia, evaporación y balance anual del lago', 'Yearly rain, evaporation and balance of the lake')} facts={`${lake.name}; ${ann.length} años; balance medio ${Math.round(S.mean(ann.map((a) => a.wb)))} mm/año (lluvia menos evaporación); tendencia ${R ? Math.round(perDec) + ' mm/año por década, p=' + R.p.toFixed(4) + ', ' + R.count + ' de 3 pruebas significativas' : 'sin datos suficientes'}; datos ${clim.live ? 'reales NASA POWER' : 'de práctica simulados'}`} how={L('Cómo se lee: barras azules = lluvia, línea = evaporación, línea verde = lo que sobra o falta (balance).', 'How to read it: blue bars = rain, line = evaporation, green line = what is left or missing (balance).')} plain={L('Qué dice aquí: si la línea verde baja con los años, al lago le llega cada vez menos agua de la que se evapora.', 'What it says here: if the green line falls over the years, the lake gets less water than it evaporates.')} />
    <div className="kpis">
      <div className="kpi"><span>{L('Balance medio anual', 'Mean annual balance')}</span><b>{Math.round(S.mean(ann.map((a) => a.wb)))} mm</b></div>
      <div className="kpi"><span>{L('Tendencia del balance', 'Balance trend')}</span><b style={{ color: R && R.level !== 'none' ? (perDec < 0 ? '#c2410c' : '#1e40af') : undefined }}>{R ? `${sg(perDec, 1)} mm ${L('por década', 'per decade')}` : '—'}</b></div>
      <div className="kpi"><span>{L('¿Es significativa?', 'Is it significant?')}</span><b>{R ? `${R.count}/3 ${L('pruebas', 'tests')} · p ${R.p < 0.001 ? '< 0.001' : '= ' + R.p.toFixed(3)}` : '—'}</b></div>
      <div className="kpi"><span>{L('Datos', 'Data')}</span><b>{clim.live ? 'NASA POWER (MERRA-2)' : L('Práctica (simulados)', 'Practice (simulated)')}</b></div>
    </div>
    <h4 className="sh">{L('Escenarios: ¿qué pasaría si…?', 'Scenarios: what if…?')}</h4>
    <div className="row ctrl">
      <div style={{ flex: 1, minWidth: 190 }}><span className="mini">{L('La temperatura sube', 'Temperature rises')}: <b>{sg(dT, 1)} °C</b></span><Slider color="orange" min={0} max={4} step={0.1} value={dT} onChange={setDT} label={null} /></div>
      <div style={{ flex: 1, minWidth: 190 }}><span className="mini">{L('La lluvia cambia', 'Rainfall changes')}: <b>{sg(dP)} %</b></span><Slider color="navy" min={-30} max={30} step={1} value={dP} onChange={setDP} label={null} /></div>
      <div style={{ flex: 1, minWidth: 190 }}><span className="mini">{L('Supuesto: la evaporación sube', 'Assumption: evaporation rises')} <b>{al} %</b> {L('por cada °C', 'per °C')}</span><Slider color="gray" min={2} max={7} step={0.5} value={al} onChange={setAl} label={null} /></div>
    </div>
    <Suspense fallback={<Wait />}><P pal={pal} h={280} data={[{ type: 'bar', orientation: 'h', y: rows.map((r) => r[0]), x: rows.map((r) => Math.round(r[1].val)), marker: { color: rows.map((r) => r[2]), opacity: 0.88 }, error_x: { type: 'data', symmetric: false, array: rows.map((r) => r[1].hi - r[1].val), arrayminus: rows.map((r) => r[1].val - r[1].lo), color: '#14213d', thickness: 1.6 }, text: rows.map((r) => `${Math.round(r[1].val)} mm`), textposition: 'outside', cliponaxis: false,  textfont: { color: '#fff', size: 13 }, hovertemplate: '%{y}<br>%{x} mm<extra></extra>' }]}
      layout={{ showlegend: false, margin: { l: 250, r: 60, t: 10, b: 40 }, xaxis: { title: L('Balance anual (mm)', 'Annual balance (mm)'), gridcolor: pal.grid, zerolinecolor: '#14213d' }, yaxis: { automargin: true }, shapes: [{ type: 'line', x0: mine.p10, x1: mine.p10, yref: 'paper', y0: 0, y1: 1, line: { color: '#14213d', dash: 'dash', width: 1.5 } }] }} /></Suspense>
    <Interpret title={L('Escenarios: balance anual del lago según temperatura y lluvia', 'Scenarios: yearly lake balance by temperature and rain')} facts={rows.map((r) => `${r[0]}: ${Math.round(r[1].val)} mm (rango ${Math.round(r[1].lo)} a ${Math.round(r[1].hi)})`).join(' | ') + `; línea punteada = umbral de año seco ${Math.round(mine.p10)} mm; en tu escenario ${Math.round(mine.dry * 10)} de cada 10 años serían secos`} how={L('Cómo se lee: cada barra es el balance anual esperado en un escenario; la rayita es la duda; la línea punteada separa los años secos.', 'How to read it: each bar is the expected yearly balance in a scenario; the whisker is the doubt; the dashed line marks dry years.')} plain={L('Qué dice aquí: mientras más a la izquierda de la línea punteada, más años secos. Mueve los controles para ver qué cambia.', 'What it says here: the further left of the dashed line, the more dry years. Move the sliders to see what changes.')} />
    <Alert radius="lg" color={mine.dry >= 0.5 ? 'red' : mine.dry >= 0.25 ? 'orange' : 'green'} icon={mine.dry >= 0.25 ? <IconAlertTriangle size={18} /> : <IconShieldCheck size={18} />}>
      {L(`En tu escenario el balance anual pasaría de ${Math.round(mine.now)} a ${Math.round(mine.val)} mm (${sg(mine.delta)} mm). ${Math.round(mine.dry * 10)} de cada 10 años serían tan secos como el 10 % más seco de 1981–2025.`, `In your scenario the annual balance would go from ${Math.round(mine.now)} to ${Math.round(mine.val)} mm (${sg(mine.delta)} mm). ${Math.round(mine.dry * 10)} in 10 years would be as dry as the driest 10 % of 1981–2025.`)}
    </Alert>
    <p className="mini">{L('Línea punteada: umbral de año seco. Es un escenario condicional, no una predicción ni una prueba de causa: aplica tus supuestos a los años observados. La evaporación es la del terreno según MERRA-2 (celda de unos 50 km), no la del espejo de agua, y no se incluyen ríos, glaciares ni uso humano. Para el nivel real del lago, sube su serie (SWOT, DAHITI o Hydroweb) en el laboratorio.', 'Dashed line: dry-year threshold. This is a conditional scenario, not a prediction or proof of cause: it applies your assumptions to observed years. Evaporation is MERRA-2 land evaporation (about 50 km cell), not open-water evaporation, and rivers, glaciers and human use are not included. For the real lake level, upload its series (SWOT, DAHITI or Hydroweb) in the lab.')}</p>
  </>);
}

/* ---------------- Vigía de anomalías en todos los lagos ---------------- */
export function Watch({ L, lang, state, setState }) {
  const { practice, lakes, setLake } = useStore(); const [prog, setProg] = useState(null);
  const run = async () => {
    const out = [], q = [...lakes]; let done = 0, live = true; setProg(0);
    await Promise.all(Array.from({ length: 4 }, async () => { while (q.length) { const l = q.shift(); try { const c = await lakeClimate(l, practice || !live), w = watchLake(c); if (!c.live) live = false; if (w) out.push({ ...l, ...w }); } catch { /* sin datos */ } setProg(Math.round((++done / lakes.length) * 100)); } }));
    const sig = bh(out.map((o) => o.p), 0.1); out.forEach((o, i) => { o.fdr = sig[i]; if (o.level === 2 && !o.fdr) o.level = 1; }); out.sort((a, b) => b.sev - a.sev);
    setState({ list: out, live: live && !practice }); setProg(null);
  };
  const R = state, cnt = R ? [0, 1, 2].map((v) => R.list.filter((o) => o.level === v).length) : null, end = R?.list[0]?.end;
  const why = (o) => [Math.abs(o.zw) >= 1.5 ? (o.zw < 0 ? L('balance de agua muy por debajo de lo normal', 'water balance far below normal') : L('balance de agua muy por encima de lo normal', 'water balance far above normal')) : null, Math.abs(o.zt) >= 1.5 ? (o.zt > 0 ? L('más cálido de lo normal', 'warmer than normal') : L('más frío de lo normal', 'colder than normal')) : null].filter(Boolean).join(L(' y ', ' and ')) || L('dentro de lo normal', 'within normal');
  return (<>
    <p className="sub">{L('No hace falta saber qué lago mirar. El vigía revisa todos: compara los últimos 12 meses de cada uno con lo que se esperaba según su propia historia y su tendencia, y ordena los que más se salen.', 'You do not need to know which lake to check. The watch reviews them all: it compares each lake’s last 12 months with what its own history and trend predicted, and ranks those furthest off.')}</p>
    <Button color="forest" loading={prog != null} leftSection={<IconRadar2 size={18} />} onClick={run}>{R ? L('Volver a vigilar', 'Run the watch again') : L('Vigilar todos los lagos', 'Watch all lakes')}</Button>
    {prog != null && <Progress value={prog} color="forest" mt={8} animated />}
    {R && R.list.length > 0 && (<motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <div className="kpis" style={{ marginTop: 12 }}>{[2, 1, 0].map((v) => <div key={v} className="kpi"><span>{LEVELS[v][lang === 'es' ? 0 : 1]}</span><b style={{ color: LEVELS[v][2] }}>{cnt[v]}</b></div>)}<div className="kpi"><span>{L('Periodo revisado', 'Period reviewed')}</span><b>{L('12 meses hasta', '12 months to')} {MES[lang][end.month]} {end.year}</b></div></div>
      <div className="two">
        <div><h4 className="sh">{L('Cada punto es un lago (pasa el cursor)', 'Each dot is a lake (hover)')}</h4>
          <PlotView deps={[R, lang]} h={340} build={(Plot, w) => Plot.plot({ width: w, height: 340, marginLeft: 48, marginBottom: 40, style: { background: 'transparent', color: '#5b6b8c' }, r: { range: [4, 13] }, x: { label: L('Balance de agua: más seco ← σ → más húmedo', 'Water balance: drier ← σ → wetter'), domain: [-4.5, 4.5], grid: true }, y: { label: L('Temperatura (σ)', 'Temperature (σ)'), domain: [-4.5, 4.5], grid: true },
            marks: [Plot.rect([{ x1: -4.5, x2: -1.5, y1: 1.5, y2: 4.5 }], { x1: 'x1', x2: 'x2', y1: 'y1', y2: 'y2', fill: '#b91c1c', fillOpacity: 0.07 }), Plot.rect([{ x1: -1.5, x2: 1.5, y1: -1.5, y2: 1.5 }], { x1: 'x1', x2: 'x2', y1: 'y1', y2: 'y2', fill: '#0c7a5b', fillOpacity: 0.08 }), Plot.text([{ x: -3, y: 4.1, t: L('más seco y más cálido', 'drier and warmer') }], { x: 'x', y: 'y', text: 't', fill: '#b91c1c', fontWeight: 700 }), Plot.text([{ x: 0, y: -1.2, t: L('zona normal', 'normal zone') }], { x: 'x', y: 'y', text: 't', fill: '#0c7a5b', fontWeight: 700 }), Plot.ruleX([0], { stroke: '#9aa7ba' }), Plot.ruleY([0], { stroke: '#9aa7ba' }),
              Plot.dot(R.list, { x: (d) => Math.max(-4.4, Math.min(4.4, d.zw)), y: (d) => Math.max(-4.4, Math.min(4.4, d.zt)), r: (d) => Math.log10(d.area + 1.5), fill: (d) => LEVELS[d.level][2], fillOpacity: 0.85, stroke: '#fff', tip: true, title: (d) => `${d.name}\n${L('Balance', 'Balance')}: ${sg(d.zw, 1)} σ · ${L('Temperatura', 'Temperature')}: ${sg(d.zt, 1)} σ\n${why(d)}` })] })} /></div>
        <div><h4 className="sh">{L('Lagos ordenados por prioridad (toca uno para verlo)', 'Lakes ranked by priority (tap one to view it)')}</h4>
          <div className="tablewrap" style={{ maxHeight: 340 }}><Table fz="sm" verticalSpacing={4} highlightOnHover stickyHeader><Table.Thead><Table.Tr><Table.Th>{L('Lago', 'Lake')}</Table.Th><Table.Th>{L('Estado', 'Status')}</Table.Th><Table.Th>{L('Por qué', 'Why')}</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>{R.list.map((o) => <Table.Tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => { setLake(o.id); document.getElementById('lagos')?.scrollIntoView({ behavior: 'smooth' }); }}><Table.Td>{o.name}</Table.Td><Table.Td><span className="stag" style={{ color: LEVELS[o.level][2], borderColor: LEVELS[o.level][2] }}>{LEVELS[o.level][lang === 'es' ? 0 : 1]}</span></Table.Td><Table.Td>{why(o)} <span className="mini">({sg(o.zw, 1)} σ / {sg(o.zt, 1)} σ)</span></Table.Td></Table.Tr>)}</Table.Tbody></Table></div></div>
      </div>
      <p className="mini">{L('σ: cuántas desviaciones se aleja de lo normal de ese lago. Vigilar: más de 1,5 σ. Alerta: más de 2,5 σ y confirmada tras corregir por revisar muchos lagos a la vez (Benjamini-Hochberg). Los colores también se ven en el planeta de arriba. Es una señal estadística para priorizar, no una causa.', 'σ: how many deviations from that lake’s normal. Watch: above 1.5 σ. Alert: above 2.5 σ and confirmed after correcting for checking many lakes at once (Benjamini-Hochberg). Colors also show on the planet above. It is a statistical signal to prioritise, not a cause.')} {!R.live && <b>{L('Datos de práctica (simulados).', 'Practice (simulated) data.')}</b>}</p>
    </motion.div>)}
  </>);
}

/* ---------------- Constelación virtual: qué satélites observaron el lago ---------------- */
export function Satellites({ lake, L, lang }) {
  const [res, setRes] = useState(null), [busy, setBusy] = useState(false);
  const half = Math.max(0.04, Math.sqrt(Math.max(lake.area, 0.2)) / 111 / 1.4), box = [lake.lon - half, lake.lat - half, lake.lon + half, lake.lat + half].map((v) => +v.toFixed(3)), y0 = 2015, y1 = new Date().getUTCFullYear();
  useEffect(() => { setRes(null); }, [lake.id]);
  const run = async () => { setBusy(true); const out = await Promise.all(MISSIONS.map(async (m) => { try { return { m, ...(await cmrCoverage(m, box, y0, y1)) }; } catch { return { m, fail: true }; } })); setRes(out); setBusy(false); };
  const ok = res?.filter((r) => !r.fail && r.hits != null) || [], allFail = res && res.every((r) => r.fail), dl = deepLinks(lake.lat, lake.lon);
  const o = ok.length && { textStyle: { color: '#5b6b8c' }, grid: { left: 190, right: 60, top: 6, bottom: 24 }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, xAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f7' } } }, yAxis: { type: 'category', inverse: true, data: ok.map((r) => r.m[lang][0]), axisLabel: { color: '#14213d', width: 180, overflow: 'truncate' } }, series: [{ type: 'bar', data: ok.map((r) => r.hits), itemStyle: { color: '#1e3a8a', borderRadius: 6 }, label: { show: true, position: 'right' } }] };
  const more = [['NASA Worldview', dl.worldview], ['Earthdata Search', dl.search], ['SWOT (PO.DAAC)', 'https://podaac.jpl.nasa.gov/SWOT'], ['DAHITI', 'https://dahiti.dgfi.tum.de/'], ['Hydroweb', 'https://hydroweb.next.theia-land.fr/'], ['Global Surface Water', 'https://global-surface-water.appspot.com/map']];
  return (<>
    <p className="sub">{L('Ningún satélite basta solo: uno ve con nubes, otro mide la altura del agua, otro pasa más seguido. Consulta en vivo el catálogo de la NASA para saber cuántas escenas de cada misión cubren', 'No single satellite is enough: one sees through clouds, another measures water height, another passes more often. Query NASA’s catalog live to see how many scenes from each mission cover')} <b>{lake.name}</b> ({y0}–{y1}).</p>
    <Button color="navy" loading={busy} leftSection={<IconSatellite size={18} />} onClick={run}>{L('Consultar la constelación', 'Query the constellation')}</Button>
    {allFail && <Alert mt="sm" radius="lg" color="orange" icon={<IconWifiOff size={18} />}>{L('No se pudo conectar con el catálogo Earthdata (CMR). Revisa tu conexión; esta consulta solo funciona con internet.', 'Could not reach the Earthdata catalog (CMR). Check your connection; this query needs internet.')}</Alert>}
    {ok.length > 0 && (<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h4 className="sh">{L('Escenas disponibles sobre el lago', 'Scenes available over the lake')}</h4><EChart option={o} deps={[res, lang]} h={Math.max(200, ok.length * 38)} />
      <div className="tablewrap"><Table fz="sm" verticalSpacing={4}><Table.Thead><Table.Tr><Table.Th>{L('Misión', 'Mission')}</Table.Th><Table.Th>{L('Qué aporta', 'What it adds')}</Table.Th><Table.Th>{L('Detalle', 'Detail')}</Table.Th><Table.Th>{L('Escenas', 'Scenes')}</Table.Th><Table.Th /></Table.Tr></Table.Thead>
        <Table.Tbody>{ok.map((r) => <Table.Tr key={r.m.id}><Table.Td><b>{r.m[lang][0]}</b><br /><span className="mini">{r.short} v{r.version}{r.start ? ` · ${L('desde', 'since')} ${r.start}` : ''}</span></Table.Td><Table.Td>{r.m[lang][1]}</Table.Td><Table.Td>{r.m.res}</Table.Td><Table.Td><b>{r.hits}</b></Table.Td><Table.Td><a className="textlink" href={r.link} target="_blank" rel="noreferrer"><IconExternalLink size={14} /> {L('Ver escenas', 'See scenes')}</a></Table.Td></Table.Tr>)}</Table.Tbody></Table></div>
      <p className="mini">{L('Conteo en vivo del catálogo CMR de la NASA (el motor de Earthdata Search) dentro de un recuadro alrededor del lago. Descargar las escenas requiere una cuenta gratuita de Earthdata.', 'Live count from NASA’s CMR catalog (the engine behind Earthdata Search) inside a box around the lake. Downloading scenes requires a free Earthdata account.')}</p>
    </motion.div>)}
    <h4 className="sh">{L('Abrir este lago en otras herramientas', 'Open this lake in other tools')}</h4>
    <div className="linkrow">{more.map(([n, u]) => <a key={n} className="chiplink" href={u} target="_blank" rel="noreferrer">{n} <IconExternalLink size={13} /></a>)}</div>
    <p className="mini">{L('DAHITI e Hydroweb publican series de nivel de agua por altimetría; puedes descargarlas y subirlas como CSV en el laboratorio para probar su tendencia.', 'DAHITI and Hydroweb publish altimetry water-level series; download them and upload as CSV in the lab to test their trend.')}</p>
  </>);
}

/* ---------------- Reportes ciudadanos (React Hook Form + Zod) ---------------- */
const KINDS = [['bajo', 'El nivel del agua bajó', 'Water level dropped', -1], ['alto', 'El nivel del agua subió', 'Water level rose', 1], ['color', 'Cambió el color del agua', 'Water color changed', 0], ['algas', 'Hay algas o espuma', 'Algae or foam', 0], ['basura', 'Hay basura o relaves', 'Litter or tailings', 0], ['otro', 'Otro cambio', 'Other change', 0]];
const today = () => new Date().toISOString().slice(0, 10);
const rSchema = z.object({ lake: z.string().min(1, { error: 'lake' }), date: z.string().refine((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today() && d >= '1981-01-01', { error: 'date' }), kind: z.string().min(1, { error: 'kind' }), note: z.string().trim().min(15, { error: 'note' }).max(400, { error: 'note2' }), who: z.string().max(60).optional() });
const RMSG = { es: { lake: 'Elige el lago.', date: 'Pon una fecha válida, no futura.', kind: 'Elige qué observaste.', note: 'Describe lo que viste con al menos 15 letras.', note2: 'Máximo 400 letras.' }, en: { lake: 'Choose the lake.', date: 'Enter a valid, non-future date.', kind: 'Choose what you observed.', note: 'Describe what you saw in at least 15 characters.', note2: '400 characters maximum.' } };
const KEY = 'ts_reports_v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
export function Reports({ lake, L, lang }) {
  const { practice, lakes } = useStore();
  const [list, setList] = useState(load), [step, setStep] = useState(0), [busy, setBusy] = useState(false);
  const { control, handleSubmit, trigger, reset, setValue, watch, formState: { errors } } = useForm({ resolver: zodResolver(rSchema), mode: 'onChange', defaultValues: { lake: lake.id, date: today(), kind: '', note: '', who: '' } });
  useEffect(() => { setValue('lake', lake.id); }, [lake.id]);
  const err = (k) => (errors[k] ? RMSG[lang][errors[k].message] || errors[k].message : null), v = watch();
  const save = (l) => { setList(l); try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* sin almacenamiento */ } };
  const next = async () => { if (await trigger(step === 0 ? ['lake', 'date'] : ['kind', 'note'])) setStep(step + 1); };
  const submit = async (d) => {
    setBusy(true); const lk = lakes.find((x) => x.id === d.lake) || lake, kd = KINDS.find((k) => k[0] === d.kind), [y, m] = d.date.split('-').map(Number); let check = { code: 'na' };
    if (kd[3] !== 0) { try { const c = await lakeClimate(lk, practice), ctx = I.contextual(c.wb, { thr: 1.5, detrend: false }), i = c.wb.findIndex((p) => p.year === y && p.month === m - 1); if (i < 0) check = { code: 'nodata' }; else { const zs = ctx.z.slice(Math.max(0, i - 5), i + 1), zm = zs.reduce((a, b) => a + b, 0) / zs.length; check = { code: Math.sign(zm) === kd[3] && Math.abs(zm) >= 0.5 ? 'yes' : Math.abs(zm) < 0.5 ? 'neutral' : 'no', z: zm, live: c.live }; } } catch { check = { code: 'nodata' }; } }
    save([{ id: Date.now(), ...d, lakeName: lk.name, lat: lk.lat, lon: lk.lon, check }, ...list]); reset({ lake: lake.id, date: today(), kind: '', note: '', who: '' }); setStep(0); setBusy(false);
  };
  const csv = () => { const rows = ['fecha,lago,lat,lon,observacion,descripcion,observador,contraste,z', ...list.map((r) => [r.date, r.lakeName, r.lat, r.lon, r.kind, `"${String(r.note).replace(/"/g, "'")}"`, `"${r.who || ''}"`, r.check.code, r.check.z != null ? r.check.z.toFixed(2) : ''].join(','))]; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' })); a.download = 'reportes_ciudadanos.csv'; a.click(); };
  const txt = (c) => ({ yes: [L('Coincide con los datos', 'Matches the data'), '#0c5a43', L(`El balance de agua de los 6 meses previos estuvo ${sg(c.z, 1)} σ respecto de lo normal: los datos satelitales son coherentes con el reporte.`, `The water balance of the previous 6 months was ${sg(c.z, 1)} σ from normal: satellite data are consistent with the report.`)], no: [L('Los datos dicen lo contrario', 'Data say otherwise'), '#b91c1c', L(`El balance de agua estuvo ${sg(c.z, 1)} σ: apunta en sentido contrario. Vale la pena verificar en campo o revisar si hubo extracción de agua.`, `The water balance was ${sg(c.z, 1)} σ: it points the other way. Worth a field check or a look at water withdrawals.`)], neutral: [L('Los datos no muestran nada inusual', 'Data show nothing unusual'), '#d97706', L(`El balance de agua estuvo cerca de lo normal (${sg(c.z, 1)} σ). El cambio podría deberse a causas locales que el clima no explica.`, `The water balance was near normal (${sg(c.z, 1)} σ). The change may have local causes climate does not explain.`)], nodata: [L('Aún sin datos para contrastar', 'No data to compare yet'), '#5b6b8c', L('Todavía no hay datos de ese mes. El reporte queda guardado.', 'No data for that month yet. The report is saved.')], na: [L('Para verificar en campo', 'For field verification'), '#5b6b8c', L('Este tipo de observación no se puede contrastar con datos de clima; queda registrada para quien monitorea la calidad del agua.', 'This kind of observation cannot be checked against climate data; it stays on record for water-quality monitoring.')] }[c.code]);
  return (<div className="two" style={{ alignItems: 'start' }}>
    <form className="wizard" onSubmit={handleSubmit(submit)}>
      <p className="sub" style={{ margin: 0 }}>{L('¿Viste un cambio en un lago? Repórtalo. La app lo contrasta con los datos satelitales del mismo periodo.', 'Did you see a change in a lake? Report it. The app checks it against satellite data for the same period.')}</p>
      <Stepper active={step} size="xs" color="forest" completedIcon={<IconCheck size={14} />} allowNextStepsSelect={false}><Stepper.Step label={L('Dónde y cuándo', 'Where and when')} /><Stepper.Step label={L('Qué viste', 'What you saw')} /><Stepper.Step label={L('Enviar', 'Send')} /></Stepper>
      <div className="wizbody" style={{ minHeight: 190 }}><AnimatePresence mode="wait"><motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
        {step === 0 && (<><Controller name="lake" control={control} render={({ field }) => <Select searchable label={L('Lago', 'Lake')} data={lakes.map((l) => ({ value: l.id, label: l.name }))} value={field.value} onChange={(x) => field.onChange(x || '')} error={err('lake')} />} />
          <Controller name="date" control={control} render={({ field }) => <TextInput mt="sm" type="date" label={L('Fecha de la observación', 'Observation date')} max={today()} value={field.value} onChange={field.onChange} error={err('date')} />} /></>)}
        {step === 1 && (<><span className="mini" style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{L('¿Qué observaste?', 'What did you observe?')}</span>
          <Controller name="kind" control={control} render={({ field }) => <div className="kinds">{KINDS.map(([id, es, en]) => <button type="button" key={id} className={field.value === id ? 'on' : ''} onClick={() => field.onChange(id)}>{L(es, en)}</button>)}</div>} />{err('kind') && <p className="wizerr">{err('kind')}</p>}
          <Controller name="note" control={control} render={({ field }) => <Textarea mt="sm" autosize minRows={2} maxRows={4} label={L('Describe lo que viste', 'Describe what you saw')} placeholder={L('Ejemplo: la orilla retrocedió unos 20 metros frente al muelle.', 'Example: the shore retreated about 20 meters by the pier.')} {...field} error={err('note')} description={`${field.value.trim().length}/400`} />} /></>)}
        {step === 2 && (<><Controller name="who" control={control} render={({ field }) => <TextInput label={L('Tu nombre o institución (opcional)', 'Your name or institution (optional)')} {...field} />} />
          <div className="wizsum" style={{ marginTop: 12 }}><div><span>{L('Reporte', 'Report')}</span><b>{lakes.find((l) => l.id === v.lake)?.name} · {v.date} · {L(...(KINDS.find((k) => k[0] === v.kind) || ['', '', '']).slice(1, 3))}</b></div></div>
          <p className="mini">{L('Se guarda solo en este navegador. Para compartir reportes entre usuarios hace falta el servidor de la siguiente etapa.', 'Saved only in this browser. Sharing reports between users needs the next-stage server.')}</p></>)}
      </motion.div></AnimatePresence></div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Button variant="subtle" color="gray" leftSection={<IconArrowLeft size={16} />} onClick={() => setStep(step - 1)} style={{ visibility: step ? 'visible' : 'hidden' }}>{L('Atrás', 'Back')}</Button>
        {step < 2 ? <Button key="n" type="button" color="forest" rightSection={<IconArrowRight size={16} />} onClick={next}>{L('Continuar', 'Continue')}</Button> : <Button key="s" type="submit" color="forest" loading={busy} leftSection={<IconSend size={16} />}>{L('Enviar reporte', 'Send report')}</Button>}
      </div>
    </form>
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}><h4 className="sh" style={{ margin: 0 }}>{L('Reportes guardados', 'Saved reports')} ({list.length})</h4>{list.length > 0 && <span className="row" style={{ gap: 12 }}><button className="textlink" onClick={csv}><IconDownload size={14} /> CSV</button><button className="textlink" onClick={() => save([])}><IconTrash size={14} /> {L('Borrar', 'Clear')}</button></span>}</div>
      {!list.length && <p className="mini">{L('Todavía no hay reportes. El primero puede ser el tuyo.', 'No reports yet. The first one can be yours.')}</p>}
      <div className="replist"><AnimatePresence>{list.map((r) => { const [t, c, why] = txt(r.check), kd = KINDS.find((k) => k[0] === r.kind); return (
        <motion.div key={r.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rep"><div className="row" style={{ justifyContent: 'space-between', gap: 8 }}><b>{r.lakeName}</b><span className="stag" style={{ color: c, borderColor: c }}>{t}</span></div>
          <span className="mini">{r.date} · {L(kd?.[1], kd?.[2])}{r.who ? ` · ${r.who}` : ''}</span><p>{r.note}</p><span className="mini">{why}{r.check.live === false ? L(' (datos de práctica)', ' (practice data)') : ''}</span></motion.div>); })}</AnimatePresence></div>
    </div>
  </div>);
}
export { TYPES };
