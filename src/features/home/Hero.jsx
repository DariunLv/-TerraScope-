import TechText from '../../components/reactbits/TechText/TechText';
import TextLoop from '../../components/reactbits/TextLoop/TextLoop';
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
import { KillaSay } from '../../killa/Killa';
import { TourLink } from '../../layout/Tour';
import { PLACES } from '../../lib/nasa/data';
import { useStore } from '../../core/store';
import { useT } from '../../core/i18n';
export default function Hero() {
  const { t, lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b);
  const { setPlace, setView, setLake, lakes: LAKES } = useStore();
  const opts = [{ group: L('Lugares del mundo', 'World places'), items: PLACES.map((p) => ({ value: 'p:' + p.id, label: p[lang] })) }, { group: L('Lagos y lagunas del Perú', 'Lakes of Peru'), items: LAKES.map((l) => ({ value: 'l:' + l.id, label: l.name })) }];
  const pick = (v) => { if (!v) return; const [k, id] = v.split(':'); if (k === 'p') { const p = PLACES.find((x) => x.id === id); setPlace({ id: p.id, lat: p.lat, lon: p.lon }); } else { const l = LAKES.find((x) => x.id === id); setLake(l.id); setPlace({ id: 'custom', lat: l.lat, lon: l.lon, name: l.name }); } };
  const paths = [[IconWorldSearch, L('Explorar el mundo', 'Explore the world'), L('Escanea 30 lugares y mira dónde sube o baja una variable.', 'Scan 30 places and see where a variable rises or falls.'), 'explorar'], [IconFlask, L('Investigar un lugar', 'Investigate a place'), L('Tres pasos y obtienes el veredicto con pruebas estadísticas.', 'Three steps to a verdict backed by statistical tests.'), 'lab'], [IconRipple, L('Lagos del Perú', 'Lakes of Peru'), L('Inventario, imágenes satelitales y estadística espacial en un solo lugar.', 'Inventory, satellite imagery and spatial statistics in one place.'), 'lagos']];
  const nums = [[40, '+ ', t.stats[0][1], L(' años', ' years')], [16, '', L('variables del sistema Tierra', 'Earth-system variables'), ''], [LAKES.length, '', L('lagos y embalses del Perú', 'lakes and reservoirs of Peru'), ''], [12, '', L('capas satelitales de la NASA por fecha', 'NASA satellite layers by date'), '']];
  const smart = [[IconRadar2, L('Detecta lo que nadie busca', 'Finds what nobody is looking for'), L('Aprende lo normal de cada lugar y cada mes, y avisa cuando algo se sale.', 'Learns what is normal for each place and month, and flags departures.'), 'lab'], [IconCrystalBall, L('Proyecta con honestidad', 'Projects honestly'), L('Escenarios con su rango de incertidumbre. Si el método no es confiable, lo dice.', 'Scenarios with their uncertainty range. If the method is unreliable, it says so.'), 'lagos'], [IconSatellite, L('Une muchos satélites', 'Joins many satellites'), L('Consulta en vivo qué misiones de la NASA observaron cada lago.', 'Queries live which NASA missions observed each lake.'), 'lagos'], [IconStack2, L('La Tierra por capas', 'Earth in layers'), L('Lluvia, temperatura, nieve, incendios y más sobre un planeta 3D, día por día.', 'Rain, temperature, snow, fires and more on a 3D planet, day by day.'), 'explorar']];
  return (
    <section className="hero">
      <div className="hero-fx"><Particles particleCount={110} particleSpread={11} speed={0.05} particleColors={['#0f9d7a', '#3b66d1', '#9fd8c2']} particleBaseSize={90} alphaParticles lightMode glow={0.4} moveParticlesOnHover /></div>
      <div className="hero-space"><div className="hero-stars" /><div id="planeta" className="hero-r"><Earth mode="hero" /><div className="hero-killa"><KillaSay estado="bienvenida" size={150} text={L('¡Hola! Soy Killa. Te ayudo a saber si el agua de un lugar está bien.', 'Hi! I am Killa. I help you check whether a place’s water is okay.')} /></div></div>
      <div className="wrap" style={{ position: 'relative' }}>
        <div className="hero-grid"><div className="hero-l">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}><span className="pill glass"><ShinyText text={t.kicker2} color="#9be7cf" shineColor="#ffffff" speed={3} /></span></motion.div>
          <h1 key={lang} className="display techh" aria-label={t.line1 + ' ' + t.line2} style={{ textTransform: 'uppercase' }}>
            <div className="tt tt1" aria-hidden="true"><TechText text={t.line1.toUpperCase()} fontFamily="Plus Jakarta Sans Variable, Inter Variable, sans-serif" fontWeight={800} fontSize={120} letterSpacing={-0.03} color="#ffffff" accentColor="#5eead4" align="left" reach={160} labels={false} guides={false} intro="none" specks={10} /></div>
            <div className="tt tt2" aria-hidden="true"><TechText text={t.line2.toUpperCase()} fontFamily="Plus Jakarta Sans Variable, Inter Variable, sans-serif" fontWeight={800} fontSize={120} letterSpacing={-0.03} color="#5eead4" accentColor="#ffffff" align="left" reach={160} labels={false} guides={false} intro="none" specks={10} /></div>
          </h1>
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
      <div className="wrap" style={{ position: 'relative' }}>
        <div className="paths">
          {paths.map(([I, a, b, v], i) => (
            <motion.div key={v} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <SpotlightCard theme="light" className="pathcard" onClick={() => setView(v)}>
                <div className="icobox"><I size={28} /></div><h3>{a}</h3><p className="mini" style={{ fontSize: 14 }}>{b}</p><span className="go">{L('Entrar', 'Enter')} <IconArrowRight size={16} /></span>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="band deep">
        <div className="wrap">
          <div className="band-head"><span className="ph-eyebrow light"><IconShieldCheck size={16} />{L('Del dato a la decisión', 'From data to decision')}</span>
            <h2 className="band-title">{L('No solo mostramos datos: te decimos qué hacer', 'We do not just show data: we tell you what to do')}</h2>
            <p className="band-sub">{L('Para cada lago o lugar la app calcula un semáforo, compara qué pasaría si ocurre algo peligroso, si no ocurre nada o si todo está tranquilo, y responde tus preguntas.', 'For each lake or place the app computes a traffic light, compares what would happen if something dangerous happens, nothing happens or all stays calm, and answers your questions.')}</p></div>
          <div className="trio">
            {[[IconFlame, L('Sequía y calor', 'Drought and heat'), L('Si ocurre algo peligroso: cuánta agua faltaría y qué hacer antes.', 'Severe drought and heat: how much water would be short and what to do first.'), '#fca5a5'], [IconEqual, L('Clima reciente', 'Recent climate'), L('Si no ocurre nada nuevo: ¿alcanza el agua o ya hay una tendencia?', 'Recent climate repeats: is there enough water or is there already a trend?'), '#bfdbfe'], [IconSunHigh, L('Año húmedo', 'Wet year'), L('Si todo está tranquilo: cuánto se recupera y cómo aprovecharlo.', 'A wet year: how much recovers and how to use it.'), '#86efac']].map(([I, a, b, c], i) => (
              <motion.div key={a} className="trio-c" style={{ '--c': c }} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}><span><I size={26} /></span><h3>{a}</h3><p>{b}</p></motion.div>))}
          </div>
          <Button size="xl" radius="xl" className="cta-light" rightSection={<IconArrowRight size={22} />} onClick={() => { setLake('titicaca'); setView('decidir'); }}>{L('Probar con el lago Titicaca', 'Try it with Lake Titicaca')}</Button>
        </div>
      </div>
      <div className="wrap">
        <h2 className="smarth">{L('¿Está cambiando el clima del lugar que te importa?', 'Is the climate of the place you care about changing?')}</h2>
        <div className="smart">
          {smart.map(([I, a, b, v], i) => (
            <motion.button key={a} className="smartc" onClick={() => setView(v)} initial={{ opacity: 0, y: 26, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} whileHover={{ y: -4 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <span className="smarti"><I size={22} /></span><b>{a}</b><span>{b}</span>
            </motion.button>
          ))}
        </div>
      </div>
      <div className="band stats-band"><div className="wrap"><div className="stats big">{nums.map(([n, p, label, suf], i) => <div key={i} className="stat card"><b className="num">{p}<CountUp to={n} duration={1.6} delay={0.3 + i * 0.15} />{suf && <small>{suf}</small>}</b><span>{label}</span></div>)}</div></div></div>
      <div className="marq marq-tl"><TextLoop text="NASA POWER ✦ GIBS ✦ EONET ✦ Earthdata ✦ SMAP ✦ FIRMS ✦ SWOT ✦ MODIS ✦ GPM ✦ Landsat ✦ Sentinel-2" shape="wave" speed={60} fontSize={26} fontWeight={800} letterSpacing={3} color="#0c5a43" ribbon={false} curviness={40} pauseOnHover /></div>
      <div className="marq" hidden><ScrollVelocity texts={['NASA POWER · GIBS · EONET · Earthdata CMR · EPIC · SMAP · FIRMS · SWOT · OPERA · MODIS · GPM · Landsat · Sentinel-2 ·']} velocity={28} className="marqt" /></div>
    </section>
  );
}
