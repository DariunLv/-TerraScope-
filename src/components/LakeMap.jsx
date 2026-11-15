import { useEffect, useRef, useState } from 'react';
import { SegmentedControl, Slider } from '@mantine/core';
import peru from '../lib/peru.json';
import { LAKES, TYPES } from '../lib/lakes';
import { useStore } from '../store';
import { useT } from '../i18n';
const G = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/';
const url = (layer, year, lvl, ext) => `${G}${layer}/default/${year}-07-15/GoogleMapsCompatible_Level${lvl}/{z}/{y}/{x}.${ext}`;
const fc = (pts, props) => ({ type: 'FeatureCollection', features: pts.map((p, i) => ({ type: 'Feature', id: i, properties: props(p), geometry: { type: 'Point', coordinates: [p.lon, p.lat] } })) });
export default function LakeMap({ points, uncovered }) {
  const { lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b);
  const { lake, setLake } = useStore();
  const el = useRef(null); const map = useRef(null); const ready = useRef(false);
  const [view, setView] = useState('map'); const [year, setYear] = useState(2025); const [err, setErr] = useState(false);
  const lakesFC = () => fc(LAKES, (l) => ({ id: l.id, name: l.name, r: 4 + Math.sqrt(Math.min(l.area, 600)) * 0.55, color: uncovered?.has(l.id) ? '#dc2626' : TYPES[l.type][2], sel: l.id === useStore.getState().lake ? 1 : 0 }));
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const ml = (await import('maplibre-gl')).default; await import('maplibre-gl/dist/maplibre-gl.css');
        if (dead || !el.current) return;
        const m = new ml.Map({ container: el.current, center: [-74.5, -10], zoom: 4.3, attributionControl: { compact: true }, style: { version: 8,
          sources: { land: { type: 'geojson', data: peru }, bm: { type: 'raster', tiles: [`${G}BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg`], tileSize: 256, maxzoom: 8, attribution: 'NASA GIBS' },
            tc: { type: 'raster', tiles: [url('MODIS_Terra_CorrectedReflectance_TrueColor', 2025, 9, 'jpg')], tileSize: 256, maxzoom: 9 }, fc: { type: 'raster', tiles: [url('MODIS_Terra_CorrectedReflectance_Bands721', 2025, 9, 'jpg')], tileSize: 256, maxzoom: 9 },
            lakes: { type: 'geojson', data: lakesFC() }, pts: { type: 'geojson', data: fc([], () => ({})) } },
          layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#dcecf7' } }, { id: 'landfill', type: 'fill', source: 'land', paint: { 'fill-color': ['case', ['==', ['get', 'name'], 'Peru'], '#f7f4ec', '#ecebe4'] } },
            { id: 'bm', type: 'raster', source: 'bm' }, { id: 'tc', type: 'raster', source: 'tc', layout: { visibility: 'none' } }, { id: 'fc', type: 'raster', source: 'fc', layout: { visibility: 'none' } },
            { id: 'landline', type: 'line', source: 'land', paint: { 'line-color': ['case', ['==', ['get', 'name'], 'Peru'], '#0c5a43', '#9fb3a6'], 'line-width': ['case', ['==', ['get', 'name'], 'Peru'], 1.8, 0.7] } },
            { id: 'pts', type: 'circle', source: 'pts', paint: { 'circle-radius': 5, 'circle-color': '#facc15', 'circle-stroke-color': '#14213d', 'circle-stroke-width': 1.5 } },
            { id: 'lakes', type: 'circle', source: 'lakes', paint: { 'circle-radius': ['get', 'r'], 'circle-color': ['get', 'color'], 'circle-opacity': 0.8, 'circle-stroke-color': ['case', ['==', ['get', 'sel'], 1], '#facc15', '#ffffff'], 'circle-stroke-width': ['case', ['==', ['get', 'sel'], 1], 3.5, 1.2] } }] } });
        m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
        const pop = new ml.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
        m.on('mousemove', 'lakes', (e) => { m.getCanvas().style.cursor = 'pointer'; pop.setLngLat(e.lngLat).setHTML(`<b>${e.features[0].properties.name}</b>`).addTo(m); });
        m.on('mouseleave', 'lakes', () => { m.getCanvas().style.cursor = ''; pop.remove(); });
        m.on('click', 'lakes', (e) => setLake(e.features[0].properties.id));
        m.on('error', (e) => { if (!/tile|Failed to fetch|AJAX|404|403/i.test(String(e?.error?.message || ''))) console.warn('LakeMap', e?.error?.message); });
        m.on('load', () => { ready.current = true; });
        map.current = m;
      } catch { setErr(true); }
    })();
    return () => { dead = true; map.current?.remove(); map.current = null; };
  }, []);
  const when = (f) => { const m = map.current; if (!m) return; if (m.isStyleLoaded()) f(m); else m.once('idle', () => f(m)); };
  useEffect(() => { when((m) => { m.getSource('lakes')?.setData(lakesFC()); }); }, [lake, uncovered]);
  useEffect(() => { const l = LAKES.find((x) => x.id === lake); if (l && map.current) map.current.flyTo({ center: [l.lon, l.lat], zoom: l.area > 500 ? 7 : l.area > 20 ? 9 : 10.5, duration: 1400 }); }, [lake]);
  useEffect(() => { when((m) => m.getSource('pts')?.setData(fc(points || [], (p) => ({ name: p.name })))); }, [points]);
  useEffect(() => { when((m) => { ['bm', 'tc', 'fc'].forEach((id) => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', (view === 'map' ? 'bm' : view) === id ? 'visible' : 'none')); }); }, [view]);
  useEffect(() => { when((m) => { m.getSource('tc')?.setTiles([url('MODIS_Terra_CorrectedReflectance_TrueColor', year, 9, 'jpg')]); m.getSource('fc')?.setTiles([url('MODIS_Terra_CorrectedReflectance_Bands721', year, 9, 'jpg')]); }); }, [year]);
  return (
    <div className="card lakemap">
      <div className="lmbar">
        <SegmentedControl size="xs" color="navy" value={view} onChange={setView} data={[{ value: 'map', label: L('Mapa', 'Map') }, { value: 'tc', label: L('Satélite: color real', 'Satellite: true color') }, { value: 'fc', label: L('Satélite: agua en negro', 'Satellite: water in black') }]} />
        {view !== 'map' && <div className="yr"><span>{L('Año', 'Year')} <b>{year}</b></span><Slider color="navy" min={2001} max={2026} value={year} onChange={setYear} label={null} style={{ flex: 1, minWidth: 140 }} /></div>}
      </div>
      <div className="lmcanvas" ref={el}>{err && <p style={{ padding: 20 }}>{L('Mapa no disponible.', 'Map unavailable.')}</p>}</div>
      <p className="mini" style={{ padding: '8px 14px', margin: 0 }}>{view === 'map' ? L('Círculos: tamaño según el área, color según el tipo. Toca un lago para ver su ficha.', 'Circles: size by area, color by type. Tap a lake for its card.') : L('Imagen MODIS (NASA GIBS) del 15 de julio de cada año. Mueve el año para ver cómo cambia el espejo de agua. En falso color el agua se ve negra.', 'MODIS image (NASA GIBS) for 15 July each year. Move the year to see the water surface change. In false color water looks black.')}</p>
    </div>
  );
}
