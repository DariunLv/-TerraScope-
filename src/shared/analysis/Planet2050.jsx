/* Pestaña “Planeta 2050”: el cambio se ve en el mismo planeta.
   - Línea de tiempo continua: años pasados con la FOTO satelital real de la NASA (MODIS, 15 de julio de cada año)
     y años futuros con la proyección validada (halo de calor sobre la última foto real).
   - Termómetro que sube y baja, cortina “antes / después”, tres escenarios y botón de foto (PNG con datos y créditos). */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Slider, SegmentedControl, Button, Alert, Switch } from '@mantine/core';
import { IconPlayerPlay, IconPlayerPause, IconRefresh, IconInfoCircle, IconCamera, IconPlus, IconMinus, IconTags } from '@tabler/icons-react';
import * as C from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { mesh } from 'topojson-client';
import world from '../../lib/geo/world110.json';
import { V, sourceOf } from '../../lib/nasa/data';
import { layerById } from '../../lib/nasa/nasa';
import { isTemp } from '../../lib/analysis/viz';
import * as I from '../../lib/analysis/intel';
import { COUNTRIES, cname, tier, provider } from '../earth/EarthView';
import { addNames } from '../earth/names';
import { takePhoto } from '../earth/photo';
import Interpret from '../Interpret';

const col = (c, a = 1) => C.Color.fromCssColorString(c).withAlpha(a);
const WARM = '#c2410c', COOL = '#1e40af', NOW = new Date(), LASTY = NOW.getUTCFullYear() - (NOW.getUTCMonth() < 7 ? 1 : 0); // último año con foto de julio
const mean = (a) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
const heatCache = {};
const heatImg = (hex) => { // degradado radial: el centro es el más intenso y se funde con la foto
  if (heatCache[hex]) return heatCache[hex];
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, hex + 'ff'); gr.addColorStop(0.35, hex + 'b3'); gr.addColorStop(0.7, hex + '40'); gr.addColorStop(1, hex + '00'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return (heatCache[hex] = c.toDataURL('image/png'));
};

