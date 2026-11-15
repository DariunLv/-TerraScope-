import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Select, Progress, SegmentedControl } from '@mantine/core';
import PlanetStage from './PlanetStage';
import { IconRadar2, IconMap2, IconFlask, IconZoomIn, IconZoomOut } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import world from '../lib/world110.json';
import * as S from '../lib/stats';
import { bh } from '../lib/advanced';
import { V, KEYS, PLACES, power, demo } from '../lib/data';
import { useStore, placeLabel } from '../store';
import { useT } from '../i18n';
import { EChart, useWidth } from './charts/hooks';
const land = feature(world, world.objects.countries);
const UP = '#c2410c', DOWN = '#1e40af';
export default function WorldMap() {
  const { lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b);
  const { place, setPlace, setMapOpen, scan, setScan, openCase, practice } = useStore();
  const [ref, w] = useWidth(); const h = Math.round(Math.min(560, Math.max(280, w * 0.52)));
  const [mode, setMode] = useState('map'); const [k, setK] = useState('T2M'); const [prog, setProg] = useState(null); const [tf, setTf] = useState(d3.zoomIdentity); const [hov, setHov] = useState(null);
  const svg = useRef(null); const zoomB = useRef(null);
  const proj = useMemo(() => d3.geoNaturalEarth1().fitSize([w, h], { type: 'Sphere' }), [w, h]);
  const path = useMemo(() => d3.geoPath(proj), [proj]);
  const paths = useMemo(() => ({ sphere: path({ type: 'Sphere' }), grat: path(d3.geoGraticule10()), land: land.features.map((f) => path(f)) }), [path]);
  useEffect(() => {
    zoomB.current = d3.zoom().scaleExtent([1, 8]).translateExtent([[0, 0], [w, h]]).on('zoom', (e) => setTf(e.transform));
    d3.select(svg.current).call(zoomB.current).on('dblclick.zoom', null);
  }, [w, h]);
  const zoomBy = (f) => d3.select(svg.current).transition().duration(300).call(zoomB.current.scaleBy, f);
  const click = (e) => {
    const [x, y] = d3.pointer(e, svg.current), c = proj.invert(tf.invert([x, y]));
    if (c && Math.abs(c[1]) <= 90 && Math.abs(c[0]) <= 180) setPlace({ id: 'custom', lat: +c[1].toFixed(2), lon: +c[0].toFixed(2) });
  };
  const run = async () => {
    const out = []; let live = !practice, done = 0; setProg(0);
    const one = async (p) => {
      let d;
      if (live) { try { d = (await power(p.lat, p.lon, [k], 1981, 2025))[k]; } catch { live = false; } }
      if (!d) d = demo(p.lat, p.lon, [k], 1981, 2025)[k];
      try { const r = S.analyze(d, {}); out.push({ id: p.id, lat: p.lat, lon: p.lon, name: p[lang], perDec: r.perDec, p: r.p, level: r.level }); } catch { /* corta */ }
      setProg(Math.round((++done / PLACES.length) * 100));
    };
    const q = [...PLACES]; await Promise.all(Array.from({ length: 4 }, async () => { while (q.length) await one(q.shift()); }));
    const sig = bh(out.map((o) => o.p)); out.forEach((o, i) => { o.fdr = sig[i]; });
    out.sort((a, b) => b.perDec - a.perDec);
    setScan({ k, live, list: out, naive: out.filter((o) => o.p < 0.05).length, fdr: out.filter((o) => o.fdr).length }); setProg(null);
  };
  const res = scan && scan.k === k ? scan : null;
  const max = res ? d3.max(res.list, (d) => Math.abs(d.perDec)) || 1 : 1;
  const rad = (d) => 5 + 11 * Math.sqrt(Math.abs(d.perDec) / max);
  const dots = res ? res.list : PLACES.map((p) => ({ id: p.id, lat: p.lat, lon: p.lon, name: p[lang] }));
  const cur = proj([place.lon, place.lat]);
  const bar = res && { grid: { left: 150, right: 30, top: 6, bottom: 22 }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, xAxis: { type: 'value', axisLabel: { color: '#5b6b8c' }, splitLine: { lineStyle: { color: 'rgba(91,107,140,.18)' } } }, yAxis: { type: 'category', inverse: true, data: res.list.map((d) => d.name), axisLabel: { color: '#14213d', fontSize: 11, width: 140, overflow: 'truncate' } },
    series: [{ type: 'bar', data: res.list.map((d) => ({ value: +d.perDec.toFixed(4), itemStyle: { color: d.perDec >= 0 ? UP : DOWN, opacity: d.fdr ? 1 : 0.35, borderRadius: 4 } })) }] };
  const nUp = res ? res.list.filter((d) => d.fdr && d.perDec > 0).length : 0, nDn = res ? res.list.filter((d) => d.fdr && d.perDec < 0).length : 0;
  return (
    <section id="mapa"><div className="wrap">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <h2>{L('Mapa mundial: ¿dónde está cambiando?', 'World map: where is it changing?')}</h2>
        <p className="sub">{L('Una misma variable puede subir en una región y bajar en otra. Escanea 30 lugares del planeta con la misma prueba y míralo en el mapa. Haz clic en cualquier parte del mapa para investigar ese punto.', 'The same variable can rise in one region and fall in another. Scan 30 places with the same test and see it on the map. Click anywhere on the map to investigate that point.')}</p>
      </motion.div>
      <div className="card mapbar">
        <Select w={260} data={KEYS.map((x) => ({ value: x, label: V[x][lang][0] }))} value={k} onChange={setK} allowDeselect={false} label={L('Variable a escanear', 'Variable to scan')} />
        <Button color="forest" size="md" leftSection={<IconRadar2 size={18} />} loading={prog != null} onClick={run}>{L('Escanear el mundo', 'Scan the world')}</Button>
        <SegmentedControl style={{ marginLeft: 'auto' }} color="navy" value={mode} onChange={setMode} data={[{ value: 'map', label: L('Mapa plano', 'Flat map') }, { value: 'globe', label: L('Globo 3D', '3D globe') }]} />
      </div>
      {prog != null && <Progress value={prog} color="forest" mt={8} animated />}
      {mode === 'globe' && <div className="card mapcard globemode"><PlanetStage /><p className="mini" style={{ textAlign: 'center', margin: '0 0 10px' }}>{L('Después de escanear, los puntos del globo se pintan de naranja (sube) o azul (baja).', 'After scanning, globe points turn orange (rising) or blue (falling).')}</p></div>}
      <div className="card mapcard" ref={ref} style={{ display: mode === 'map' ? 'block' : 'none' }}>
        <svg ref={svg} width={w} height={h} onClick={click} style={{ display: 'block', cursor: 'crosshair', touchAction: 'none' }}>
          <g transform={tf.toString()}>
            <path d={paths.sphere} fill="#dcecf7" />
            <path d={paths.grat} fill="none" stroke="#b9d3e6" strokeWidth={0.5 / tf.k} />
            {paths.land.map((d, i) => <path key={i} d={d} fill="#f7f4ec" stroke="#9fb3a6" strokeWidth={0.6 / tf.k} />)}
            {dots.map((d) => { const [x, y] = proj([d.lon, d.lat]); const r = (res ? rad(d) : 5) / Math.sqrt(tf.k); const col = res ? (d.perDec >= 0 ? UP : DOWN) : '#0c5a43'; return (
              <g key={d.id} onClick={(e) => { e.stopPropagation(); setPlace({ id: d.id, lat: d.lat, lon: d.lon }); }} onMouseEnter={() => setHov(d)} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
                <circle cx={x} cy={y} r={r} fill={col} fillOpacity={res ? (d.fdr ? 0.9 : 0.15) : 0.85} stroke={col} strokeWidth={1.6 / tf.k} strokeDasharray={res && !d.fdr ? `${3 / tf.k} ${2 / tf.k}` : null} />
              </g>); })}
            {cur && <g pointerEvents="none"><circle cx={cur[0]} cy={cur[1]} r={11 / Math.sqrt(tf.k)} fill="none" stroke="#0b3d2e" strokeWidth={2.4 / tf.k} /><circle cx={cur[0]} cy={cur[1]} r={2.6 / Math.sqrt(tf.k)} fill="#0b3d2e" /></g>}
          </g>
        </svg>
        <div className="mapzoom"><button onClick={() => zoomBy(1.6)} aria-label="zoom in"><IconZoomIn size={18} /></button><button onClick={() => zoomBy(1 / 1.6)} aria-label="zoom out"><IconZoomOut size={18} /></button></div>
        {hov && <div className="maptip"><b>{hov.name}</b>{hov.perDec != null && <div>{hov.perDec > 0 ? '+' : ''}{hov.perDec.toFixed(V[k].d)} {V[k].u} / {L('década', 'decade')} · p = {hov.p < 0.001 ? '< 0.001' : hov.p.toFixed(3)} · {hov.fdr ? L('significativo (FDR)', 'significant (FDR)') : L('no significativo', 'not significant')}</div>}</div>}
        <div className="mapsel"><span className="mini">{L('Tu punto', 'Your point')}</span><b>{placeLabel(place, PLACES, lang)}</b>
          <Button size="compact-sm" color="forest" mt={6} leftSection={<IconFlask size={14} />} onClick={() => openCase({ vars: [k, ...(k === 'T2M' ? ['PRECTOTCORR'] : ['T2M'])] }, place)}>{L('Investigar', 'Investigate')}</Button>
          <button className="textlink" onClick={() => setMapOpen(true)}><IconMap2 size={14} /> {L('Ver satélite', 'Satellite view')}</button></div>
        <div className="maplegend"><span><i style={{ background: UP }} />{L('Sube', 'Rising')}</span><span><i style={{ background: DOWN }} />{L('Baja', 'Falling')}</span><span><i className="hollow" />{L('No significativo', 'Not significant')}</span><span><i className="ring" />{L('Tu punto', 'Your point')}: {place.lat}°, {place.lon}°</span></div>
      </div>
      {res && (
        <motion.div className="two" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card panel">
            <h3>{L('Resultado del escaneo', 'Scan result')} · {V[k][lang][0]}</h3>
            <div className="kpis">
              <div className="kpi"><span>{L('Suben (significativo)', 'Rising (significant)')}</span><b style={{ color: UP }}>{nUp}</b></div>
              <div className="kpi"><span>{L('Bajan (significativo)', 'Falling (significant)')}</span><b style={{ color: DOWN }}>{nDn}</b></div>
              <div className="kpi"><span>p &lt; 0,05 {L('sin corregir', 'uncorrected')}</span><b>{res.naive} / {res.list.length}</b></div>
              <div className="kpi"><span>{L('Tras corrección FDR', 'After FDR correction')}</span><b>{res.fdr} / {res.list.length}</b></div>
            </div>
            <p className="mini">{L('Al probar 30 lugares a la vez, algunos saldrían “significativos” solo por azar. Aplicamos Benjamini-Hochberg (tasa de falsos descubrimientos al 5 %), como recomienda Wilks (2016).', 'Testing 30 places at once, some would look “significant” by chance alone. We apply Benjamini-Hochberg (5 % false discovery rate), as Wilks (2016) recommends.')} {!res.live && L('Datos de práctica (simulados).', 'Practice (simulated) data.')}</p>
          </div>
          <div className="card panel"><h3>{L('Ranking por década', 'Ranking per decade')} ({V[k].u})</h3><EChart option={bar} deps={[res]} h={Math.max(320, res.list.length * 17)} /></div>
        </motion.div>
      )}
    </div></section>
  );
}
