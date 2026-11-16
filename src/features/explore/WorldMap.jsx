import { useEffect, useMemo, useRef, useState } from 'react';
import Ghost from '../../ui/Ghost';
import { Button, Select, Progress, SegmentedControl } from '@mantine/core';
import Earth from '../../shared/earth/Earth';
import FlatMap from './FlatMap';
import { IconRadar2, IconMap2, IconFlask, IconZoomIn, IconZoomOut, IconWorldSearch } from '@tabler/icons-react';
import PageHead from '../../layout/PageHead';
import { motion } from 'framer-motion';
import * as d3 from 'd3';
import * as S from '../../lib/analysis/stats';
import { bh } from '../../lib/analysis/advanced';
import { V, KEYS, PLACES, power, demo } from '../../lib/nasa/data';
import { useStore, placeLabel } from '../../core/store';
import { useT } from '../../core/i18n';
import { EChart, useWidth } from '../../shared/charts/hooks';
import { useRequest, aborted } from '../../core/useRequest';
import { runAnalysis } from '../../lib/analysis/run';
import { coverageOf } from '../../lib/data/monthly';
import { useRouteState } from '../../core/useRouteState';
const UP = '#c2410c', DOWN = '#1e40af';
export default function WorldMap() {
  const { lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b);
  const { place, setPlace, setMapOpen, scan, setScan, openCase, practice } = useStore();
  const [ref, w] = useWidth(); const h = Math.round(Math.min(560, Math.max(280, w * 0.52)));
  const [mode, setMode] = useRouteState('mapa', 'globe', (value) => ['globe', 'map'].includes(value)); const [k, setK] = useRouteState('variable', 'T2M', (value) => KEYS.includes(value)); const [prog, setProg] = useState(null);
  const begin = useRequest([k, practice]);
  useEffect(() => { setProg(null); }, [k, practice]);
  const run = async () => {
    const request = begin(), items = []; let done = 0; setProg(0);
    try {
      const y1 = new Date().getUTCFullYear() - 1, q = [...PLACES];
      await Promise.all(Array.from({ length: 4 }, async () => { while (q.length && request.current()) {
        const p = q.shift();
        try { const points = practice ? demo(p.lat, p.lon, [k], 1981, y1)[k] : (await power(p.lat, p.lon, [k], 1981, y1, { signal: request.signal }))[k];
          if (points?.length >= 24) items.push({ points, meta: { id: p.id, lat: p.lat, lon: p.lon, name: p[lang], source: practice ? 'demo' : 'NASA POWER', coverage: coverageOf(points) } });
        } catch (error) { if (aborted(error)) throw error; }
        if (request.current()) setProg(Math.round((++done / PLACES.length) * 70));
      } }));
      const out = await runAnalysis('scan', { items, options: {} }, { signal: request.signal, onProgress: (progress) => request.current() && setProg(70 + Math.round(progress * 30)) });
      if (!request.current()) return;
      const sig = bh(out.map((o) => o.p)); out.forEach((o, i) => { o.fdr = sig[i]; }); out.sort((a, b) => b.perDec - a.perDec);
      setScan({ k, live: !practice, practice, missing: PLACES.length - out.length, list: out, naive: out.filter((o) => o.p < 0.05).length, fdr: out.filter((o) => o.fdr).length });
    } catch (error) { if (request.current() && !aborted(error)) setScan({ k, live: !practice, practice, list: [], missing: PLACES.length, naive: 0, fdr: 0 }); }
    finally { if (request.current()) setProg(null); }
  };
  const res = scan && scan.k === k && scan.practice === practice ? scan : null;
  const max = res ? d3.max(res.list, (d) => Math.abs(d.perDec)) || 1 : 1;
  const dots = res ? res.list : PLACES.map((p) => ({ id: p.id, lat: p.lat, lon: p.lon, name: p[lang] }));
  const bar = res && { grid: { left: 150, right: 30, top: 6, bottom: 22 }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, xAxis: { type: 'value', axisLabel: { color: '#5b6b8c' }, splitLine: { lineStyle: { color: 'rgba(91,107,140,.18)' } } }, yAxis: { type: 'category', inverse: true, data: res.list.map((d) => d.name), axisLabel: { color: '#14213d', fontSize: 11, width: 140, overflow: 'truncate' } },
    series: [{ type: 'bar', data: res.list.map((d) => ({ value: +d.perDec.toFixed(4), itemStyle: { color: d.perDec >= 0 ? UP : DOWN, opacity: d.fdr ? 1 : 0.35, borderRadius: 4 } })) }] };
  const nUp = res ? res.list.filter((d) => d.fdr && d.perDec > 0).length : 0, nDn = res ? res.list.filter((d) => d.fdr && d.perDec < 0).length : 0;
  return (
    <section id="mapa"><div className="wrap">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <PageHead lot="globe" icon={IconWorldSearch} eyebrow={L('Explorar el planeta', 'Explore the planet')} title={L('¿Dónde está cambiando la Tierra?', 'Where is the Earth changing?')} sub={L('Una misma variable puede subir en una región y bajar en otra. Escanea 30 lugares con la misma prueba, mira 12 capas satelitales de la NASA y haz clic en cualquier punto para investigarlo.', 'The same variable can rise in one region and fall in another. Scan 30 places with the same test, view 12 NASA satellite layers and click any point to investigate it.')} />
      </motion.div>
      <div className="card mapbar">
        <Select w={260} data={KEYS.map((x) => ({ value: x, label: V[x][lang][0] }))} value={k} onChange={setK} allowDeselect={false} label={L('Variable a escanear', 'Variable to scan')} />
        <Button color="forest" size="md" leftSection={<IconRadar2 size={18} />} loading={prog != null} onClick={run}>{L('Escanear el mundo', 'Scan the world')}</Button>
        <SegmentedControl style={{ marginLeft: 'auto' }} color="navy" value={mode} onChange={setMode} data={[{ value: 'globe', label: L('Planeta 3D', '3D planet') }, { value: 'map', label: L('Mapa plano', 'Flat map') }]} />
      </div>
      {prog != null && <Progress value={prog} color="forest" mt={8} animated />}
      {mode === 'globe' && <div className="card mapcard globemode"><Earth mode="explore" /></div>}
      <div className="card mapcard" ref={ref} style={{ display: mode === 'map' ? 'block' : 'none' }}>
        {mode === 'map' && <FlatMap dots={dots} res={res} place={place} setPlace={setPlace} k={k} vlabel={V[k][lang][0]} />}
        <div className="mapsel"><span className="mini">{L('Tu punto', 'Your point')}</span><b>{placeLabel(place, PLACES, lang)}</b>
          <Button size="compact-sm" color="forest" mt={6} leftSection={<IconFlask size={14} />} onClick={() => openCase({ vars: [k, ...(k === 'T2M' ? ['PRECTOTCORR'] : ['T2M'])] }, place)}>{L('Investigar', 'Investigate')}</Button>
          <button className="textlink" onClick={() => setMapOpen(true)}><IconMap2 size={14} /> {L('Ver satélite', 'Satellite view')}</button></div>
        <div className="maplegend"><span><i style={{ background: UP }} />{L('Sube', 'Rising')}</span><span><i style={{ background: DOWN }} />{L('Baja', 'Falling')}</span><span><i className="hollow" />{L('No significativo', 'Not significant')}</span><span><i className="ring" />{L('Tu punto', 'Your point')}: {place.lat}°, {place.lon}°</span></div>
      </div>
      {res && (
        <motion.div className="two" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card panel"><Ghost k="globe" i={3} size={190} pos={3} />
            <h3>{L('Resultado del escaneo', 'Scan result')} · {V[k][lang][0]}</h3>
            <div className="kpis">
              <div className="kpi"><span>{L('Suben (significativo)', 'Rising (significant)')}</span><b style={{ color: UP }}>{nUp}</b></div>
              <div className="kpi"><span>{L('Bajan (significativo)', 'Falling (significant)')}</span><b style={{ color: DOWN }}>{nDn}</b></div>
              <div className="kpi"><span>p &lt; 0,05 {L('sin corregir', 'uncorrected')}</span><b>{res.naive} / {res.list.length}</b></div>
              <div className="kpi"><span>{L('Tras corrección FDR', 'After FDR correction')}</span><b>{res.fdr} / {res.list.length}</b></div>
            </div>
            <p className="mini">{L('Al probar 30 lugares a la vez, algunos saldrían “significativos” solo por azar. Aplicamos Benjamini-Hochberg (tasa de falsos descubrimientos al 5 %), como recomienda Wilks (2016).', 'Testing 30 places at once, some would look “significant” by chance alone. We apply Benjamini-Hochberg (5 % false discovery rate), as Wilks (2016) recommends.')} {!res.live && L('Datos de práctica (simulados).', 'Practice (simulated) data.')} {res.missing > 0 && L(`${res.missing} lugares sin datos suficientes; no se sustituyeron por simulaciones.`, `${res.missing} locations lack sufficient data; they were not replaced with simulations.`)}</p>
          </div>
          <div className="card panel"><h3>{L('Ranking por década', 'Ranking per decade')} ({V[k].u})</h3><EChart option={bar} deps={[res]} h={Math.max(320, res.list.length * 17)} /></div>
        </motion.div>
      )}
    </div></section>
  );
}
