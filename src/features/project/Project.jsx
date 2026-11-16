import { useState } from 'react';
import Ghost from '../../ui/Ghost';
import { IconTargetArrow, IconChecklist, IconDatabase, IconBulb, IconUsers, IconCloudDownload, IconFilter, IconMathFunction, IconChartHistogram, IconArrowRight, IconInfoCircle } from '@tabler/icons-react';
import PageHead from '../../layout/PageHead';
import { motion } from 'framer-motion';
import Reto from './Reto';
import Sources from './Sources';
import DataHub from './DataHub';
const Data = () => <><DataHub /><Sources /></>;
import Gaps from './Gaps';
import Team from './Team';
import { useT } from '../../core/i18n';
function Goals() {
  const { lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b);
  const sp = [L('Integrar información ambiental de fuentes satelitales y repositorios públicos, por variable, ubicación y periodo.', 'Integrate environmental information from satellite sources and public repositories, by variable, location and period.'), L('Implementar visualización geoespacial y de series de tiempo para identificar patrones, tendencias y cambios, con pruebas de significancia.', 'Implement geospatial and time-series visualization to identify patterns, trends and changes, with significance tests.'), L('Ofrecer una interfaz web interactiva y sencilla para consultar la información y apoyar decisiones.', 'Offer a simple interactive web interface to query the information and support decisions.')];
  const flow = [[IconCloudDownload, L('Fuentes', 'Sources'), 'NASA POWER · NASA GIBS · CSV (Giovanni, Data Rods, AppEEARS, CDO, KNMI) · ' + L('inventario de lagos', 'lake inventory')], [IconFilter, L('Preparación', 'Preparation'), L('Limpieza, anomalías sin ciclo estacional, medias anuales', 'Cleaning, de-seasonalized anomalies, annual means')], [IconMathFunction, L('Análisis', 'Analysis'), L('Mann-Kendall, Sen, prueba t, intervalos, FDR, bootstrap, estadística espacial', 'Mann-Kendall, Sen, t-test, intervals, FDR, bootstrap, spatial statistics')], [IconChartHistogram, L('Visualización', 'Visualization'), L('Planeta 3D, mapas, gráficos interactivos y veredicto en palabras simples', '3D planet, maps, interactive charts and a plain-words verdict')]];
  return (
    <section><div className="wrap">
      <h2>{L('Qué es este proyecto', 'What this project is')}</h2>
      <div className="card panel goal"><Ghost k="rocket" i={2} size={220} pos={0} /><span className="gtag ft">{L('Objetivo general', 'General objective')}</span>
        <p>{L('Desarrollar una plataforma web interactiva para consultar, visualizar y analizar información ambiental geoespacial del Perú y del mundo, que integra datos satelitales de la NASA y fuentes públicas para detectar tendencias, saber si son significativas y apoyar la toma de decisiones.', 'Build an interactive web platform to query, visualize and analyse geospatial environmental information for Peru and the world, integrating NASA satellite data and public sources to detect trends, tell whether they are significant and support decisions.')}</p></div>
      <div className="three">{sp.map((x, i) => <motion.div key={i} className="card panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}><Ghost k={['trend','shield','ai'][i % 3]} i={i + 1} size={130} pos={i + 2} /><span className="gtag via">{L('Objetivo específico', 'Specific objective')} {i + 1}</span><p style={{ margin: '8px 0 0' }}>{x}</p></motion.div>)}</div>
      <h3 style={{ marginTop: 26 }}>{L('Arquitectura', 'Architecture')}</h3>
      <div className="flow">{flow.map(([I, a, b], i) => <div key={a} className="flowstep"><div className="card panel"><Ghost k={['sat','globe','brain','shield'][i % 4]} i={i} size={110} pos={i} /><div className="icobox"><I size={26} /></div><b>{a}</b><span className="mini">{b}</span></div>{i < 3 && <IconArrowRight className="farrow" size={22} />}</div>)}</div>
      <p className="mini">{L('Hoy todo el procesamiento ocurre en el navegador (React), sin servidor. Siguiente etapa propuesta por el mentor: servicio con FastAPI y base PostgreSQL + PostGIS para guardar el inventario oficial de la ANA, series Sentinel-2/Landsat y datos de SENAMHI.', 'Today all processing runs in the browser (React), with no server. Next stage proposed by the mentor: a FastAPI service and a PostgreSQL + PostGIS database to store ANA’s official inventory, Sentinel-2/Landsat series and SENAMHI data.')}</p>
    </div></section>
  );
}
export default function Project() {
  const { lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b);
  const [tab, setTab] = useState('goals');
  const T = [['goals', IconTargetArrow, L('Objetivos', 'Objectives'), Goals], ['gaps', IconBulb, L('Brechas que resolvemos', 'Gaps we solve'), Gaps], ['reto', IconChecklist, L('Reto de la NASA', 'NASA challenge'), Reto], ['src', IconDatabase, L('Datos en vivo', 'Live data'), Data], ['team', IconUsers, L('Equipo', 'Team'), Team]];
  const C = T.find((x) => x[0] === tab)[3];
  return (<div className="project">
    <div className="wrap"><PageHead icon={IconInfoCircle} eyebrow="NASA Space Apps 2026" title={L('El proyecto', 'The project')} sub={L('Objetivos, brechas científicas, el reto de la NASA, las fuentes de datos en vivo y el equipo.', 'Objectives, scientific gaps, the NASA challenge, live data sources and the team.')} /></div>
    <div className="wrap"><div className="subtabs big">{T.map(([v, I, l]) => <button key={v} className={tab === v ? 'on' : ''} onClick={() => setTab(v)}><I size={16} />{l}</button>)}</div></div>
    <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}><C /></motion.div>
  </div>);
}
