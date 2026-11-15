import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Button, Loader } from '@mantine/core';
import { IconMapPin } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { PLACES } from '../lib/data';
import { useStore } from '../store';
import { useT } from '../i18n';
import { useTheme } from '../palette';
import SpotlightCard from '../rb/SpotlightCard';
import Magnet from '../rb/Magnet';
const Globe = lazy(() => import('react-globe.gl'));
function hasWebGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }
export default function GlobeExplorer() {
  const theme = useTheme();
  const { t, lang } = useT();
  const { place, setPlace, setMapOpen } = useStore();
  const box = useRef(null); const globe = useRef(null);
  const [w, setW] = useState(600); const [gl] = useState(hasWebGL);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  const pick = (p) => { setPlace({ id: p.id, lat: p.lat, lon: p.lon }); globe.current?.pointOfView({ lat: p.lat, lng: p.lon, altitude: 1.3 }, 900); setTimeout(() => setMapOpen(true), 700); };
  const pts = PLACES.map((p) => ({ ...p, name: p[lang] }));
  return (
    <section id="planeta"><div className="wrap">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center' }}>
        <h2>{t.globeTitle}</h2><p className="sub" style={{ margin: '0 auto' }}>{t.globeSub}</p>
      </motion.div>
      <div className="globe-grid" style={{ marginTop: 22 }}>
      <motion.div className="card globe-card" ref={box} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
        {gl ? (
          <Suspense fallback={<Loader />}>
            <Globe ref={globe} width={w} height={Math.min(w * 0.95, 620)} backgroundColor="rgba(0,0,0,0)"
              globeImageUrl="./earth-blue-marble.jpg" atmosphereColor="#6aa7ff" atmosphereAltitude={0.22}
              pointsData={pts} pointLat="lat" pointLng="lon" pointAltitude={0.06} pointRadius={0.9}
              pointColor={(d) => (d.id === place.id ? '#ffb020' : '#ff4d6d')} pointLabel="name" onPointClick={pick}
              ringsData={pts.filter((p) => p.id === place.id)} ringLat="lat" ringLng="lon" ringColor={() => (tt) => `rgba(255,176,32,${1 - tt})`} ringMaxRadius={5} ringPropagationSpeed={2} ringRepeatPeriod={1100}
              onGlobeReady={() => { const c = globe.current?.controls(); if (c) { c.autoRotate = true; c.autoRotateSpeed = 0.6; } }} />
          </Suspense>
        ) : <div className="sub" style={{ padding: 20 }}>WebGL no disponible. Elige un lugar abajo.</div>}
      </motion.div>
        <SpotlightCard theme={theme} className="side">
          <span className="tag ev">{t.explore}</span>
          <h3 style={{ margin: '10px 0 4px' }}>{PLACES.find((p) => p.id === place.id)?.[lang] || 'Punto personalizado'}</h3>
          <p className="mini">{t.coords}: {place.lat}°, {place.lon}°</p>
          <p className="mini" style={{ fontSize: 14 }}>{t.globeSub}</p>
          <Magnet padding={50} magnetStrength={3}><Button onClick={() => setMapOpen(true)} variant="gradient" gradient={{ from: 'blue', to: 'violet' }}>{t.openMap}</Button></Magnet>
        </SpotlightCard>
      </div>
      <div className="place-list">
        {PLACES.map((p) => <Button key={p.id} size="xs" variant={p.id === place.id ? 'filled' : 'white'} leftSection={<IconMapPin size={14} />} onClick={() => pick(p)}>{p[lang]}</Button>)}
      </div>
    </div></section>
  );
}
