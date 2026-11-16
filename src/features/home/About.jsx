/* “¿De qué trata?”: explica en 20 segundos qué es la app, cómo se usa y qué tiene (con la IA destacada). */
import { motion } from 'framer-motion';
import { Button } from '@mantine/core';
import { IconArrowRight, IconSparkles } from '@tabler/icons-react';
import { LuMapPin, LuSatelliteDish, LuTrafficCone, LuTelescope, LuBot, LuFingerprint, LuBell, LuBookOpen, LuWaves, LuChartLine, LuMessagesSquare, LuGlobe } from 'react-icons/lu';
import { PiRobotBold } from 'react-icons/pi';
import TrueFocus from '../../components/reactbits/TrueFocus/TrueFocus';
import Killa from '../../killa/Killa';
import Ghost from '../../ui/Ghost';
import { useStore } from '../../core/store';
import { useT } from '../../core/i18n';
import useFx from '../../ui/useFx';
export default function About() {
  const { lang } = useT(), L = (a, b) => (lang === 'es' ? a : b), setView = useStore((s) => s.setView), fx = useFx();
  const steps = [
    [LuMapPin, L('1. Elige un lugar', '1. Pick a place'), L('Un lago del Perú, una ciudad o cualquier punto del planeta.', 'A Peruvian lake, a city or any point on the planet.')],
    [LuSatelliteDish, L('2. Leemos los satélites de la NASA', '2. We read NASA satellites'), L('40 años de lluvia, temperatura, humedad y agua, descargados por ti, en vivo.', '40 years of rain, temperature, soil moisture and water, fetched live for you.')],
    [LuBot, L('3. Killa, la IA, te lo explica', '3. Killa, the AI, explains it'), L('Un semáforo, tres futuros posibles y una explicación en palabras simples.', 'A traffic light, three possible futures and a plain-language explanation.')],
  ];
  const feats = [
    [LuTrafficCone, L('Semáforo de riesgo', 'Risk traffic light'), L('Verde, ámbar o rojo con la razón y qué hacer.', 'Green, amber or red with the reason and what to do.'), 'decidir', 'shield'],
    [LuChartLine, L('Tres futuros', 'Three futures'), L('Qué pasa si hay sequía, si todo sigue igual o si llueve más.', 'What happens with drought, business as usual or more rain.'), 'decidir', 'trend'],
    [LuTelescope, L('Laboratorio del detective', 'Detective lab'), L('Prueba si un cambio es real o solo ruido, paso a paso.', 'Test whether a change is real or just noise, step by step.'), 'lab', 'flask'],
    [LuWaves, L('39 lagos del Perú', '39 Peruvian lakes'), L('Inventario, comparación y ranking de los que se salen de lo normal.', 'Inventory, comparison and ranking of the ones off normal.'), 'lagos', 'calm'],
    [LuGlobe, L('Planeta 3D interactivo', 'Interactive 3D planet'), L('Gira la Tierra, enciende capas de la NASA y vuela a cualquier país.', 'Spin Earth, switch on NASA layers and fly to any country.'), 'explorar', 'globe'],
    [LuBell, L('Centinela', 'Sentinel'), L('Vigila todos los lagos y avisa cuando algo cambia.', 'Watches every lake and warns you when something changes.'), 'decidir', 'alert'],
    [LuFingerprint, L('Pasaporte de evidencia', 'Evidence passport'), L('Un informe verificable que puedes compartir.', 'A verifiable report you can share.'), 'decidir', 'fingerprint'],
    [LuBookOpen, L('Aprender jugando', 'Learn by playing'), L('Seis lecciones para entender tendencias sin ser científico.', 'Six lessons to understand trends without being a scientist.'), 'aprender', 'book'],
  ];
  return (
    <section className="about wrap">
      <motion.div className="about-head" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}>
        <span className="ph-eyebrow"><IconSparkles size={15} />{L('¿De qué trata?', 'What is this?')}</span>
        <h2>{L('TerraScope convierte datos satelitales de la NASA en una respuesta simple', 'TerraScope turns NASA satellite data into a simple answer')}</h2>
        <p>{L('¿El clima o el agua del lugar que te importa está cambiando? ¿Qué debería hacer yo? No necesitas ser científico: la app hace el análisis, una IA te lo explica y tú decides.', 'Is the climate or water of the place you care about changing, and what should you do? You do not need to be a scientist: the app does the analysis, an AI explains it and you decide.')}</p>
      </motion.div>
      <div className="about-steps">
        {steps.map(([I, a, b], i) => (
          <motion.div key={a} className="about-step" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}>
            <span className="about-ico"><I size={26} /></span><b>{a}</b><span>{b}</span>
          </motion.div>
        ))}
      </div>
      <div className="about-grid">
        {feats.map(([I, a, b, v, g], i) => (
          <motion.button key={a} className="about-feat" onClick={() => setView(v)} initial={{ opacity: 0, y: 26, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} whileHover={{ y: -5 }} viewport={{ once: true }} transition={{ delay: (i % 4) * 0.07 }}>
            <Ghost k={g} i={i} size={120} />
            <span className="about-ico sm"><I size={22} /></span><b>{a}</b><span>{b}</span>
          </motion.button>
        ))}
      </div>
      <motion.div className="about-ai dark-card" initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}>
        <Ghost k="ai" i={2} size={230} pos={4} />
        <div className="about-ai-l">
          <span className="ph-eyebrow light"><PiRobotBold size={15} />{L('Inteligencia artificial', 'Artificial intelligence')}</span>
          <h3>{L('Conoce a Killa, la IA de la app', 'Meet Killa, the app’s AI')}</h3>
          <div className="about-tf">{fx ? <TrueFocus sentence={L('Pregunta Entiende Decide', 'Ask Understand Decide')} blurAmount={3} borderColor="#5eead4" animationDuration={0.6} pauseBetweenAnimations={1.2} /> : <b>{L('Pregunta · Entiende · Decide', 'Ask · Understand · Decide')}</b>}</div>
          <ul>
            <li><LuMessagesSquare size={18} />{L('Responde cualquier pregunta sobre la NASA, los datos y esta app.', 'Answers any question about NASA, the data and this app.')}</li>
            <li><LuTelescope size={18} />{L('Explica cada gráfico en palabras simples, con los números reales.', 'Explains every chart in plain words, using the real numbers.')}</li>
            <li><LuTrafficCone size={18} />{L('Te dice qué hacer y qué tan seguro está.', 'Tells you what to do and how sure it is.')}</li>
            <li><LuFingerprint size={18} />{L('No inventa cifras: un verificador descarta respuestas con números que la app no calculó.', 'Never invents figures: a verifier discards answers with numbers the app did not compute.')}</li>
          </ul>
          <Button size="md" radius="xl" variant="white" color="forest" onClick={() => useStore.getState().open3D('planet')}>{L('Ver el planeta 3D · 2050', 'See the 3D planet · 2050')}</Button>
          <Button size="md" radius="xl" variant="white" color="forest" onClick={() => useStore.getState().open3D('surface')}>{L('Ver la superficie 3D', 'See the 3D surface')}</Button>
          <Button size="md" radius="xl" color="forest" rightSection={<IconArrowRight size={18} />} onClick={() => setView('killa')}>{L('Preguntarle a Killa', 'Ask Killa')}</Button>
        </div>
        <div className="about-ai-r"><Killa estado="explicando" size={250} /></div>
      </motion.div>
    </section>
  );
}
