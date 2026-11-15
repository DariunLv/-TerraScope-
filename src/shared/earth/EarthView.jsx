/* Planeta 3D con CesiumJS. Un solo componente para tres usos:
   mode="hero"    portada: gira solo, se toca para elegir un punto
   mode="explore" explorador: capas satelitales de la NASA por fecha y eventos naturales en vivo
   mode="lakes"   lagos del Perú: inventario, imágenes por año y comparación de dos años con cortina */
import { useEffect, useRef, useState } from 'react';
import { Button, Select, Slider, Switch, SegmentedControl } from '@mantine/core';
import { IconFlask, IconPlus, IconMinus, IconHandFinger, IconWorld, IconWifiOff, IconExternalLink, IconX, IconArrowsHorizontal, IconTags, IconRotate360, IconFlag, IconCamera } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as C from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { mesh, feature } from 'topojson-client';
import { addNames } from './names';
import { takePhoto } from './photo';
import { geoArea, geoBounds, geoCentroid, geoContains } from 'd3';
import world from '../../lib/geo/world110.json';
import peru from '../../lib/geo/peru.json';
import { PLACES } from '../../lib/nasa/data';
import { TYPES } from '../../features/lakes/lakesData';
import { LAYERS, layerById, isoDaysAgo, tileUrl, GIBS_WMS, eonetEvents, EVENT_CATS } from '../../lib/nasa/nasa';
import { useStore, placeLabel } from '../../core/store';
import { useT } from '../../core/i18n';

const col = (c, a = 1) => C.Color.fromCssColorString(c).withAlpha(a);
const CREDIT = 'NASA GIBS / EOSDIS';
export function provider(def, date, onErr) {
  const p = def.lvl
    ? new C.UrlTemplateImageryProvider({ url: tileUrl(def, date), maximumLevel: def.lvl, credit: CREDIT })
    : new C.WebMapServiceImageryProvider({ url: GIBS_WMS, layers: def.layer, parameters: { transparent: true, format: 'image/png', time: date }, enablePickFeatures: false, maximumLevel: 11, credit: CREDIT });
  p.errorEvent.addEventListener(onErr);
  return p;
}
const rings = (g) => (g.type === 'Polygon' ? g.coordinates : g.type === 'MultiPolygon' ? g.coordinates.flat() : []);
/* ---- países: nombre, centro, tamaño y límites (calculados una sola vez) ---- */
export const COUNTRIES = feature(world, world.objects.countries).features.map((f) => {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  let best = polys[0], ba = -1; polys.forEach((p) => { const a = geoArea({ type: 'Polygon', coordinates: p }); if (a > ba) { ba = a; best = p; } });
  const bp = { type: 'Polygon', coordinates: best };
  return { id: String(f.id), en: f.properties.name, area: geoArea(f), c: geoCentroid(bp), b: geoBounds(bp), bb: geoBounds(f), polys, f };
});
const DN = {};
export const cname = (c, lang) => { if (lang !== 'es') return c.en; try { DN.es = DN.es || new Intl.DisplayNames(['es'], { type: 'region' }); return DN.es.of(String(c.id).padStart(3, '0')) || c.en; } catch { return c.en; } };
const countryAt = (lon, lat) => COUNTRIES.find((c) => { const [[w, s], [e, n]] = c.bb; if (lat < s || lat > n) return false; if (w <= e ? (lon < w || lon > e) : (lon < w && lon > e)) return false; return geoContains(c.f, [lon, lat]); });
export const tier = (a) => (a > 0.03 ? 0 : a > 0.004 ? 1 : a > 0.0008 ? 2 : 3);
const NOW = new Date(), LASTY = NOW.getUTCFullYear() - (NOW.getUTCMonth() < 7 ? 1 : 0); // último año con imagen de julio

