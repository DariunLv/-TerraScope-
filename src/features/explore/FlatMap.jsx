/* Mapa plano interactivo (MapLibre): imágenes NASA GIBS, países resaltables, puntos del escaneo, inclinación 3D, vuelos y ventanitas. */
import { useEffect, useRef, useState } from 'react';
import { SegmentedControl, Button } from '@mantine/core';
import { IconCompass, IconRotate3d, IconPlane, IconFlask } from '@tabler/icons-react';
import { feature } from 'topojson-client';
import world from '../../lib/geo/world110.json';
import { useT } from '../../core/i18n';
const G = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/';
const day = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const LAYERS = (d = day(6)) => ({
  bm: [`${G}BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg`, 8],
  tc: [`${G}MODIS_Terra_CorrectedReflectance_TrueColor/default/${d}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`, 9],
  nl: [`${G}VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg`, 8],
  gpm: [`${G}IMERG_Precipitation_Rate/default/${d}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`, 6],
  lst: [`${G}MODIS_Terra_Land_Surface_Temp_Day/default/${d}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`, 7],
});
const shift = (c) => (typeof c[0] === 'number' ? [c[0] < 0 ? c[0] + 360 : c[0], c[1]] : c.map(shift));
const LAND = (() => { const l = feature(world, world.objects.countries); l.features.forEach((f, i) => { f.id = i; try { const xs = JSON.stringify(f.geometry.coordinates).match(/\[(-?[\d.]+),/g).map((m) => +m.slice(1, -1)); if (Math.min(...xs) < -170 && Math.max(...xs) > 170 && f.properties?.name !== 'Antarctica') f.geometry.coordinates = shift(f.geometry.coordinates); } catch { /* sin ajuste */ } }); return l; })();
const FLY = [['Titicaca', -69.35, -15.85, 8.2], ['Amazon', -62, -4, 4.6], ['Himalaya', 86, 28, 5.2], ['Sahara', 10, 24, 4.6], ['Great Barrier Reef', 147, -18, 5], ['Alps', 9, 46.5, 6.2], ['Aral Sea', 60, 45, 5.8], ['Greenland', -42, 72, 3.6]];
export default function FlatMap({ dots, res, place, setPlace, k, vlabel, onInvestigate }) {
  const { lang } = useT(), L = (a, b) => (lang === 'es' ? a : b), el = useRef(null), map = useRef(null), ml = useRef(null), popup = useRef(null), mark = useRef(null);
  const [fail, setFail] = useState(false), [layer, setLayer] = useState('bm'), [ready, setReady] = useState(false), [tilt, setTilt] = useState(false);
  const cb = useRef({}); cb.current = { setPlace, dots, res, k, vlabel, L };
  useEffect(() => {
    let dead = false, m;
    (async () => {
      const lib = (await import('maplibre-gl')).default; await import('maplibre-gl/dist/maplibre-gl.css'); if (dead || !el.current) return; ml.current = lib;
      const ls = LAYERS();
      m = new lib.Map({ container: el.current, center: [place.lon, place.lat], zoom: 2.4, minZoom: 1, maxZoom: 9, attributionControl: { compact: true }, renderWorldCopies: true,
        style: { version: 8, sources: { ...Object.fromEntries(Object.entries(ls).map(([id, [u, mz]]) => [id, { type: 'raster', tiles: [u], tileSize: 256, maxzoom: mz, attribution: 'NASA GIBS / EOSDIS' }])), land: { type: 'geojson', data: LAND }, pts: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } } },
          layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#0a2f5c' } }, { id: 'landbg', type: 'fill', source: 'land', paint: { 'fill-color': '#1d5a45' } }, { id: 'bm', type: 'raster', source: 'bm' }, { id: 'tc', type: 'raster', source: 'tc', layout: { visibility: 'none' } }, { id: 'nl', type: 'raster', source: 'nl', layout: { visibility: 'none' } }, { id: 'lst', type: 'raster', source: 'lst', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.85 } }, { id: 'gpm', type: 'raster', source: 'gpm', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.85 } },
            { id: 'cfill', type: 'fill', source: 'land', paint: { 'fill-color': '#5eead4', 'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.22, 0] } },
            { id: 'cline', type: 'line', source: 'land', paint: { 'line-color': '#ffffff', 'line-opacity': 0.4, 'line-width': 0.7 } },
            { id: 'halo', type: 'circle', source: 'pts', paint: { 'circle-radius': ['+', ['get', 'r'], 7], 'circle-color': ['get', 'c'], 'circle-opacity': 0.22, 'circle-blur': 0.8 } },
            { id: 'dots', type: 'circle', source: 'pts', paint: { 'circle-radius': ['get', 'r'], 'circle-color': ['get', 'c'], 'circle-opacity': ['get', 'o'], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.4 } }] } });
      try { m.on('error', (e) => { window.__fmerr = (window.__fmerr || []).concat(String(e.error?.message || e.error || e).slice(0, 160)); }); } catch { /* depuración */ }
      m.addControl(new lib.NavigationControl({ visualizePitch: true }), 'top-right'); m.addControl(new lib.ScaleControl({ unit: 'metric' }), 'bottom-left');
      let hid = null;
      m.on('mousemove', 'cfill', (e) => { const f = e.features?.[0]; if (!f) return; if (hid != null && hid !== f.id) m.setFeatureState({ source: 'land', id: hid }, { hover: false }); hid = f.id; m.setFeatureState({ source: 'land', id: hid }, { hover: true }); });
      m.on('mouseleave', 'cfill', () => { if (hid != null) m.setFeatureState({ source: 'land', id: hid }, { hover: false }); hid = null; });
      popup.current = new lib.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
      m.on('mousemove', 'dots', (e) => { const p = e.features?.[0]?.properties; if (!p) return; m.getCanvas().style.cursor = 'pointer'; const { L: l, k: kk } = cb.current; popup.current.setLngLat(e.lngLat).setHTML(`<b>${p.name}</b>${p.hasv === 'true' || p.hasv === true ? `<br/>${+p.perDec > 0 ? '+' : ''}${(+p.perDec).toFixed(2)} / ${l('década', 'decade')}<br/>${p.fdr === 'true' || p.fdr === true ? l('Cambio significativo', 'Significant change') : l('No significativo', 'Not significant')}` : ''}`).addTo(m); });
      m.on('mouseleave', 'dots', () => { m.getCanvas().style.cursor = ''; popup.current.remove(); });
      m.on('click', (e) => { const f = m.queryRenderedFeatures(e.point, { layers: ['dots'] })[0]; const { setPlace: sp, dots: ds } = cb.current; if (f) { const d = ds.find((x) => x.id === f.properties.id); if (d) return sp({ id: d.id, lat: d.lat, lon: d.lon }); } sp({ id: 'custom', lat: +e.lngLat.lat.toFixed(2), lon: +((((e.lngLat.lng + 180) % 360 + 360) % 360) - 180).toFixed(2) }); });
      const dot = document.createElement('div'); dot.className = 'fm-you'; mark.current = new lib.Marker({ element: dot }).setLngLat([place.lon, place.lat]).addTo(m);
      m.once('style.load', () => { if (!dead) { map.current = m; setReady(true); m.resize(); } });
      try { new ResizeObserver(() => m.resize()).observe(el.current); } catch { /* sin observer */ }
    })().catch((e) => { window.__fmerr = [String(e?.message || e).slice(0, 300)]; setFail(true); });
    return () => { dead = true; try { m?.remove(); } catch { /* ya cerrado */ } };
  }, []); // eslint-disable-line
  useEffect(() => { const m = map.current; if (!ready || !m) return; ['bm', 'tc', 'nl', 'lst', 'gpm'].forEach((id) => m.setLayoutProperty(id, 'visibility', id === layer || id === 'bm' && layer !== 'tc' && layer !== 'nl' ? 'visible' : 'none')); }, [layer, ready]);
  useEffect(() => {
    const m = map.current; if (!ready || !m) return; const mx = res ? Math.max(...res.list.map((d) => Math.abs(d.perDec)), 1e-9) : 1;
    m.getSource('pts').setData({ type: 'FeatureCollection', features: dots.map((d) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [d.lon, d.lat] }, properties: { id: d.id, name: d.name, perDec: d.perDec ?? 0, hasv: d.perDec != null, fdr: !!d.fdr, c: res ? (d.perDec >= 0 ? '#f97316' : '#38bdf8') : '#34d399', r: res ? 5 + 11 * Math.sqrt(Math.abs(d.perDec) / mx) : 6, o: res ? (d.fdr ? 0.95 : 0.35) : 0.9 } })) });
  }, [dots, res, ready]);
  useEffect(() => { const m = map.current; if (!ready || !m) return; mark.current?.setLngLat([place.lon, place.lat]); }, [place, ready]);
  const fly = (c, z) => map.current?.flyTo({ center: c, zoom: z, pitch: tilt ? 55 : 0, speed: 0.9, curve: 1.6, essential: true });
  const toggleTilt = () => { const n = !tilt; setTilt(n); map.current?.easeTo({ pitch: n ? 58 : 0, bearing: n ? -18 : 0, duration: 900 }); };
  return (
    <div className="fm">
      <div className="fm-map"><div ref={el} className="fm-canvas" />{!ready && !fail && <div className="fm-load"><span className="earth-spin" />{L('Cargando mapa…', 'Loading map…')}</div>}{fail && <div className="fm-load">{L('No se pudo cargar el mapa. Prueba el planeta 3D.', 'Could not load the map. Try the 3D planet.')}</div>}</div>
      <div className="fm-bar">
        <SegmentedControl size="xs" color="navy" value={layer} onChange={setLayer} data={[{ value: 'bm', label: L('Relieve', 'Relief') }, { value: 'tc', label: L('Color real', 'True color') }, { value: 'nl', label: L('Luces nocturnas', 'Night lights') }, { value: 'lst', label: L('Temperatura', 'Temperature') }, { value: 'gpm', label: L('Lluvia', 'Rain') }]} />
        <Button size="compact-sm" variant={tilt ? 'filled' : 'default'} color="navy" leftSection={<IconRotate3d size={15} />} onClick={toggleTilt}>{L('Inclinar 3D', '3D tilt')}</Button>
        <Button size="compact-sm" variant="default" leftSection={<IconCompass size={15} />} onClick={() => map.current?.easeTo({ bearing: 0, pitch: 0, duration: 600 })}>{L('Norte', 'North')}</Button>
      </div>
      <div className="fm-fly"><span><IconPlane size={14} /> {L('Volar a', 'Fly to')}</span>{FLY.map(([n, lo, la, z]) => <button key={n} onClick={() => fly([lo, la], z)}>{n}</button>)}</div>
    </div>
  );
}
