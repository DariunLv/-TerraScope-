import { motion } from 'framer-motion';
import { Select } from '@mantine/core';
import { IconWorldSearch, IconFlask, IconRipple, IconSearch, IconArrowRight } from '@tabler/icons-react';
import Particles from '../rb/Particles';
import SplitText from '../rb/SplitText';
import BlurText from '../rb/BlurText';
import GradientText from '../rb/GradientText';
import ShinyText from '../rb/ShinyText';
import CountUp from '../rb/CountUp';
import SpotlightCard from '../rb/SpotlightCard';
import PlanetStage from './PlanetStage';
import { PLACES } from '../lib/data';
import { LAKES } from '../lib/lakes';
import { useStore } from '../store';
import { useT } from '../i18n';
export default function Hero() {
  const { t, lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b);
  const { setPlace, setView, setLake } = useStore();
  const opts = [{ group: L('Lugares del mundo', 'World places'), items: PLACES.map((p) => ({ value: 'p:' + p.id, label: p[lang] })) }, { group: L('Lagos y lagunas del Perú', 'Lakes of Peru'), items: LAKES.map((l) => ({ value: 'l:' + l.id, label: l.name })) }];
  const pick = (v) => { if (!v) return; const [k, id] = v.split(':'); if (k === 'p') { const p = PLACES.find((x) => x.id === id); setPlace({ id: p.id, lat: p.lat, lon: p.lon }); } else { const l = LAKES.find((x) => x.id === id); setLake(l.id); setPlace({ id: 'custom', lat: l.lat, lon: l.lon, name: l.name }); } };
  const paths = [[IconWorldSearch, L('Explorar el mundo', 'Explore the world'), L('Escanea 30 lugares y mira dónde sube o baja una variable.', 'Scan 30 places and see where a variable rises or falls.'), 'explorar'], [IconFlask, L('Investigar un lugar', 'Investigate a place'), L('Tres pasos y obtienes el veredicto con pruebas estadísticas.', 'Three steps to a verdict backed by statistical tests.'), 'lab'], [IconRipple, L('Lagos del Perú', 'Lakes of Peru'), L('Inventario, imágenes satelitales y estadística espacial en un solo lugar.', 'Inventory, satellite imagery and spatial statistics in one place.'), 'lagos']];
  const nums = [[40, '+ ', t.stats[0][1], L(' años', ' years')], [16, '', L('variables del sistema Tierra', 'Earth-system variables'), ''], [LAKES.length, '', L('lagos y embalses del Perú', 'lakes and reservoirs of Peru'), ''], [7, '', L('librerías de gráficos', 'charting libraries'), '']];
  return (
    <section className="hero">
      <div className="hero-fx"><Particles particleCount={110} particleSpread={11} speed={0.05} particleColors={['#0f9d7a', '#3b66d1', '#9fd8c2']} particleBaseSize={90} alphaParticles lightMode glow={0.4} moveParticlesOnHover /></div>
      <div className="wrap" style={{ position: 'relative' }}>
        <div className="hero-grid"><div className="hero-l">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}><span className="pill glass"><ShinyText text={t.kicker2} color="#0c5a43" shineColor="#34d399" speed={3} /></span></motion.div>
          <h1 key={lang}>
            <SplitText text={t.line1} tag="span" splitType="words" delay={60} duration={0.9} textAlign="inherit" className="h1l" /><br />
            <GradientText colors={['#0c5a43', '#1e3a8a', '#0f9d7a', '#0c5a43']} animationSpeed={7}>{t.line2}</GradientText>
          </h1>
          <div style={{ display: 'flex' }}><BlurText key={lang} text={t.sub2} className="sub" delay={25} animateBy="words" stepDuration={0.3} /></div>
          <Select className="herosearch" size="lg" radius="xl" searchable clearable={false} leftSection={<IconSearch size={20} />} placeholder={L('Busca un lugar o un lago…', 'Search a place or a lake…')} data={opts} onChange={pick} maxDropdownHeight={280} nothingFoundMessage={L('Sin resultados', 'No results')} />
          <p className="mini">{L('O toca cualquier punto del planeta.', 'Or tap any point on the planet.')}</p>
        </div>
        <div id="planeta" className="hero-r"><PlanetStage /></div></div>
        <div className="paths">
          {paths.map(([I, a, b, v], i) => (
            <motion.div key={v} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <SpotlightCard theme="light" className="pathcard" onClick={() => setView(v)}>
                <div className="icobox"><I size={28} /></div><h3>{a}</h3><p className="mini" style={{ fontSize: 14 }}>{b}</p><span className="go">{L('Entrar', 'Enter')} <IconArrowRight size={16} /></span>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
        <div className="stats">{nums.map(([n, p, label, suf], i) => <div key={i} className="stat card"><b className="num">{p}<CountUp to={n} duration={1.6} delay={0.3 + i * 0.15} />{suf}</b><span>{label}</span></div>)}</div>
      </div>
    </section>
  );
}