export default function EarthView({ mode = 'hero', points, uncovered, alerts }) {
  const { lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b);
  const { place, setPlace, lake, setLake, scan, openCase, lakes } = useStore();
  const box = useRef(null), el = useRef(null), V = useRef(null), ds = useRef({}), ov = useRef([]), errs = useRef(0), spin = useRef(mode !== 'lakes'), skipFly = useRef(true);
  const [dead, setDead] = useState(false), [ready, setReady] = useState(false), [net, setNet] = useState(true), [tip, setTip] = useState(null);
  const [layerId, setLayerId] = useState('base'), [date, setDate] = useState(isoDaysAgo(3));
  const [year, setYear] = useState(LASTY), [year2, setYear2] = useState(2001), [compare, setCompare] = useState(false), [pos, setPos] = useState(0.5);
  const [labelsOn, setLabelsOn] = useState(true), [spinOn, setSpinOn] = useState(mode !== 'lakes'), [country, setCountry] = useState(null), langR = useRef(lang);
  langR.current = lang;
  const [flash, setFlash] = useState(false);
  const [evOn, setEvOn] = useState(false), [evState, setEvState] = useState(null), [ev, setEv] = useState(null);
  const def = layerById(layerId), FAR = mode === 'explore' ? 2.25e7 : 1.15e7; // altura inicial de la cámara

  /* ---- crear el visor una sola vez ---- */
  useEffect(() => {
    let v;
    try {
      v = new C.Viewer(el.current, {
        animation: false, timeline: false, baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false, navigationHelpButton: false, fullscreenButton: false, infoBox: false, selectionIndicator: false,
        scene3DOnly: true, skyBox: false, showRenderLoopErrors: false, contextOptions: { webgl: { preserveDrawingBuffer: true } },
        baseLayer: C.ImageryLayer.fromProviderAsync(C.TileMapServiceImageryProvider.fromUrl(C.buildModuleUrl('Assets/Textures/NaturalEarthII'))),
      });
    } catch (e) { console.warn('Cesium', e); setDead(true); return undefined; }
    V.current = v; const sc = v.scene;
    sc.backgroundColor = col('#e4f0fa'); sc.globe.baseColor = col('#cfe5f5'); if (sc.sun) sc.sun.show = false; if (sc.moon) sc.moon.show = false; sc.globe.enableLighting = false; sc.requestRenderMode = true; sc.fog.enabled = false; sc.globe.showGroundAtmosphere = false;
    sc.screenSpaceCameraController.minimumZoomDistance = 12000; sc.screenSpaceCameraController.maximumZoomDistance = 3.6e7;
    if (window.innerWidth > 720) { v.useBrowserRecommendedResolution = false; v.resolutionScale = Math.min(window.devicePixelRatio || 1, 1.5); }
    v.cesiumWidget.screenSpaceEventHandler.removeInputAction(C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    // relieve en línea sobre el relieve incluido (si no hay internet queda el incluido)
    const bm = v.imageryLayers.addImageryProvider(provider(LAYERS[0], '', () => {}));
    bm.brightness = 1.08;
    ['borders', 'labels', 'hover', 'cty', 'pts', 'places', 'lakes', 'events', 'sel'].forEach((n) => { ds.current[n] = new C.CustomDataSource(n); v.dataSources.add(ds.current[n]); });
    mesh(world, world.objects.countries).coordinates.forEach((line) => { if (line.length > 1) ds.current.borders.entities.add({ polyline: { positions: C.Cartesian3.fromDegreesArray(line.flat()), width: 1, material: col('#ffffff', 0.6) } }); });
    if (mode === 'lakes') peru.features.filter((f) => f.properties?.name === 'Peru').forEach((f) => rings(f.geometry).forEach((r) => ds.current.borders.entities.add({ polyline: { positions: C.Cartesian3.fromDegreesArray(r.flat()), width: 2.5, material: col('#facc15', 0.95) } })));
    const s = useStore.getState();
    if (mode === 'lakes') v.camera.setView({ destination: C.Cartesian3.fromDegrees(-75.2, -9.6, 3.1e6) }); else v.camera.setView({ destination: C.Cartesian3.fromDegrees(s.place.lon, s.place.lat, FAR) });
    /* interacción */
    const paint = (name, c, hex, a, w) => { const d = ds.current[name]; d.entities.removeAll(); if (c) { c.polys.forEach((p) => { d.entities.add({ polygon: { hierarchy: new C.PolygonHierarchy(C.Cartesian3.fromDegreesArray(p[0].flat()), p.slice(1).map((h) => new C.PolygonHierarchy(C.Cartesian3.fromDegreesArray(h.flat())))), material: col(hex, a), outline: false } }); d.entities.add({ polyline: { positions: C.Cartesian3.fromDegreesArray(p[0].flat()), width: w, material: col(hex, 0.95) } }); }); } sc.requestRender(); };
    const flyCountry = (c) => { const [[w, s], [e, n]] = c.b, pad = 0.15 * Math.max(1, Math.abs(n - s)); spin.current = false; setSpinOn(false); v.camera.flyTo({ destination: C.Rectangle.fromDegrees(w - pad, Math.max(-85, s - pad), e + pad, Math.min(85, n + pad)), duration: 1.6 }); };
    v.paintCountry = (c, fl) => { paint('cty', c, '#facc15', 0.22, 2.5); setCountry(c || null); if (fl && c) flyCountry(c); };
    const stop = () => { spin.current = false; setSpinOn(false); }; const cv = sc.canvas;
    cv.addEventListener('pointerdown', stop); cv.addEventListener('wheel', stop, { passive: true });
    const off = v.clock.onTick.addEventListener(() => { if (spin.current) { v.camera.rotate(C.Cartesian3.UNIT_Z, -0.0011); sc.requestRender(); } });
    const h = new C.ScreenSpaceEventHandler(cv);
    h.setInputAction((e) => {
      const hit = sc.pick(e.position), d = hit?.id?._td;
      if (d?.kind === 'lake') { useStore.getState().setLake(d.id); if (mode !== 'lakes') { skipFly.current = true; useStore.getState().setPlace({ id: 'custom', lat: d.lat, lon: d.lon, name: d.name }); } return; }
      if (d?.kind === 'place') { skipFly.current = true; useStore.getState().setPlace({ id: d.id, lat: d.lat, lon: d.lon }); return; }
      if (d?.kind === 'event') { setEv(d); return; }
      if (mode === 'lakes') return;
      const c = v.camera.pickEllipsoid(e.position, sc.globe.ellipsoid); if (!c) return;
      const g = C.Cartographic.fromCartesian(c); skipFly.current = true;
      const la = +C.Math.toDegrees(g.latitude).toFixed(3), lo = +C.Math.toDegrees(g.longitude).toFixed(3), ct = countryAt(lo, la);
      v.paintCountry(ct, false);
      useStore.getState().setPlace({ id: 'custom', lat: la, lon: lo });
    }, C.ScreenSpaceEventType.LEFT_CLICK);
    h.setInputAction((e) => { const c = v.camera.pickEllipsoid(e.position, sc.globe.ellipsoid); if (!c) return; const g = C.Cartographic.fromCartesian(c), ct = countryAt(C.Math.toDegrees(g.longitude), C.Math.toDegrees(g.latitude)); if (ct) v.paintCountry(ct, true); }, C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    let last = 0, hov = null;
    h.setInputAction((e) => {
      const t = performance.now(); if (t - last < 60) return; last = t; const d = sc.pick(e.endPosition)?.id?._td; let ct = null;
      if (!d) { const c = v.camera.pickEllipsoid(e.endPosition, sc.globe.ellipsoid); if (c) { const g = C.Cartographic.fromCartesian(c); ct = countryAt(C.Math.toDegrees(g.longitude), C.Math.toDegrees(g.latitude)); } }
      if ((ct?.id || null) !== (hov?.id || null)) { hov = ct || null; paint('hover', hov, '#0c5a43', 0.16, 1.6); }
      cv.style.cursor = d || ct ? 'pointer' : 'grab';
      setTip(d ? { x: e.endPosition.x, y: e.endPosition.y, name: d.name, sub: d.sub } : ct ? { x: e.endPosition.x, y: e.endPosition.y, name: cname(ct, langR.current), sub: '' } : null);
    }, C.ScreenSpaceEventType.MOUSE_MOVE);
    const io = new IntersectionObserver(([en]) => { v.useDefaultRenderLoop = en.isIntersecting; if (en.isIntersecting) sc.requestRender(); }); io.observe(el.current);
    setReady(true);
    return () => { io.disconnect(); off(); h.destroy(); cv.removeEventListener('pointerdown', stop); cv.removeEventListener('wheel', stop); V.current = null; try { v.destroy(); } catch { /* ya destruido */ } };
  }, []);

  const fly = (lat, lon, height, dur = 1.6) => V.current?.camera.flyTo({ destination: C.Cartesian3.fromDegrees(lon, lat, height), duration: dur });
  const zoom = (f) => { const v = V.current; if (!v) return; spin.current = false; const p = v.camera.positionCartographic; v.camera.flyTo({ destination: C.Cartesian3.fromRadians(p.longitude, p.latitude, Math.max(15000, Math.min(3.4e7, p.height * f))), duration: 0.45 }); };
  const home = () => { if (mode === 'lakes') fly(-9.6, -75.2, 3.1e6, 1.2); else fly(place.lat, place.lon, FAR, 1.2); };

  /* ---- marcadores ---- */
  useEffect(() => { // nombres de todos los países, por niveles de zoom
    const d = ds.current.labels; if (!ready || !d) return; d.entities.removeAll();
    if (labelsOn) {
      const far = mode === 'hero' ? [3.6e7, 1.3e7, 5.5e6, 2.2e6] : [3.6e7, 1.8e7, 8e6, 3.5e6], fs = mode === 'hero' ? 11 : 13;
      COUNTRIES.forEach((c) => { const T = tier(c.area); d.entities.add({ position: C.Cartesian3.fromDegrees(c.c[0], c.c[1]), label: { text: cname(c, lang).toUpperCase(), font: `${T === 0 ? 700 : 600} ${fs - (T > 1 ? 1 : 0)}px Inter, sans-serif`, fillColor: col('#14213d', 0.92), outlineColor: col('#ffffff', 0.9), outlineWidth: 3, style: C.LabelStyle.FILL_AND_OUTLINE, distanceDisplayCondition: new C.DistanceDisplayCondition(0, far[T]), scaleByDistance: new C.NearFarScalar(1.5e6, 1.25, 2.5e7, 0.75), horizontalOrigin: C.HorizontalOrigin.CENTER, verticalOrigin: C.VerticalOrigin.CENTER } }); });
      addNames(C, d, lang, mode === 'hero' ? 'hero' : 'full');
    }
    V.current.scene.requestRender();
  }, [ready, lang, labelsOn]);
  useEffect(() => { // lugar elegido
    const d = ds.current.sel; if (!ready || !d || mode === 'lakes') return;
    d.entities.removeAll(); const p = C.Cartesian3.fromDegrees(place.lon, place.lat);
    d.entities.add({ position: p, point: { pixelSize: 30, color: col('#facc15', 0.28), outlineColor: col('#facc15', 0.9), outlineWidth: 2 } });
    d.entities.add({ position: p, point: { pixelSize: 11, color: col('#facc15'), outlineColor: col('#14213d'), outlineWidth: 2 } });
    if (skipFly.current) { skipFly.current = false; V.current.scene.requestRender(); return; }
    spin.current = false; fly(place.lat, place.lon, Math.min(V.current.camera.positionCartographic.height, 5.5e6));
  }, [ready, place.lat, place.lon]);
  useEffect(() => { // lugares del mundo (color según el escaneo)
    const d = ds.current.places; if (!ready || !d || mode === 'lakes') return; d.entities.removeAll();
    PLACES.forEach((p) => { const r = scan?.list.find((x) => x.id === p.id); const c = r ? (r.perDec >= 0 ? '#ea580c' : '#1d4ed8') : '#0c5a43';
      const e = d.entities.add({ position: C.Cartesian3.fromDegrees(p.lon, p.lat), point: { pixelSize: r ? 12 : 9, color: col(c, r && !r.fdr ? 0.45 : 1), outlineColor: C.Color.WHITE, outlineWidth: 1.6 } });
      e._td = { kind: 'place', id: p.id, lat: p.lat, lon: p.lon, name: p[lang], sub: r ? `${r.perDec > 0 ? '+' : ''}${r.perDec.toFixed(3)} / ${L('década', 'decade')}` : '' }; });
    V.current.scene.requestRender();
  }, [ready, scan, lang]);
  useEffect(() => { // lagos
    const d = ds.current.lakes; if (!ready || !d) return; d.entities.removeAll(); if (mode === 'hero') return;
    lakes.forEach((l) => { const sel = l.id === lake && mode === 'lakes', a = alerts?.get(l.id); const c = a?.color || (uncovered?.has(l.id) ? '#dc2626' : TYPES[l.type]?.[2] || '#0c7a5b');
      const e = d.entities.add({ position: C.Cartesian3.fromDegrees(l.lon, l.lat), point: { pixelSize: Math.round((mode === 'lakes' ? 9 : 6) + Math.sqrt(Math.min(l.area, 600)) * 0.5), color: col(c, 0.9), outlineColor: sel ? col('#facc15') : C.Color.WHITE, outlineWidth: sel ? 4 : 1.4 },
        label: sel ? { text: l.name, font: '600 14px Inter, sans-serif', fillColor: C.Color.WHITE, outlineColor: col('#14213d'), outlineWidth: 4, style: C.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new C.Cartesian2(0, -26), disableDepthTestDistance: Number.POSITIVE_INFINITY } : undefined });
      e._td = { kind: 'lake', id: l.id, lat: l.lat, lon: l.lon, name: l.name, sub: a?.text || `${l.alt} m · ${l.area} km²` }; });
    V.current.scene.requestRender();
  }, [ready, lakes, lake, uncovered, alerts, mode]);
  useEffect(() => { // puntos de monitoreo
    const d = ds.current.pts; if (!ready || !d) return; d.entities.removeAll();
    (points || []).forEach((p) => { const e = d.entities.add({ position: C.Cartesian3.fromDegrees(p.lon, p.lat), point: { pixelSize: 8, color: col('#facc15'), outlineColor: col('#14213d'), outlineWidth: 1.5 } }); e._td = { kind: 'pt', name: p.name, sub: L('Punto de monitoreo', 'Monitoring point') }; });
    V.current.scene.requestRender();
  }, [ready, points]);
  useEffect(() => { // volar al lago elegido
    if (!ready || mode !== 'lakes') return; const l = lakes.find((x) => x.id === lake); if (!l) return;
    if (skipFly.current) { skipFly.current = false; return; }
    fly(l.lat, l.lon, l.area > 500 ? 5.2e5 : l.area > 20 ? 1.5e5 : 7e4);
  }, [ready, lake]);

  /* ---- capas satelitales ---- */
  useEffect(() => {
    const v = V.current; if (!ready || !v) return;
    ov.current.forEach((l) => v.imageryLayers.remove(l, true)); ov.current = []; errs.current = 0; setNet(true);
    if (def.id === 'base') { v.scene.requestRender(); return; }
    const onErr = () => { errs.current += 1; if (errs.current === 6) setNet(false); };
    const add = (d, split) => { const l = v.imageryLayers.addImageryProvider(provider(def, d, onErr)); if (def.over) l.alpha = 0.88; if (split) l.splitDirection = split; ov.current.push(l); };
    const dt = (y) => `${y}-07-15`;
    if (mode === 'lakes') { if (compare) { add(dt(year2), C.SplitDirection.LEFT); add(dt(year), C.SplitDirection.RIGHT); } else add(dt(year)); }
    else add(def.fixed ? '' : date);
    v.scene.requestRender();
  }, [ready, layerId, date, year, year2, compare]);
  useEffect(() => { if (V.current) { V.current.scene.splitPosition = pos; V.current.scene.requestRender(); } }, [pos, ready]);

  /* ---- eventos naturales (EONET) ---- */
  useEffect(() => {
    const d = ds.current.events; if (!ready || !d) return; d.entities.removeAll(); setEv(null);
    if (!evOn) { setEvState(null); V.current.scene.requestRender(); return undefined; }
    let dead2 = false; setEvState('load');
    eonetEvents(30).then((list) => { if (dead2) return;
      list.forEach((x) => { const cat = EVENT_CATS[x.cat]; const e = d.entities.add({ position: C.Cartesian3.fromDegrees(x.lon, x.lat), point: { pixelSize: 10, color: col(cat[2]), outlineColor: C.Color.WHITE, outlineWidth: 1.5 } }); e._td = { kind: 'event', ...x, name: x.title, sub: `${cat[lang === 'es' ? 0 : 1]} · ${x.date}` }; });
      setEvState({ n: list.length, cats: [...new Set(list.map((x) => x.cat))] }); V.current?.scene.requestRender();
    }).catch(() => { if (!dead2) setEvState('fail'); });
    return () => { dead2 = true; };
  }, [ready, evOn, lang]);

  const photo = () => {
    const v = V.current, cp = v?.camera.positionCartographic; if (!v) return;
    const lyr = mode === 'lakes' ? (layerId === 'base' ? L('Mapa de lagos del Perú', 'Map of Peru’s lakes') : `${def[lang][0]} · ${compare ? `${year2} ${L('frente a', 'vs')} ${year}` : year}`) : `${def[lang][0]}${def.fixed ? '' : ' · ' + date}`;
    const lk = mode === 'lakes' ? lakes.find((x) => x.id === lake) : null;
    takePhoto(v, { title: mode === 'lakes' ? L('Lagos del Perú desde el espacio', 'Peru’s lakes from space') : L('Planeta Tierra', 'Planet Earth'), lines: [lyr, mode === 'lakes' ? (lk ? `${lk.name} · ${lk.lat.toFixed(2)}°, ${lk.lon.toFixed(2)}°` : '') : `${L('Lugar elegido', 'Chosen place')}: ${placeLabel(place, PLACES, lang)} (${place.lat}°, ${place.lon}°)`, cp ? `${L('Altura de la cámara', 'Camera height')}: ${Math.round(cp.height / 1000).toLocaleString(lang)} km` : ''].filter(Boolean), credit: `${L('Imágenes', 'Imagery')}: NASA GIBS / EOSDIS`, file: 'terrascope-planeta' });
    setFlash(true); setTimeout(() => setFlash(false), 450);
  };
  const drag = (e) => { const r = box.current.getBoundingClientRect(); const mv = (x) => setPos(Math.max(0.05, Math.min(0.95, (x - r.left) / r.width))); const onM = (m) => mv(m.clientX), up = () => { window.removeEventListener('pointermove', onM); window.removeEventListener('pointerup', up); }; window.addEventListener('pointermove', onM); window.addEventListener('pointerup', up); mv(e.clientX); };
  if (dead) throw new Error('WebGL no disponible');
  const lk = [['base', L('Mapa', 'Map')], ['tc', L('Color real', 'True color')], ['fc', L('Agua en negro', 'Water in black')]];
  return (
    <div className={'earthwrap earthwrap-' + mode}>
      {mode === 'explore' && (
        <div className="earthbar">
          <Select w={280} label={L('Capa satelital de la NASA', 'NASA satellite layer')} data={LAYERS.map((l) => ({ value: l.id, label: l[lang][0] }))} value={layerId} onChange={(x) => x && setLayerId(x)} allowDeselect={false} comboboxProps={{ zIndex: 400 }} />
          <Select w={200} searchable clearable label={L('Ir a un país', 'Go to a country')} placeholder={L('Escribe un país…', 'Type a country…')} leftSection={<IconFlag size={15} />} data={COUNTRIES.map((c) => ({ value: c.id, label: cname(c, lang) })).sort((a, b) => a.label.localeCompare(b.label, lang))} value={country?.id || null} onChange={(id) => { const c = COUNTRIES.find((x) => x.id === id); V.current?.paintCountry(c || null, !!c); }} comboboxProps={{ zIndex: 400 }} />
          {!def.fixed && <label className="datefield"><span>{L('Fecha de la imagen', 'Image date')}</span><input type="date" value={date} min={`${def.from || 2000}-03-01`} max={isoDaysAgo(def.lag || 1)} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>}
          <Switch color="navy" checked={evOn} onChange={(e) => setEvOn(e.currentTarget.checked)} label={L('Eventos naturales en curso', 'Ongoing natural events')} />
        </div>
      )}
      {mode === 'lakes' && (
        <div className="lmbar">
          <SegmentedControl size="xs" color="navy" value={layerId} onChange={setLayerId} data={lk.map(([value, label]) => ({ value, label }))} />
          {layerId !== 'base' && <div className="yr"><span>{compare ? L('Derecha', 'Right') : L('Año', 'Year')} <b>{year}</b></span><Slider color="navy" min={2001} max={LASTY} value={year} onChange={setYear} label={null} style={{ flex: 1, minWidth: 110 }} /></div>}
          {layerId !== 'base' && compare && <div className="yr"><span>{L('Izquierda', 'Left')} <b>{year2}</b></span><Slider color="forest" min={2001} max={LASTY} value={year2} onChange={setYear2} label={null} style={{ flex: 1, minWidth: 110 }} /></div>}
          {layerId !== 'base' && <Switch size="xs" color="navy" checked={compare} onChange={(e) => setCompare(e.currentTarget.checked)} label={L('Comparar dos años', 'Compare two years')} />}
        </div>
      )}
      <div ref={box} className={'earth earth-' + mode}>
        <div ref={el} className="earthcanvas" />
        {flash && <div className="snapflash" />}
        {compare && layerId !== 'base' && mode === 'lakes' && (<>
          <div className="splitbar" style={{ left: `${pos * 100}%` }} onPointerDown={drag}><i><IconArrowsHorizontal size={16} /></i></div>
          <span className="splitlab" style={{ left: 12 }}>{year2}</span><span className="splitlab" style={{ right: 60 }}>{year}</span>
        </>)}
        <div className="gzoom"><button onClick={() => zoom(0.5)} aria-label="zoom in"><IconPlus size={18} /></button><button onClick={() => zoom(2)} aria-label="zoom out"><IconMinus size={18} /></button><button onClick={home} aria-label="home"><IconWorld size={18} /></button><button className={labelsOn ? 'on' : ''} onClick={() => setLabelsOn((x) => !x)} aria-label={L('Nombres de países', 'Country names')} title={L('Nombres de países', 'Country names')}><IconTags size={18} /></button><button onClick={photo} aria-label={L('Tomar foto del planeta', 'Take a photo of the planet')} title={L('Tomar foto del planeta (PNG)', 'Take a photo of the planet (PNG)')}><IconCamera size={18} /></button><button className={spinOn ? 'on' : ''} onClick={() => { spin.current = !spin.current; setSpinOn(spin.current); }} aria-label={L('Girar solo', 'Auto-rotate')} title={L('Girar solo', 'Auto-rotate')}><IconRotate360 size={18} /></button></div>
        {tip && <div className="gtip earthtip" style={{ left: tip.x + 12, top: tip.y + 12 }}>{tip.name}{tip.sub && <small>{tip.sub}</small>}</div>}
        {!net && <div className="earthnote"><IconWifiOff size={15} /> {L('No se pudo cargar esta capa (sin internet o sin imagen para esa fecha). Ves el relieve incluido.', 'This layer could not load (offline or no image for that date). You see the built-in relief.')}</div>}
        {mode === 'hero' && <div className="hint light"><IconHandFinger size={15} /> {L('Gira, acerca y toca cualquier país o punto del planeta; doble toque para volar a un país', 'Spin, zoom and tap any country or point; double-tap to fly to a country')}</div>}
        {mode !== 'lakes' && (
          <AnimatePresence mode="wait">
            {ev ? (
              <motion.div key={ev.id} className="gcard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <span className="mini" style={{ color: EVENT_CATS[ev.cat][2], fontWeight: 700 }}>{EVENT_CATS[ev.cat][lang === 'es' ? 0 : 1]} · {ev.date}</span><b>{ev.title}</b>
                <Button mt={8} size="compact-sm" color="forest" leftSection={<IconFlask size={14} />} onClick={() => openCase({ vars: ['T2M', 'PRECTOTCORR', 'GWETROOT'] }, { id: 'custom', lat: +ev.lat.toFixed(2), lon: +ev.lon.toFixed(2), name: ev.title })}>{L('Investigar el clima aquí', 'Investigate the climate here')}</Button>
                {ev.link && <a className="textlink" href={ev.link} target="_blank" rel="noreferrer"><IconExternalLink size={14} /> {L('Fuente del evento', 'Event source')}</a>}
                <button className="textlink" onClick={() => setEv(null)}><IconX size={14} /> {L('Cerrar', 'Close')}</button>
              </motion.div>
            ) : (
              <motion.div key={place.lat + '_' + place.lon} className="gcard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <span className="mini">{L('Lugar elegido', 'Chosen place')}</span><b>{placeLabel(place, PLACES, lang)}</b><span className="mini">{country ? `${cname(country, lang)} · ` : ''}{place.lat}°, {place.lon}°</span>
                <Button mt={8} size="sm" color="forest" leftSection={<IconFlask size={16} />} onClick={() => openCase({ vars: ['T2M', 'PRECTOTCORR', 'GWETROOT'] }, place)}>{L('Investigar aquí', 'Investigate here')}</Button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
      {mode === 'explore' && <p className="mini earthhelp">{def[lang][1]} {evState === 'load' && L('Cargando eventos de NASA EONET…', 'Loading NASA EONET events…')}{evState === 'fail' && L('No se pudo conectar con NASA EONET (revisa tu internet).', 'Could not reach NASA EONET (check your connection).')}{evState?.n != null && <>{L(`${evState.n} eventos abiertos en los últimos 30 días (NASA EONET):`, `${evState.n} open events in the last 30 days (NASA EONET):`)} {evState.cats.map((c) => <span key={c} className="evleg"><i style={{ background: EVENT_CATS[c][2] }} />{EVENT_CATS[c][lang === 'es' ? 0 : 1]}</span>)}</>}</p>}
      {mode === 'lakes' && <p className="mini earthhelp">{layerId === 'base' ? L('Círculos: tamaño según el área, color según el tipo. Toca un lago para ver su ficha; la rueda o los botones acercan.', 'Circles: size by area, color by type. Tap a lake for its card; wheel or buttons zoom.') : compare ? L('Arrastra la cortina para comparar el espejo de agua entre los dos años (imagen MODIS del 15 de julio, NASA GIBS).', 'Drag the curtain to compare the water surface between the two years (MODIS image of 15 July, NASA GIBS).') : L('Imagen MODIS (NASA GIBS) del 15 de julio de cada año. Mueve el año para ver cómo cambia el espejo de agua.', 'MODIS image (NASA GIBS) for 15 July each year. Move the year to watch the water surface change.')}</p>}
    </div>
  );
}