/* ---------- planeta ---------- */
function Globe({ pl, layerId, photoYear, compareYear, split, pos, color, intensity, showHeat, label, lang, names, snapRef }) {
  const el = useRef(null), Vw = useRef(null), ds = useRef(null), lyr = useRef([]), [ready, setReady] = useState(false), [flash, setFlash] = useState(false), errs = useRef(0), [net, setNet] = useState(true);
  useEffect(() => {
    let v;
    try {
      v = new C.Viewer(el.current, {
        animation: false, timeline: false, baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false, navigationHelpButton: false, fullscreenButton: false, infoBox: false, selectionIndicator: false,
        scene3DOnly: true, skyBox: false, showRenderLoopErrors: false, contextOptions: { webgl: { preserveDrawingBuffer: true } },
        baseLayer: C.ImageryLayer.fromProviderAsync(C.TileMapServiceImageryProvider.fromUrl(C.buildModuleUrl('Assets/Textures/NaturalEarthII'))),
      });
    } catch (e) { console.warn('Cesium', e); return undefined; }
    Vw.current = v; const sc = v.scene;
    sc.backgroundColor = col('#050b1c'); sc.globe.baseColor = col('#0b2a4a'); if (sc.sun) sc.sun.show = false; if (sc.moon) sc.moon.show = false;
    sc.globe.enableLighting = false; sc.fog.enabled = false; sc.globe.showGroundAtmosphere = true; sc.skyAtmosphere.show = true;
    sc.screenSpaceCameraController.minimumZoomDistance = 8000; sc.screenSpaceCameraController.maximumZoomDistance = 3.6e7;
    if (window.innerWidth > 720) { v.useBrowserRecommendedResolution = false; v.resolutionScale = Math.min(window.devicePixelRatio || 1, 1.5); }
    v.cesiumWidget.screenSpaceEventHandler.removeInputAction(C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    const bm = v.imageryLayers.addImageryProvider(provider(layerById('base'), '', () => {})); bm.brightness = 1.05;
    ds.current = { heat: new C.CustomDataSource('heat'), b: new C.CustomDataSource('b'), l: new C.CustomDataSource('l') };
    ['b', 'l', 'heat'].forEach((n) => v.dataSources.add(ds.current[n]));
    mesh(world, world.objects.countries).coordinates.forEach((line) => { if (line.length > 1) ds.current.b.entities.add({ polyline: { positions: C.Cartesian3.fromDegreesArray(line.flat()), width: 1, material: col('#ffffff', 0.5) } }); });
    v.camera.setView({ destination: C.Cartesian3.fromDegrees(pl.lon, pl.lat, 1.2e7) });
    v.camera.flyTo({ destination: C.Cartesian3.fromDegrees(pl.lon, pl.lat, 2.6e6), duration: 2.6 });
    snapRef.current = { photo: (o) => { const r = takePhoto(v, o); setFlash(true); setTimeout(() => setFlash(false), 450); return r; }, zoom: (f) => { const p = v.camera.positionCartographic; v.camera.flyTo({ destination: C.Cartesian3.fromRadians(p.longitude, p.latitude, Math.max(9000, Math.min(3.4e7, p.height * f))), duration: 0.45 }); }, home: () => v.camera.flyTo({ destination: C.Cartesian3.fromDegrees(pl.lon, pl.lat, 2.6e6), duration: 1.4 }) };
    setReady(true);
    return () => { Vw.current = null; snapRef.current = null; try { v.destroy(); } catch { /* ya destruido */ } };
  }, [pl.lat, pl.lon]);
  /* nombres de todo el planeta */
  useEffect(() => {
    const d = ds.current?.l, v = Vw.current; if (!ready || !d) return; d.entities.removeAll(); if (!names) return;
    COUNTRIES.forEach((c) => { const T = tier(c.area); d.entities.add({ position: C.Cartesian3.fromDegrees(c.c[0], c.c[1]), label: { text: cname(c, lang).toUpperCase(), font: `${T === 0 ? 700 : 600} ${T > 1 ? 11 : 12}px Inter, sans-serif`, fillColor: col('#ffffff', 0.96), outlineColor: col('#0b1630', 0.85), outlineWidth: 3, style: C.LabelStyle.FILL_AND_OUTLINE, distanceDisplayCondition: new C.DistanceDisplayCondition(0, [2.4e7, 1.2e7, 5e6, 2.2e6][T]), scaleByDistance: new C.NearFarScalar(1.5e6, 1.25, 2.5e7, 0.75) } }); });
    addNames(C, d, lang, 'full'); v.scene.requestRender();
  }, [ready, lang, names]);
  /* foto satelital real de la NASA (o capa elegida) */
  useEffect(() => {
    const v = Vw.current; if (!ready || !v) return; const t = setTimeout(() => { // espera a que el control de año se detenga
      lyr.current.forEach((l) => v.imageryLayers.remove(l, true)); lyr.current = []; errs.current = 0; setNet(true);
      const def = layerById(layerId); if (layerId === 'base') { v.scene.splitPosition = 0.5; v.scene.requestRender(); return; }
      const onErr = () => { errs.current += 1; if (errs.current === 8) setNet(false); };
      const add = (y, dir) => { const l = v.imageryLayers.addImageryProvider(provider(def, def.fixed ? '' : `${y}-07-15`, onErr)); if (def.over) l.alpha = 0.88; if (dir != null) l.splitDirection = dir; lyr.current.push(l); };
      if (split && !def.fixed) { add(compareYear, C.SplitDirection.LEFT); add(photoYear, C.SplitDirection.RIGHT); } else add(photoYear);
      v.scene.requestRender();
    }, 220);
    return () => clearTimeout(t);
  }, [ready, layerId, photoYear, compareYear, split]);
  useEffect(() => { const v = Vw.current; if (ready && v) { v.scene.splitPosition = pos; v.scene.requestRender(); } }, [ready, pos, split]);
  /* halo de calor: el cambio se pinta sobre el propio planeta */
  useEffect(() => {
    const d = ds.current?.heat, v = Vw.current; if (!ready || !d) return; d.entities.removeAll();
    if (showHeat) {
      const p = C.Cartesian3.fromDegrees(pl.lon, pl.lat), k = Math.max(0.12, Math.min(1, intensity)), r = 160000 + 650000 * k;
      d.entities.add({ position: p, ellipse: { semiMajorAxis: r, semiMinorAxis: r, height: 0, material: new C.ImageMaterialProperty({ image: heatImg(color), transparent: true, color: C.Color.WHITE.withAlpha(0.35 + 0.6 * k) }) } });
    }
    d.entities.add({ position: C.Cartesian3.fromDegrees(pl.lon, pl.lat), point: { pixelSize: 11, color: col(color), outlineColor: C.Color.WHITE, outlineWidth: 2.5, disableDepthTestDistance: Number.POSITIVE_INFINITY }, label: { text: label, font: '700 15px Inter, sans-serif', fillColor: C.Color.WHITE, outlineColor: col('#0b1630'), outlineWidth: 5, style: C.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new C.Cartesian2(0, -28), disableDepthTestDistance: Number.POSITIVE_INFINITY } });
    v.scene.requestRender();
  }, [ready, color, intensity, label, showHeat, pl.lat, pl.lon]);
  return (<>
    <div ref={el} className="f50globe" />
    {flash && <div className="snapflash" />}
    {!net && <div className="earthnote" style={{ bottom: 56 }}>{lang === 'es' ? 'No se pudo cargar esta capa (sin internet o sin imagen para esa fecha).' : 'This layer could not load (offline or no image for that date).'}</div>}
  </>);
}

/* ---------- termómetro ---------- */
function Thermo({ lo, hi, val, q05, q95, base, color, unit, d, hoy }) {
  const H = 300, y = (x) => H - ((x - lo) / (hi - lo || 1)) * H, ticks = Array.from({ length: 6 }, (_, i) => lo + ((hi - lo) * i) / 5);
  return (
    <svg viewBox="0 0 150 372" className="thermo" role="img" aria-label="termómetro">
      <g transform="translate(60,16)">
        <rect x="0" y="0" width="28" height={H} rx="14" fill="#eef2f7" stroke="#cbd5e1" strokeWidth="2" />
        <rect x="4" y={y(val)} width="20" height={H - y(val) + 10} rx="10" fill={color} style={{ transition: 'all .35s ease' }} />
        <circle cx="14" cy={H + 28} r="30" fill={color} stroke="#cbd5e1" strokeWidth="2" style={{ transition: 'fill .35s' }} />
        <rect x="4" y={H - 6} width="20" height="20" fill={color} />
        <rect x="-8" y={y(q95)} width="44" height={Math.max(3, y(q05) - y(q95))} rx="4" fill={color} opacity=".18" />
        {base != null && <g><line x1="-14" x2="42" y1={y(base)} y2={y(base)} stroke="#14213d" strokeDasharray="4 3" strokeWidth="1.6" /><text x="-18" y={y(base) + 4} textAnchor="end" fontSize="10" fill="#14213d" fontWeight="700">{hoy}</text></g>}
        {ticks.map((t, i) => <g key={i}><line x1="34" x2="42" y1={y(t)} y2={y(t)} stroke="#94a3b8" /><text x="46" y={y(t) + 4} fontSize="10.5" fill="#5b6b8c">{t.toFixed(d)}</text></g>)}
        <text x="14" y={H + 62} textAnchor="middle" fontSize="11" fill="#5b6b8c">{unit}</text>
      </g>
    </svg>
  );
}

export default function Planet2050({ cur, res, pname, L, lang }) {
  const k = cur.k, u = V[k].u, d = V[k].d, pts = useMemo(() => I.fillGaps(cur.raw).pts, [cur]);
  const lastYear = pts[pts.length - 1].year, yrs = Math.max(3, 2050 - lastYear);
  const [mult, setMult] = useState(1), [year, setYear] = useState(2050), [play, setPlay] = useState(false), [layerId, setLayerId] = useState('tc'), [names, setNames] = useState(true), [split, setSplit] = useState(false), [pos, setPos] = useState(0.5);
  const snap = useRef(null);
  const S = useMemo(() => ({ 0: I.simulate(pts, { years: yrs, mult: 0, B: 250 }), 1: I.simulate(pts, { years: yrs, mult: 1, B: 300 }), 2: I.simulate(pts, { years: yrs, mult: 2, B: 250 }) }), [pts, yrs]);
  const hist = useMemo(() => { const m = new Map(); pts.forEach((p) => { const a = m.get(p.year) || [0, 0]; a[0] += p.v; a[1]++; m.set(p.year, a); }); return [...m.entries()].filter(([, a]) => a[1] === 12).map(([y, a]) => ({ year: y, v: a[0] / a[1] })); }, [pts]);
  const base = mean(hist.slice(-5).map((h) => h.v)), ann = S[mult].ann;
  const timeline = useMemo(() => [...hist.filter((h) => h.year >= 2001).map((h) => ({ year: h.year, q05: h.v, q50: h.v, q95: h.v, real: true })), ...ann.map((a) => ({ ...a, real: false }))], [hist, ann]);
  const y0 = timeline[0].year, y1 = timeline[timeline.length - 1].year, yr = Math.min(y1, Math.max(y0, year)), row = timeline.find((a) => a.year === yr) || timeline[0], delta = row.q50 - base;
  const all = [base, ...hist.map((h) => h.v), ...Object.values(S).flatMap((s) => s.ann.flatMap((a) => [a.q05, a.q95]))], lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.06;
  const spread = Math.max(...Object.values(S).map((s) => Math.abs(s.ann[s.ann.length - 1].q50 - base)), ...hist.map((h) => Math.abs(h.v - base)), 1e-9);
  const worse = isTemp(k) ? delta > 0 : delta < 0, color = Math.abs(delta) < spread * 0.04 ? '#64748b' : isTemp(k) ? (delta > 0 ? WARM : COOL) : (delta > 0 ? COOL : WARM);
  const colorHex = color === '#64748b' ? '#64748b' : color;
  const sg = (x) => `${x > 0 ? '+' : ''}${x.toFixed(d)}`;
  const photoYear = Math.min(LASTY, Math.max(2001, yr)), future = !row.real;
  const photoDate = layerById(layerId).fixed ? null : `15 ${L('jul', 'Jul')} ${photoYear}`;
  useEffect(() => { if (!play) return undefined; const t = setInterval(() => setYear((y) => { if (y >= y1) { setPlay(false); return y1; } return y + 1; }), 650); return () => clearInterval(t); }, [play, y1]);
  const start = () => { if (yr >= y1) setYear(y0); setPlay((p) => !p); };
  const mlab = { 0: L('Se detiene', 'Stops'), 1: L('Sigue igual', 'Continues'), 2: L('Se duplica', 'Doubles') };
  const hasGL = useMemo(() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }, []);
  const label = `${yr}${future ? ' · ' + L('proyección', 'projection') : ''}: ${row.q50.toFixed(d)} ${u} (${sg(delta)})`;
  const photo = () => snap.current?.photo({ title: `${V[k][lang][0]} · ${pname}`, lines: [`${yr} · ${future ? L('proyección', 'projection') + ' ' + mlab[mult].toLowerCase() : L('dato observado', 'observed value')}: ${row.q50.toFixed(d)} ${u} (${sg(delta)} ${u} ${L('frente a hoy', 'vs today')})`, `${layerById(layerId)[lang][0]}${photoDate ? ' · ' + photoDate : ''}${future ? ' · ' + L('última foto real, con el cambio proyectado pintado encima', 'last real photo, with the projected change painted over it') : ''}`], credit: `${L('Imágenes', 'Imagery')}: NASA GIBS (MODIS) · ${L('Datos', 'Data')}: ${sourceOf(k)} · ${L('proyección condicionada, no predicción', 'conditional projection, not a forecast')}`, file: 'terrascope-planeta-' + yr });
  const layers = [['tc', L('Foto real', 'Real photo')], ['lst', L('Temperatura', 'Temperature')], ['night', L('De noche', 'At night')], ['base', L('Relieve', 'Relief')]];
  return (<>
    <p className="sub">{L('El cambio se ve en el mismo planeta: los años pasados muestran la foto real de la NASA y los futuros pintan sobre ella lo que proyecta la serie. Mueve el año, cambia la capa o compara antes y después.', 'The change shows on the planet itself: past years show the real NASA photo and future years paint on it what the series projects. Move the year, switch layers or compare before and after.')}</p>
    <div className="f50">
      <div className="f50g">
        {hasGL ? <Globe pl={res.pl} layerId={layerId} photoYear={photoYear} compareYear={y0} split={split} pos={pos} color={colorHex} intensity={Math.abs(delta) / spread} showHeat label={label} lang={lang} names={names} snapRef={snap} /> : <Alert m="md" radius="lg" color="gray">{L('Este equipo no tiene WebGL: el planeta 3D no está disponible, pero el termómetro sí.', 'This device has no WebGL: the 3D planet is unavailable, but the thermometer works.')}</Alert>}
        <div className="f50year"><span>{yr}</span><small>{pname}</small><em className={future ? 'fut' : 'real'}>{future ? L('PROYECCIÓN', 'PROJECTION') : L('DATO REAL', 'REAL DATA')}</em></div>
        <div className="gzoom"><button onClick={() => snap.current?.zoom(0.5)} aria-label="zoom in"><IconPlus size={18} /></button><button onClick={() => snap.current?.zoom(2)} aria-label="zoom out"><IconMinus size={18} /></button><button onClick={photo} aria-label={L('Tomar foto', 'Take photo')} title={L('Tomar foto con los datos (PNG)', 'Take a photo with the data (PNG)')}><IconCamera size={18} /></button><button className={names ? 'on' : ''} onClick={() => setNames((x) => !x)} aria-label={L('Nombres', 'Names')} title={L('Nombres de países, océanos y ciudades', 'Names of countries, oceans and cities')}><IconTags size={18} /></button></div>
        <div className="f50layers"><SegmentedControl size="xs" color="navy" value={layerId} onChange={setLayerId} data={layers.map(([value, label]) => ({ value, label }))} /></div>
        {photoDate && <span className="f50cred">{L('Foto', 'Photo')}: NASA GIBS · MODIS · {photoDate}{future ? ' · ' + L('última disponible', 'latest available') : ''}</span>}
      </div>
      <div className="f50t">
        <b className="f50h">{V[k][lang][0]}</b>
        <Thermo lo={lo - pad} hi={hi + pad} val={row.q50} q05={row.q05} q95={row.q95} base={base} color={color} unit={u} d={d} hoy={L('hoy', 'now')} />
        <div className="f50n" style={{ color }}>{row.q50.toFixed(d)} <small>{u}</small></div>
        {future && <span className="mini">{L('Rango de 90 %', '90 % range')}: {row.q05.toFixed(d)} {L('a', 'to')} {row.q95.toFixed(d)}</span>}
        <span className="f50c" style={{ background: color }}>{sg(delta)} {u} {L('frente a hoy', 'vs today')}</span>
      </div>
    </div>
    <div className="row ctrl" style={{ marginTop: 12 }}>
      <Button color="forest" radius="xl" leftSection={play ? <IconPlayerPause size={16} /> : yr >= y1 ? <IconRefresh size={16} /> : <IconPlayerPlay size={16} />} onClick={start}>{play ? L('Pausar', 'Pause') : yr >= y1 ? L('Repetir viaje', 'Replay') : L('Viajar en el tiempo', 'Travel through time')}</Button>
      <div style={{ flex: 1, minWidth: 240 }}><span className="mini">{L('Año', 'Year')}: <b>{yr}</b> · {L('hasta', 'to')} {lastYear}: {L('datos reales', 'real data')}, {L('después', 'after')}: {L('proyección', 'projection')}</span><Slider color="forest" min={y0} max={y1} value={yr} onChange={(x) => { setPlay(false); setYear(x); }} label={null} marks={[y0, lastYear, 2030, 2040, y1].filter((x, i, a) => a.indexOf(x) === i && x >= y0 && x <= y1).map((value) => ({ value, label: String(value) }))} /></div>
      <div><span className="mini">{L('¿Y si la tendencia…?', 'What if the trend…?')}</span><br /><SegmentedControl size="xs" color="navy" value={String(mult)} onChange={(x) => setMult(+x)} data={[0, 1, 2].map((m) => ({ value: String(m), label: mlab[m] }))} /></div>
      {split && layerId !== 'base' && <div style={{ minWidth: 140 }}><span className="mini">{L('Mover la cortina', 'Move the curtain')}</span><Slider color="navy" min={0.05} max={0.95} step={0.01} value={pos} onChange={setPos} label={null} /></div>}
      {layerId !== 'base' && !layerById(layerId).fixed && <Switch color="navy" checked={split} onChange={(e) => setSplit(e.currentTarget.checked)} label={L(`Cortina: ${y0} frente a ${photoYear}`, `Curtain: ${y0} vs ${photoYear}`)} />}
    </div>
    <Interpret title={`${V[k][lang][0]} · ${yr}`} facts={`${V[k][lang][0]} en ${pname}: promedio de los últimos 5 años completos ${base.toFixed(d)} ${u}; ${future ? `proyección para ${yr} (tendencia ${mlab[mult].toLowerCase()}): valor central ${row.q50.toFixed(d)} ${u}, rango de 90 % de ${row.q05.toFixed(d)} a ${row.q95.toFixed(d)}` : `dato observado de ${yr}: ${row.q50.toFixed(d)} ${u}`}; cambio frente a hoy ${sg(delta)} ${u}; fuente ${sourceOf(k)}; serie hasta ${lastYear}`} how={L('Cómo se lee: el termómetro marca el valor anual; la franja suave es el rango de 90 % y la línea punteada el promedio actual. En el planeta, los años pasados muestran la foto real de ese año y el halo de color crece con el cambio.', 'How to read it: the thermometer marks the annual value; the soft band is the 90 % range and the dashed line is today’s average. On the planet, past years show that year’s real photo and the coloured halo grows with the change.')} plain={worse ? L('Qué dice aquí: bajo este supuesto la variable se mueve en sentido desfavorable respecto de hoy.', 'What it says here: under this assumption the variable moves in an unfavourable direction from today.') : L('Qué dice aquí: bajo este supuesto el cambio frente a hoy es pequeño o va en sentido favorable.', 'What it says here: under this assumption the change from today is small or favourable.')} next={L('Siguiente paso: compara “se detiene” con “se duplica” para ver cuánto depende el 2050 de que la tendencia continúe, y toma una foto para tu informe.', 'Next step: compare “stops” with “doubles” to see how much 2050 depends on the trend continuing, and take a photo for your report.')} />
    <p className="mini"><IconInfoCircle size={13} style={{ verticalAlign: '-2px' }} /> {L('Las fotos son imágenes reales de la NASA (MODIS, 15 de julio de cada año). El halo de color de los años futuros NO es una foto: es la proyección del dato de este punto (una celda de unos 50 km) pintada sobre la última imagen real. Es una proyección condicionada, no una predicción, y no representa el clima de todo el planeta.', 'Photos are real NASA images (MODIS, 15 July of each year). The coloured halo for future years is NOT a photo: it is the projection of this point’s data (a cell of about 50 km) painted over the latest real image. It is a conditional projection, not a forecast, and does not represent the climate of the whole planet.')}</p>
  </>);
}
