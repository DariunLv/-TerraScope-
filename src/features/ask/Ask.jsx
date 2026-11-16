/* Pestaña “Pregúntale a Killa”: chatbot de propósito general sobre la NASA, sus datos y este software. */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button, TextInput } from '@mantine/core';
import { IconSend, IconRobot } from '@tabler/icons-react';
import { LuSatelliteDish, LuDroplets, LuChartLine, LuBookOpen, LuRocket, LuShieldCheck } from 'react-icons/lu';
import PageHead from '../../layout/PageHead';
import Killa from '../../killa/Killa';
import Rich from '../../shared/Rich';
import Ghost from '../../ui/Ghost';
import { askLLM, getCfg } from '../decide/llm';
import { useT } from '../../core/i18n';
const KB = `APP: TerraScope / “Trend Detectives” (Detectives de Tendencias), made by team The Innovators YF (Yeferson Dariun Laura Livise, Flor Melany Yanarico Huanca, from Puno, Peru) inspired by the idea of being an Earth System Trend Detective.
WHAT IT DOES: reads NASA data for a place (a Peruvian lake or any point), detects whether climate/water variables are changing (trend vs noise), and gives a traffic light (calm / watch / alert), three possible futures (dry hazard, recent climate, wet year), a plain-language explanation, a Sentinel that watches 39 Peruvian lakes, an evidence passport (shareable verified report) and lessons.
VIEWS: Home; Explore (3D Cesium planet with NASA GIBS layers, country labels, 2D map); Lab (guided questions, case files, step-by-step wizard, advanced analytics, anomalies and future, compare); Decide (traffic light, trend, three futures, validation, assistant, passport); Lakes (inventory of 39 lakes, comparison, tools); Ask Killa (this chat); Learn (6 lessons, practice, glossary, quiz); Project.
NASA DATA SOURCES: NASA POWER (MERRA-2 and CERES: temperature, precipitation, evaporation, radiation, soil moisture, since 1981), NASA GIBS (satellite imagery tiles, Blue Marble, MODIS, VIIRS), EONET (natural events), Earthdata CMR (data search), EPIC (Earth images from DSCOVR), SMAP (soil moisture), FIRMS (fires), SWOT (surface water height and extent), OPERA (surface water products), MODIS, GPM IMERG (precipitation), Landsat and Sentinel-2 (ESA) imagery.
METHODS: Sen's slope (robust trend per decade), Mann-Kendall test (is the trend statistically significant; p<0.05 means unlikely to be chance), Pettitt change point, deseasonalised monthly anomalies, z-scores against the normal of the same month, bootstrap and Monte Carlo simulation (500 simulated years) for the probability of a dry year, backtesting of the forecast. The water balance is rainfall minus evaporation, a climate index for a ~50 km grid cell, NOT the measured lake level.
LIMITS: climate index is not the lake level; satellite water-surface measurement (SWOT) needs NASA Earthdata login and is only linked, not measured by the app; forecasts are scenarios, not predictions; always confirm with local authorities (ANA, SENAMHI).
STYLE: be accurate, friendly and concise; if you are not sure about a fact, say so; do not invent figures or URLs; for current news tell the user to check nasa.gov.`;
const FAQ = [
  [/nasa power|power/i, 'NASA POWER gives free daily and monthly climate data (temperature, rain, evaporation, soil moisture, sunshine) from satellites and models since 1981. This app uses it to compare each place with its own normal.', 'NASA POWER entrega gratis datos climáticos diarios y mensuales (temperatura, lluvia, evaporación, humedad del suelo, sol) desde 1981, a partir de satélites y modelos. La app lo usa para comparar cada lugar con su propia normalidad.'],
  [/gibs|worldview|imagery|imágenes/i, 'NASA GIBS serves satellite images (MODIS, VIIRS, Blue Marble…) as map tiles. In Explore you can switch layers on the 3D planet and compare dates.', 'NASA GIBS sirve imágenes de satélite (MODIS, VIIRS, Blue Marble…) como mapas. En Explorar puedes encender capas en el planeta 3D y comparar fechas.'],
  [/swot|surface water|nivel del lago|lake level/i, 'SWOT is a NASA/CNES satellite that measures water height and extent. This app only links to it (it needs an Earthdata login); the numbers shown here are a climate water-balance index, not the measured lake level.', 'SWOT es un satélite de la NASA/CNES que mide altura y extensión del agua. Esta app solo lo enlaza (requiere cuenta Earthdata); las cifras que ves son un índice de balance climático, no el nivel medido del lago.'],
  [/mann|kendall|p.?value|valor p|significan/i, 'The Mann-Kendall test asks whether values tend to rise or fall over time more than chance would explain. A p-value below 0.05 means the pattern is unlikely to be chance.', 'La prueba de Mann-Kendall pregunta si los valores tienden a subir o bajar en el tiempo más de lo que explicaría el azar. Un valor p menor a 0.05 indica que el patrón difícilmente es casualidad.'],
  [/sen|slope|pendiente/i, 'Sen’s slope is a robust way to measure how fast something changes per decade: it takes the median of all pair-wise slopes, so single odd years do not distort it.', 'La pendiente de Sen mide qué tan rápido cambia algo por década. Usa la mediana de todas las pendientes entre pares de años, así los años raros no la distorsionan.'],
  [/sem[aá]foro|traffic/i, 'The traffic light summarises the risk from 0 to 100: calm (green), watch (amber) or alert (red). It combines how far the last 12 months are from normal, the trend and the chance of a dry year, plus how confident the result is.', 'El semáforo resume el riesgo de 0 a 100: tranquilo (verde), vigilar (ámbar) o alerta (rojo). Combina qué tan lejos están los últimos 12 meses de lo normal, la tendencia y la probabilidad de un año seco, además de la confianza.'],
  [/team|equipo|innovators|qui[eé]n(es)? (hizo|cre)/i, 'TerraScope was built by team The Innovators YF (Yeferson Dariun Laura Livise and Flor Melany Yanarico Huanca), from Puno, Peru.', 'TerraScope fue creada por el equipo The Innovators YF (Yeferson Dariun Laura Livise y Flor Melany Yanarico Huanca), de Puno, Perú.'],
  [/what.*(app|software|this)|qu[eé] (es|hace)|how.*(use|work)|c[oó]mo (se )?(usa|funciona)/i, 'TerraScope reads NASA satellite data for a place, tells you whether its climate or water is really changing, shows a traffic light and three possible futures, and explains everything in plain words. Start in Decide, pick Lake Titicaca and press Ask the assistant.', 'TerraScope lee datos satelitales de la NASA de un lugar, te dice si su clima o agua realmente cambia, muestra un semáforo y tres futuros posibles, y lo explica en palabras simples. Empieza en Decidir, elige el Lago Titicaca y pulsa Preguntar al asistente.'],
];
const CHIPS = [
  ['What is NASA POWER?', '¿Qué es NASA POWER?'], ['What does this app do?', '¿Qué hace esta app?'], ['How do you know a trend is real?', '¿Cómo saben si una tendencia es real?'],
  ['Is this the real lake level?', '¿Es el nivel real del lago?'], ['Which NASA satellites help with water?', '¿Qué satélites de la NASA ayudan con el agua?'], ['Who made this?', '¿Quién la hizo?'],
];
export default function Ask() {
  const { lang } = useT(), L = (a, b) => (lang === 'es' ? a : b), E = (en, es) => (lang === 'es' ? es : en), [msgs, setMsgs] = useState([]), [txt, setTxt] = useState(''), [busy, setBusy] = useState(false), box = useRef(null);
  useEffect(() => { setMsgs([{ me: false, text: E('Hi! I am Killa. Ask me anything about NASA, its satellites and data, climate, or how to use this app.', '¡Hola! Soy Killa. Pregúntame lo que quieras sobre la NASA, sus satélites y datos, el clima o cómo usar esta app.') }]); }, [lang]); // eslint-disable-line
  useEffect(() => { const el = box.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); }, [msgs, busy]);
  const local = (q) => { const f = FAQ.find(([r]) => r.test(q)); return f ? E(f[1], f[2]) : E('I could not reach the online AI right now, and I do not have a stored answer for that. Try “What does this app do?” or “What is NASA POWER?”, or ask again in a moment.', 'No pude conectar con la IA en línea y no tengo una respuesta guardada para eso. Prueba “¿Qué hace esta app?” o “¿Qué es NASA POWER?”, o vuelve a preguntar en un momento.'); };
  const send = async (q) => {
    q = (q ?? txt).trim(); if (!q || busy) return; setTxt(''); const hist = msgs; setMsgs((m) => [...m, { me: true, text: q }]); setBusy(true);
    const cfg = getCfg();
    try {
      if (cfg.mode === 'rules') throw new Error('rules');
      const sys = `You are Killa, the friendly satellite mascot and AI guide of the TerraScope app. Answer in the same language as the user (default English). Use short paragraphs, plain words, no markdown symbols like ** or #. Use ONLY the knowledge base below for facts about the app; for general NASA/climate knowledge answer carefully and say when unsure.\n\nKNOWLEDGE BASE:\n${KB}`;
      const text = await askLLM(cfg, { question: q, history: hist, ctx: null, calc: null, lang, sys, raw: true, noVerify: true });
      setMsgs((m) => [...m, { me: false, text, ai: true }]);
    } catch { setMsgs((m) => [...m, { me: false, text: local(q) }]); }
    setBusy(false);
  };
  return (
    <div className="ask">
      <PageHead icon={IconRobot} tone="navy" eyebrow={L('Inteligencia artificial', 'Artificial intelligence')} title={L('Pregúntale a Killa lo que quieras', 'Ask Killa anything')} sub={L('Sobre la NASA, sus satélites y datos, el clima, el agua o cómo funciona esta app. Responde en tu idioma y en palabras simples.', 'About NASA, its satellites and data, climate, water or how this app works. It answers in your language, in plain words.')} pose="explicando" />
      <div className="ask-grid">
        <motion.div className="ask-chat" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <div className="chat-log" ref={box}>
            {msgs.map((m, i) => <motion.div key={i} className={'msg' + (m.me ? ' me' : '')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{!m.me && <span className="msg-av"><Killa estado={m.ai ? 'idea' : 'bienvenida'} size={38} live={false} shadow={false} tap={false} /></span>}<div className="msg-b"><Rich text={m.text} /></div></motion.div>)}
            {busy && <div className="msg typing"><span className="msg-av"><Killa estado="pensando" size={38} shadow={false} tap={false} /></span><i /><i /><i /></div>}
          </div>
          <div className="chat-chips">{CHIPS.map((c) => <button key={c[0]} onClick={() => send(E(c[0], c[1]))}>{E(c[0], c[1])}</button>)}</div>
          <form className="chat-in" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <TextInput value={txt} onChange={(e) => setTxt(e.currentTarget.value)} placeholder={E('Type your question…', 'Escribe tu pregunta…')} size="md" aria-label="Question" style={{ flex: 1 }} />
            <Button type="submit" color="forest" size="md" aria-label="Send"><IconSend size={18} /></Button>
          </form>
        </motion.div>
        <div className="ask-side">
          {[[LuSatelliteDish, L('Satélites y datos', 'Satellites and data'), L('POWER, GIBS, SMAP, SWOT, GPM, Landsat…', 'POWER, GIBS, SMAP, SWOT, GPM, Landsat…'), 'sat'], [LuDroplets, L('Agua y clima', 'Water and climate'), L('Lagos, sequías, lluvia, balance hídrico', 'Lakes, droughts, rain, water balance'), 'water'], [LuChartLine, L('Estadística simple', 'Simple statistics'), L('Tendencias, valor p, pendiente de Sen', 'Trends, p-value, Sen slope'), 'trend'], [LuShieldCheck, L('Esta app', 'This app'), L('Semáforo, futuros, pasaporte, Centinela', 'Traffic light, futures, passport, Sentinel'), 'shield'], [LuRocket, L('El proyecto', 'The project'), L('Objetivos y cómo lo resolvemos', 'Goals and how we solve them'), 'rocket'], [LuBookOpen, L('Aprender', 'Learning'), L('Pídele que te explique como a un niño', 'Ask it to explain like you are ten'), 'book']].map(([I, a, b, g], i) => (
            <motion.div key={a} className="ask-topic" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.07 }} whileHover={{ y: -3 }}>
              <Ghost k={g} i={i + 1} size={96} pos={i} /><span className="about-ico sm"><I size={20} /></span><div><b>{a}</b><span>{b}</span></div>
            </motion.div>))}
        </div>
      </div>
    </div>
  );
}
