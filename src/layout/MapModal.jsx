import { useEffect, useRef, useState } from 'react';
import { Button, SegmentedControl, ActionIcon } from '@mantine/core';
import { IconX, IconFlask } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../core/store';
import { useT } from '../core/i18n';
import { feature } from 'topojson-client';
import world from '../lib/geo/world110.json';
const LAND = feature(world, world.objects.countries);
// Países que cruzan el antimeridiano: se desplazan para que no dibujen una franja
const shift = (c) => (typeof c[0] === 'number' ? [c[0] < 0 ? c[0] + 360 : c[0], c[1]] : c.map(shift));
LAND.features.forEach((f) => { const xs = JSON.stringify(f.geometry.coordinates).match(/\[(-?[\d.]+),/g).map((m) => +m.slice(1, -1)); if (Math.min(...xs) < -170 && Math.max(...xs) > 170 && f.id !== '010') f.geometry.coordinates = shift(f.geometry.coordinates); });
const G = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/';
function daysAgo(n) { const d = new Date(Date.now() - n * 864e5); return d.toISOString().slice(0, 10); }
function layers() {
  const d = daysAgo(6);
  return [
    { id: 'bm', url: `${G}BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg`, max: 8 },
    { id: 'nl', url: `${G}VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg`, max: 8 },
    { id: 'tc', url: `${G}MODIS_Terra_CorrectedReflectance_TrueColor/default/${d}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`, max: 9 },
    { id: 'gpm', url: `${G}IMERG_Precipitation_Rate/default/${d}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`, max: 6 },
    { id: 'lst', url: `${G}MODIS_Terra_Land_Surface_Temp_Day/default/${d}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`, max: 7 },
  ];
}
export default function MapModal() {
  const { t } = useT();
  const { mapOpen, setMapOpen, place, setPlace } = useStore();
  const el = useRef(null); const map = useRef(null); const marker = useRef(null); const lib = useRef(null);
  const dialog = useRef(null), currentLayer = useRef('0'), currentPlace = useRef(place); currentPlace.current = place;
  const [layer, setLayer] = useState('0'); const [err, setErr] = useState(false);
  currentLayer.current = layer;
  useEffect(() => {
    if (!mapOpen) return;
    const previousFocus = document.activeElement, previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; dialog.current?.focus();
    const keyboard = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); setMapOpen(false); }
      if (event.key !== 'Tab') return;
      const controls = [...(dialog.current?.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href],[tabindex="0"]') || [])].filter((element) => !element.hidden);
      const first = controls[0], last = controls.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { document.removeEventListener('keydown', keyboard); document.body.style.overflow = previousOverflow; previousFocus?.focus?.(); };
  }, [mapOpen, setMapOpen]);
  useEffect(() => {
    if (!mapOpen) return;
    setErr(false);
    let dead = false;
    (async () => {
      try {
        const ml = (await import('maplibre-gl')).default; await import('maplibre-gl/dist/maplibre-gl.css');
        if (dead || !el.current) return; lib.current = ml;
        const L = layers();
        const m = new ml.Map({
          container: el.current, center: [place.lon, place.lat], zoom: 4, attributionControl: { compact: true },
          style: { version: 8, sources: Object.fromEntries([['land', { type: 'geojson', data: LAND }], ...L.map((l) => [l.id, { type: 'raster', tiles: [l.url], tileSize: 256, maxzoom: l.max, attribution: 'NASA GIBS / EOSDIS' }])]),
            layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#dcecf7' } }, { id: 'landfill', type: 'fill', source: 'land', paint: { 'fill-color': '#f7f4ec' } }, { id: 'landline', type: 'line', source: 'land', paint: { 'line-color': '#9fb3a6', 'line-width': 0.8 } }, ...L.map((l, i) => ({ id: l.id, type: 'raster', source: l.id, layout: { visibility: i === 0 ? 'visible' : 'none' } }))] },
        });
        m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
        marker.current = new ml.Marker({ color: '#f59e0b' }).setLngLat([place.lon, place.lat]).addTo(m);
        m.on('click', (e) => { setPlace({ id: 'custom', lat: +e.lngLat.lat.toFixed(3), lon: +e.lngLat.lng.toFixed(3) }); });
        m.on('error', () => {});
        map.current = m;
        m.once('load', () => {
          if (dead) return;
          ['bm', 'nl', 'tc', 'gpm', 'lst'].forEach((id, index) => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', String(index) === currentLayer.current ? 'visible' : 'none'));
          marker.current?.setLngLat([currentPlace.current.lon, currentPlace.current.lat]);
        });
      } catch { setErr(true); }
    })();
    return () => { dead = true; map.current?.remove(); map.current = null; };
  }, [mapOpen]);
  useEffect(() => { marker.current?.setLngLat([place.lon, place.lat]); }, [place]);
  useEffect(() => {
    const m = map.current; if (!m || !m.isStyleLoaded()) return;
    ['bm', 'nl', 'tc', 'gpm', 'lst'].forEach((id, i) => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', String(i) === layer ? 'visible' : 'none'));
  }, [layer, mapOpen]);
  const go = () => { setMapOpen(false); useStore.getState().openCase({ vars: ['T2M', 'PRECTOTCORR', 'GWETROOT'] }, useStore.getState().place); };
  return (
    <AnimatePresence>
      {mapOpen && (
        <motion.div className="modal-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMapOpen(false)}>
          <motion.div ref={dialog} role="dialog" aria-modal="true" aria-label={t.mapHint} tabIndex={-1} className="glass modal" initial={{ scale: 0.4, opacity: 0, borderRadius: 400 }} animate={{ scale: 1, opacity: 1, borderRadius: 24 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ type: 'spring', damping: 22, stiffness: 160 }} onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <SegmentedControl size="xs" value={layer} onChange={setLayer} data={t.mapLayers.map((l, i) => ({ label: l, value: String(i) }))} />
              <ActionIcon variant="subtle" onClick={() => setMapOpen(false)} aria-label={t.close}><IconX /></ActionIcon>
            </div>
            <div className="map" ref={el}>{err && <p style={{ padding: 20 }}>Mapa no disponible.</p>}</div>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
              <span className="mini">{t.mapHint} · {place.lat.toFixed(2)}°, {place.lon.toFixed(2)}°</span>
              <Button leftSection={<IconFlask size={18} />} onClick={go} color="teal.9">{t.investigate}</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
