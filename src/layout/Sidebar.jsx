/* Menú lateral tipo dashboard (todas las vistas menos la portada). Se puede contraer; en celular se usa la barra inferior. */
import { motion } from 'framer-motion';
import { Tooltip } from '@mantine/core';
import { IconSatellite, IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand, IconHome, IconTrafficLights, IconTimeline, IconTrendingUp, IconChecklist, IconMessageChatbot, IconCertificate, IconGauge, IconChartDots3, IconRadar2, IconArrowsLeftRight, IconRoute, IconPuzzle, IconBook2, IconTrophy } from '@tabler/icons-react';
import { useStore } from '../core/store';
import { useT } from '../core/i18n';
import { VIEWS } from './TopBar';
import Killa, { VIEW_POSE as POSE } from '../killa/Killa';

const GROUPS = [[['Investigar', 'Investigate'], ['explorar', 'lab', 'lagos']], [['Decidir', 'Decide'], ['decidir']], [['Más', 'More'], ['aprender', 'proyecto']]];
const SAY = {
  explorar: ['Gira el planeta y toca una capa: yo te cuento qué ves.', 'Spin the planet and tap a layer: I will tell you what you see.'],
  lab: ['Elige un lugar y una variable. Yo busco lo que cambió.', 'Pick a place and a variable. I will find what changed.'],
  decidir: ['Semáforo, tres futuros y yo para preguntar.', 'Traffic light, three futures and me to ask.'],
  lagos: ['39 lagos del Perú. Ordeno los que se salen de lo normal.', '39 Peruvian lakes. I sort the ones off normal.'],
  aprender: ['Aprender jugando: ¿tendencia o ruido?', 'Learn by playing: trend or noise?'],
  proyecto: ['Aquí está todo el proyecto y el equipo.', 'Here is the whole project and the team.'],
};
export default function Sidebar() {
  const { lang } = useT(), L = (a, b) => (lang === 'es' ? a : b);
  const { view, setView, collapsed, setCollapsed } = useStore(), ag = useStore((s) => s.agent), k = useStore((s) => s.killa);
  const estado = k?.estado || (ag.status === 'running' ? 'analizando' : ag.unseen > 0 ? 'alerta' : POSE[view] || 'bienvenida');
  const msg = k?.msg || (ag.status === 'running' ? L('Revisando los lagos…', 'Checking the lakes…') : ag.unseen > 0 ? L(`Tengo ${ag.unseen} aviso(s) nuevo(s) del Centinela.`, `I have ${ag.unseen} new Sentinel notice(s).`) : (SAY[view] || [])[lang === 'es' ? 0 : 1]);
  const item = (id) => { const v = VIEWS.find((x) => x[0] === id), I = v[1], on = view === id, b = (
    <button key={id} className={'sb-item' + (on ? ' on' : '')} onClick={() => setView(id)} aria-current={on ? 'page' : undefined}>
      {on && <motion.i layoutId="sb-pill" className="sb-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
      <I size={20} /><span>{lang === 'es' ? v[2] : v[3]}</span>
    </button>); return collapsed ? <Tooltip key={id} label={lang === 'es' ? v[2] : v[3]} position="right" withArrow>{b}</Tooltip> : b; };
  return (
    <aside className={'sidebar' + (collapsed ? ' min' : '')} aria-label={L('Menú principal', 'Main menu')}>
      <div className="sb-top">
        <button className="sb-brand" onClick={() => setView('inicio')} aria-label={L('Ir al inicio', 'Go to home')}><span className="sb-logo"><IconSatellite size={20} /></span>{!collapsed && <b>TerraScope</b>}</button>
        <button className="sb-toggle" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? L('Expandir menú', 'Expand menu') : L('Contraer menú', 'Collapse menu')}>{collapsed ? <IconLayoutSidebarLeftExpand size={18} /> : <IconLayoutSidebarLeftCollapse size={18} />}</button>
      </div>
      <nav className="sb-nav">
        {item_home(L, setView, collapsed)}
        {GROUPS.map(([[es, en], ids]) => <div key={es} className="sb-group">{!collapsed && <small>{lang === 'es' ? es : en}</small>}{ids.map(item)}</div>)}
      </nav>
      <div className="sb-killa">
        <Killa estado={estado} size={collapsed ? 56 : 112} />
        {!collapsed && msg && <motion.p key={msg} className="sb-say" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>{msg}</motion.p>}
      </div>
    </aside>
  );
}
function item_home(L, setView, collapsed) {
  const b = <button key="home" className="sb-item" onClick={() => setView('inicio')}><IconHome size={20} /><span>{L('Portada', 'Cover')}</span></button>;
  return collapsed ? <Tooltip key="home" label={L('Portada', 'Cover')} position="right" withArrow>{b}</Tooltip> : b;
}
