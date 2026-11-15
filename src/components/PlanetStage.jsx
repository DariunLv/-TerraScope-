import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@mantine/core';
import { IconFlask, IconMap2, IconPlus, IconMinus, IconHandFinger } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AmbientLight, DirectionalLight } from 'three';
import { feature } from 'topojson-client';
import world from '../lib/world110.json';
import { PLACES } from '../lib/data';
import { useStore, placeLabel } from '../store';
import { useT } from '../i18n';
import earth from '../assets/earth-day.jpg';
const Globe = lazy(() => import('react-globe.gl'));
const COUNTRIES = feature(world, world.objects.countries).features;
function hasWebGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }
class Safe extends Component { state = { bad: false }; static getDerivedStateFromError() { return { bad: true }; } render() { return this.state.bad ? this.props.fallback : this.props.children; } }
export default function PlanetStage() {
  const { lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b);
  const { place, setPlace, setMapOpen, scan, openCase } = useStore();
  const box = useRef(null); const globe = useRef(null); const alt = useRef(2.2); const lock = useRef(false);
  const [w, setW] = useState(520); const [gl] = useState(hasWebGL); const [hov, setHov] = useState(null);
  useEffect(() => { const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width))); if (box.current) ro.observe(box.current); return () => ro.disconnect(); }, []);
  const pts = useMemo(() => PLACES.map((p) => ({ ...p, name: p[lang] })), [lang]);
  const select = (lat, lon, id = 'custom', name) => {
    setPlace({ id, lat: +lat.toFixed(2), lon: +lon.toFixed(2), name });
    const c = globe.current?.controls(); if (c) c.autoRotate = false;
    globe.current?.pointOfView({ lat, lng: lon, altitude: Math.min(alt.current, 1.5) }, 800);
  };
  const zoomBy = (f) => { const g = globe.current; if (!g) return; const v = g.pointOfView(); g.pointOfView({ ...v, altitude: Math.max(0.25, Math.min(3, v.altitude * f)) }, 350); };
  const onZoom = (v) => {
    alt.current = v.altitude;
    if (v.altitude < 0.42 && !lock.current) { // muy cerca: pasa al mapa satelital
      lock.current = true; setPlace({ id: 'custom', lat: +v.lat.toFixed(2), lon: +v.lng.toFixed(2) }); setMapOpen(true);
      setTimeout(() => { globe.current?.pointOfView({ lat: v.lat, lng: v.lng, altitude: 1.6 }, 600); setTimeout(() => { lock.current = false; }, 900); }, 300);
    }
  };
  const size = Math.min(w, 620);
  const flat = <div className="cssplanet" onClick={() => setMapOpen(true)} role="button" aria-label="planet"><div className="cssplanet-tex" style={{ backgroundImage: `url(${earth})` }} /></div>;
  return (
    <div className="stage">
      <div ref={box} className="space light">
        {gl ? (
          <Safe fallback={flat}>
            <Suspense fallback={flat}>
              <Globe ref={globe} width={size} height={size} backgroundColor="rgba(0,0,0,0)" globeImageUrl={earth} showAtmosphere atmosphereColor="#7cc4ff" atmosphereAltitude={0.2}
                polygonsData={COUNTRIES} polygonAltitude={(d) => (d === hov ? 0.03 : 0.006)} polygonCapColor={(d) => (d === hov ? 'rgba(255,255,255,.38)' : 'rgba(255,255,255,0)')} polygonSideColor={() => 'rgba(12,90,67,.25)'} polygonStrokeColor={() => 'rgba(255,255,255,.55)'} polygonsTransitionDuration={200}
                polygonLabel={(d) => `<div class="gtip">${d.properties.name}</div>`} onPolygonHover={setHov}
                onPolygonClick={(d, e, c) => c && select(c.lat, c.lng, 'custom', d.properties.name)} onGlobeClick={({ lat, lng }) => select(lat, lng)}
                pointsData={pts} pointLat="lat" pointLng="lon" pointAltitude={0.05} pointRadius={0.7} pointLabel={(d) => `<div class="gtip">${d.name}</div>`} onPointClick={(p) => select(p.lat, p.lon, p.id)}
                pointColor={(d) => { if (d.id === place.id) return '#facc15'; const r = scan?.list.find((x) => x.id === d.id); return r ? (r.perDec >= 0 ? '#ea580c' : '#1d4ed8') : '#0c5a43'; }}
                ringsData={[place]} ringLat="lat" ringLng="lon" ringColor={() => (tt) => `rgba(250,204,21,${1 - tt})`} ringMaxRadius={5} ringPropagationSpeed={2} ringRepeatPeriod={1100}
                onZoom={onZoom}
                onGlobeReady={() => { const g = globe.current; if (!g) return; const c = g.controls(); c.autoRotate = true; c.autoRotateSpeed = 0.6; c.enableZoom = true; c.minDistance = 125; c.maxDistance = 420; g.scene().add(new AmbientLight(0xffffff, 2.2)); const d = new DirectionalLight(0xffffff, 1.2); d.position.set(1, 1, 1); g.scene().add(d); g.pointOfView({ lat: place.lat, lng: place.lon, altitude: 2.2 }, 0); }} />
            </Suspense>
          </Safe>
        ) : flat}
        <div className="gzoom"><button onClick={() => zoomBy(0.6)} aria-label="zoom in"><IconPlus size={18} /></button><button onClick={() => zoomBy(1.6)} aria-label="zoom out"><IconMinus size={18} /></button></div>
        <div className="hint light"><IconHandFinger size={15} /> {L('Gira, toca un país o acerca: al acercarte se abre el mapa satelital', 'Spin, tap a country or zoom in: zooming in opens the satellite map')}</div>
        <AnimatePresence mode="wait">
          <motion.div key={place.lat + '_' + place.lon} className="gcard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <span className="mini">{L('Lugar elegido', 'Chosen place')}</span>
            <b>{placeLabel(place, PLACES, lang)}</b>
            <span className="mini">{place.lat}°, {place.lon}°</span>
            <Button mt={8} size="sm" color="forest" leftSection={<IconFlask size={16} />} onClick={() => openCase({ vars: ['T2M', 'PRECTOTCORR', 'GWETROOT'] }, place)}>{L('Investigar aquí', 'Investigate here')}</Button>
            <button className="textlink" onClick={() => setMapOpen(true)}><IconMap2 size={14} /> {L('Ver en mapa satelital', 'See on satellite map')}</button>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
