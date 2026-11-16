import { lazy, Suspense, useRef } from 'react';
import { Tabs } from '@mantine/core';
import { IconTargetArrow, IconChecklist, IconDatabase, IconBulb, IconUsers, IconInfoCircle, IconSparkles } from '@tabler/icons-react';
import { motion, useReducedMotion } from 'framer-motion';
import PageHead from '../../layout/PageHead';
import { useT } from '../../core/i18n';
import { useRouteState } from '../../core/useRouteState';
import ProjectOverview from './ProjectOverview';
import './Project.css';

const ProjectAI = lazy(() => import('./ProjectAI'));
const Gaps = lazy(() => import('./Gaps'));
const Reto = lazy(() => import('./Reto'));
const Data = lazy(() => import('./ProjectData'));
const Team = lazy(() => import('./Team'));
const TABS = [
  ['goals', IconTargetArrow, 'Visión general', 'Overview', ProjectOverview],
  ['ai', IconSparkles, 'Killa e IA', 'Killa & AI', ProjectAI],
  ['gaps', IconBulb, 'Brechas que resolvemos', 'Gaps we solve', Gaps],
  ['reto', IconChecklist, 'Reto de la NASA', 'NASA challenge', Reto],
  ['src', IconDatabase, 'Datos en vivo', 'Live data', Data],
  ['team', IconUsers, 'Equipo', 'Team', Team],
];
const validTab = value => TABS.some(([id]) => id === value);

export default function Project() {
  const { lang } = useT(), reduced = useReducedMotion();
  const L = (es, en) => lang === 'es' ? es : en;
  const [tab, setTab] = useRouteState('projectTab', 'goals', validTab);
  const navigation = useRef(null);
  const showAI = () => { setTab('ai'); navigation.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); };
  return <div className="project">
    <div className="wrap"><PageHead icon={IconInfoCircle} eyebrow="NASA Space Apps 2026" title={L('El proyecto', 'The project')} sub={L('Datos de la Tierra, evidencia y una IA que te ayuda a entender qué está cambiando y qué puedes hacer.', 'Earth data, evidence and an AI that helps you understand what is changing and what you can do.')} /></div>
    <Tabs value={tab} onChange={value => value && setTab(value)} keepMounted={false} variant="unstyled" classNames={{ list: 'project-tabs', tab: 'project-tab' }}>
      <div ref={navigation} className="wrap project-navigation"><Tabs.List aria-label={L('Secciones del proyecto', 'Project sections')}>{TABS.map(([id, I, es, en]) => <Tabs.Tab key={id} value={id} leftSection={<I size={18} aria-hidden="true" />}>{L(es, en)}</Tabs.Tab>)}</Tabs.List></div>
      {TABS.map(([id, , es, en, Content]) => <Tabs.Panel key={id} value={id}>
        {tab === id && <motion.div className="project-tab-content" initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Suspense fallback={<div className="wrap project-pending" role="status">{L('Abriendo', 'Opening')} {L(es, en)}…</div>}><Content onShowAI={showAI} /></Suspense>
        </motion.div>}
      </Tabs.Panel>)}
    </Tabs>
  </div>;
}
