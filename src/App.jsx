import { lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader } from '@mantine/core';
import Background from './components/Background';
import Nav from './components/Nav';
import Hero from './components/Hero';
import MapModal from './components/MapModal';
import ClickSpark from './rb/ClickSpark';
import { useStore } from './store';
import { useT } from './i18n';
const WorldMap = lazy(() => import('./components/WorldMap'));
const Lab = lazy(() => import('./components/Lab'));
const Lakes = lazy(() => import('./components/Lakes'));
const Game = lazy(() => import('./components/Game'));
const Project = lazy(() => import('./components/Project'));
const V = { inicio: Hero, explorar: WorldMap, lab: Lab, lagos: Lakes, aprender: Game, proyecto: Project };
export default function App() {
  const { t } = useT(); const view = useStore((s) => s.view); const C = V[view] || Hero;
  return (
    <ClickSpark sparkColor="#0c5a43" sparkSize={12} sparkRadius={22} sparkCount={9}>
      <Background />
      <Nav />
      <main>
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <Suspense fallback={<div style={{ padding: 120, textAlign: 'center' }}><Loader color="forest" /></div>}><C /></Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      <MapModal />
      <footer><p>{t.footer}</p><p>{t.team}</p></footer>
    </ClickSpark>
  );
}
