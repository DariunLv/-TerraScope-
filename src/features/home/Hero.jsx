import Drip from '../../ui/Drip';
import Ghost from '../../ui/Ghost';
import About from './About';
import HeroHeadline from './HeroHeadline';
import HomeVisibility from './HomeVisibility';
import TextLoop from '../../components/reactbits/TextLoop/TextLoop';
import { memo, useMemo, lazy, Suspense } from 'react';
import useFx from '../../ui/useFx';
const GhostFibers = lazy(() => import('../../components/reactbits/GhostFibers/GhostFibers'));
import { motion } from 'framer-motion';
import { Select, Button } from '@mantine/core';
import { IconWorldSearch, IconFlask, IconRipple, IconSearch, IconArrowRight, IconRadar2, IconCrystalBall, IconSatellite, IconStack2, IconShieldCheck, IconMessageChatbot, IconFlame, IconEqual, IconSunHigh, IconFingerprint } from '@tabler/icons-react';
import Particles from '../../ui/Particles';
import SplitText from '../../ui/SplitText';
import BlurText from '../../ui/BlurText';
import GradientText from '../../ui/GradientText';
import ShinyText from '../../ui/ShinyText';
import CountUp from '../../ui/CountUp';
import SpotlightCard from '../../ui/SpotlightCard';
import ScrollVelocity from '../../ui/ScrollVelocity';
import Earth from '../../shared/earth/Earth';
import KillaView, { KillaSay } from '../../killa/Killa';
import Lot from '../../ui/Lot';
import { TourLink } from '../../layout/Tour';
import { PLACES } from '../../lib/nasa/data';
import { useStore } from '../../core/store';
import { useT } from '../../core/i18n';
const Killa = memo(KillaView);
const PARTICLE_COLORS = ['#0f9d7a', '#3b66d1', '#9fd8c2'];
export default function Hero() {
  const fxOn = useFx();
  const { t, lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b);
  const setPlace = useStore(s => s.setPlace), setView = useStore(s => s.setView), setLake = useStore(s => s.setLake), LAKES = useStore(s => s.lakes);
  const opts = useMemo(() => [{ group: L('Lugares del mundo', 'World places'), items: PLACES.map((p) => ({ value: 'p:' + p.id, label: p[lang] })) }, { group: L('Lagos y lagunas del Perú', 'Lakes of Peru'), items: LAKES.map((l) => ({ value: 'l:' + l.id, label: l.name })) }], [lang, LAKES]);
  const pick = (v) => { if (!v) return; const [k, id] = v.split(':'); if (k === 'p') { const p = PLACES.find((x) => x.id === id); setPlace({ id: p.id, lat: p.lat, lon: p.lon }); } else { const l = LAKES.find((x) => x.id === id); setLake(l.id); setPlace({ id: 'custom', lat: l.lat, lon: l.lon, name: l.name }); } };
  const paths = [[IconWorldSearch, L('Explorar el mundo', 'Explore the world'), L('Escanea 30 lugares y mira dónde sube o baja una variable.', 'Scan 30 places and see where a variable rises or falls.'), 'explorar'], [IconFlask, L('Investigar un lugar', 'Investigate a place'), L('Tres pasos y obtienes el veredicto con pruebas estadísticas.', 'Three steps to a verdict backed by statistical tests.'), 'lab'], [IconRipple, L('Lagos del Perú', 'Lakes of Peru'), L('Inventario, imágenes satelitales y estadística espacial en un solo lugar.', 'Inventory, satellite imagery and spatial statistics in one place.'), 'lagos']];
  const nums = [[40, '+ ', t.stats[0][1], L(' años', ' years')], [16, '', L('variables del sistema Tierra', 'Earth-system variables'), ''], [LAKES.length, '', L('lagos y embalses del Perú', 'lakes and reservoirs of Peru'), ''], [12, '', L('capas satelitales de la NASA por fecha', 'NASA satellite layers by date'), '']];
  const smart = [[IconRadar2, L('Detecta lo que nadie busca', 'Finds what nobody is looking for'), L('Aprende lo normal de cada lugar y cada mes, y avisa cuando algo se sale.', 'Learns what is normal for each place and month, and flags departures.'), 'lab'], [IconCrystalBall, L('Proyecta con honestidad', 'Projects honestly'), L('Escenarios con su rango de incertidumbre. Si el método no es confiable, lo dice.', 'Scenarios with their uncertainty range. If the method is unreliable, it says so.'), 'lagos'], [IconSatellite, L('Une muchos satélites', 'Joins many satellites'), L('Consulta en vivo qué misiones de la NASA observaron cada lago.', 'Queries live which NASA missions observed each lake.'), 'lagos'], [IconStack2, L('La Tierra por capas', 'Earth in layers'), L('Lluvia, temperatura, nieve, incendios y más sobre un planeta 3D, día por día.', 'Rain, temperature, snow, fires and more on a 3D planet, day by day.'), 'explorar']];
  return (
    <section className="hero">
      <HomeVisibility className="hero-fx" defer><Particles particleCount={110} particleSpread={11} speed={0.05} particleColors={PARTICLE_COLORS} particleBaseSize={90} alphaParticles lightMode glow={0.4} moveParticlesOnHover /></HomeVisibility>
      <div className="hero-space"><div className="hero-stars" /><div id="planeta" className="hero-r"><Earth mode="hero" /><div className="hero-killa"><KillaSay memoAvatar estado="bienvenida" size={150} text={L('¡Hola! Soy Killa. Te ayudo a saber si el agua de un lugar está bien.', 'Hi! I am Killa. I help you check whether a place’s water is okay.')} /></div></div>
      <div className="wrap" style={{ position: 'relative' }}>
        <div className="hero-grid"><div className="hero-l">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}><span className="pill glass"><ShinyText text={t.kicker2} color="#9be7cf" shineColor="#ffffff" speed={3} /></span></motion.div>
          <HeroHeadline first={t.line1} second={t.line2} lang={lang} />
          <div style={{ display: 'flex' }}><BlurText key={lang} text={t.sub2} className="sub lead" delay={25} animateBy="words" stepDuration={0.3} /></div>
          <div className="hero-btns">
            <Button size="xl" radius="xl" color="forest" className="cta-main" rightSection={<IconArrowRight size={22} />} onClick={() => setView('decidir')}>{L('Abrir el centro de decisiones', 'Open the decision center')}</Button>
            <Button size="xl" radius="xl" variant="default" className="cta-alt" leftSection={<IconFlask size={22} />} onClick={() => setView('lab')}>{L('Investigar un lugar', 'Investigate a place')}</Button>
          </div>
          <TourLink className="textlink tourlink" />
          <Select className="herosearch" size="md" radius="xl" searchable clearable={false} leftSection={<IconSearch size={18} />} placeholder={L('O busca un lugar o un lago…', 'Or search a place or a lake…')} data={opts} onChange={pick} maxDropdownHeight={280} nothingFoundMessage={L('Sin resultados', 'No results')} />
          <ul className="hero-badges" hidden><li><IconShieldCheck size={18} />{L('Semáforo y alertas', 'Traffic light and alerts')}</li><li><IconCrystalBall size={18} />{L('Tres futuros posibles', 'Three possible futures')}</li><li><IconMessageChatbot size={18} />{L('Asistente que responde', 'Assistant that answers')}</li></ul>
        </div>
        </div></div></div>
      <Drip />
      <About />
      <div className="wrap" style={{ position: 'relative' }}>
        <div className="paths">
          {paths.map(([I, a, b, v], i) => (
            <motion.div key={v} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <SpotlightCard theme="light" className="pathcard" onClick={() => setView(v)}>
                <Ghost k={['globe', 'flask', 'calm'][i % 3]} i={i + 1} size={130} /><div className="icobox"><I size={28} /></div><h3>{a}</h3><p className="mini" style={{ fontSize: 14 }}>{b}</p><span className="go">{L('Entrar', 'Enter')} <IconArrowRight size={16} /></span>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="band deep dd">
        <div className="dd-mesh" aria-hidden="true"><i /><i /><i /><u /></div>
        {fxOn && <HomeVisibility className="band-gl" defer><Suspense fallback={null}><GhostFibers glowColor="#5eead4" lineColor="#bbf7d0" secondaryColor="#93c5fd" speed={0.35} threads={34} fiberStyle="lines" mouseInteraction={false} pulseOnClick={false} grain={0} dpr={1} /></Suspense></HomeVisibility>}
        <div className="wrap">
          <div className="dd-top">
            <div className="band-head"><span className="ph-eyebrow light"><IconShieldCheck size={16} />{L('Del dato a la decisión', 'From data to decision')}</span>
              <h2 className="band-title">{L('No solo mostramos datos: te decimos qué hacer', 'We do not just show data: we tell you what to do')}</h2>
              <p className="band-sub">{L('Para cada lago o lugar la app calcula un semáforo, compara qué pasaría si ocurre algo peligroso, si no ocurre nada o si todo está tranquilo, y responde tus preguntas.', 'For each lake or place the app computes a traffic light, compares what would happen if something dangerous happens, nothing happens or all stays calm, and answers your questions.')}</p>
              <Button size="xl" radius="xl" className="cta-light" rightSection={<IconArrowRight size={22} />} onClick={() => { setLake('titicaca'); setView('decidir'); }}>{L('Probar con el lago Titicaca', 'Try it with Lake Titicaca')}</Button>
            </div>
            <div className="dd-killa">
              <motion.span className="dd-chip c1" animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity }}><i className="g" />{L('Tranquilo', 'Calm')}</motion.span>
              <motion.span className="dd-chip c2" animate={{ y: [0, 8, 0] }} transition={{ duration: 4.6, repeat: Infinity }}><i className="a" />{L('Vigilar', 'Watch')}</motion.span>
              <motion.span className="dd-chip c3" animate={{ y: [0, -6, 0] }} transition={{ duration: 5.2, repeat: Infinity }}><i className="r" />{L('Alerta', 'Alert')}</motion.span>
              <span className="dd-halo" /><Killa estado="decidida" size={330} />
            </div>
          </div>
          <div className="trio">
            {[[IconFlame, L('Sequía y calor', 'Drought and heat'), L('Si ocurre algo peligroso: cuánta agua faltaría y qué hacer antes.', 'Severe drought and heat: how much water would be short and what to do first.'), '#fca5a5', 78, 'thermo'], [IconEqual, L('Clima reciente', 'Recent climate'), L('Si no ocurre nada nuevo: ¿alcanza el agua o ya hay una tendencia?', 'Recent climate repeats: is there enough water or is there already a trend?'), '#bfdbfe', 46, 'lakes'], [IconSunHigh, L('Año húmedo', 'Wet year'), L('Si todo está tranquilo: cuánto se recupera y cómo aprovecharlo.', 'A wet year: how much recovers and how to use it.'), '#86efac', 18, 'globe']].map(([I, a, b, c, r, lt], i) => (
              <motion.div key={a} className="trio-c" style={{ '--c': c }} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <Ghost k={['fire', 'calm', 'sun'][i]} i={i} size={150} />
                <div className="trio-h"><span><I size={26} /></span>{i === 0 && <Lot pauseOffscreen k="thermo" size={74} className="trio-lot" />}</div>
                <h3>{a}</h3><p>{b}</p>
                <div className="trio-gauge"><small>{L('Riesgo de agua', 'Water risk')}</small><div><motion.i style={{ background: c }} initial={{ width: 0 }} whileInView={{ width: r + '%' }} viewport={{ once: true }} transition={{ duration: 1.4, delay: 0.3 + i * 0.15 }} /></div><b>{r}%</b></div>
              </motion.div>))}
          </div>
        </div>
      </div>
      <div className="wrap">
        <h2 className="smarth">{L('¿Está cambiando el clima del lugar que te importa?', 'Is the climate of the place you care about changing?')}</h2>
        <div className="smart">
          {smart.map(([I, a, b, v], i) => (
            <motion.button key={a} className="smartc" onClick={() => setView(v)} initial={{ opacity: 0, y: 26, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} whileHover={{ y: -4 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <Ghost k={['radar', 'rain', 'ai', 'shield', 'leaf', 'snow'][i % 6]} i={i} size={110} /><span className="smarti"><I size={22} /></span><b>{a}</b><span>{b}</span>
            </motion.button>
          ))}
        </div>
      </div>
      <div className="band stats-band"><div className="wrap"><div className="stats big">{nums.map(([n, p, label, suf], i) => <div key={i} className="stat card"><b className="num">{p}<CountUp to={n} duration={1.6} delay={0.3 + i * 0.15} />{suf && <small>{suf}</small>}</b><span>{label}</span></div>)}</div></div></div>
      <div className="marq marq-tl"><TextLoop text="NASA POWER ✦ GIBS ✦ EONET ✦ Earthdata ✦ SMAP ✦ FIRMS ✦ SWOT ✦ MODIS ✦ GPM ✦ Landsat ✦ Sentinel-2" shape="wave" speed={60} fontSize={26} fontWeight={800} letterSpacing={3} color="#0c5a43" ribbon={false} curviness={40} pauseOnHover /></div>
    </section>
  );
}
