import Tour from './layout/Tour';
import Killa from './killa/Killa';
import { Component, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader } from '@mantine/core';
import Background from './layout/Background';
import Nav, { TabBar } from './layout/TopBar';
import Sidebar from './layout/Sidebar';
import TopStrip from './layout/TopStrip';
import Hero from './features/home/Hero';
import MapModal from './layout/MapModal';
import ClickSpark from './ui/ClickSpark';
import { useEffect } from 'react';
import { useStore } from './core/store';
import { startAgent, runCycle } from './features/decide/agent';
import { useT } from './core/i18n';
const WorldMap = lazy(() => import('./features/explore/WorldMap'));
const Lab = lazy(() => import('./features/lab/Lab'));
const Lakes = lazy(() => import('./features/lakes/Lakes'));
const Decide = lazy(() => import('./features/decide/Decide'));
const Game = lazy(() => import('./features/learn/Game'));
const Project = lazy(() => import('./features/project/Project'));
/* Si una sección falla, el resto de la app sigue funcionando */
class Guard extends Component {
  state = { bad: false, err: '' };
  static getDerivedStateFromError(e) { return { bad: true, err: String(e?.message || e).slice(0, 300) }; }
  componentDidCatch(e) {
    console.error(e);
    /* Un módulo que no cargó (despliegue nuevo o caché de Vite desactualizada): se recarga una sola vez */
    if (/dynamically imported|importing a module|chunk|Loading CSS/i.test(String(e?.message || e)) && !sessionStorage.getItem('ts_reload')) { try { sessionStorage.setItem('ts_reload', '1'); } catch { /* sin espacio */ } location.reload(); }
  }
  render() {
    if (!this.state.bad) return this.props.children;
    return (<div className="wrap" style={{ padding: '80px 20px', textAlign: 'center' }}><Killa estado="reintentar" size={150} style={{ margin: '0 auto' }} /><h3>{this.props.msg}</h3>
      <p className="mini" style={{ maxWidth: 560, margin: '6px auto' }}>{this.state.err}</p>
      <button className="textlink" style={{ margin: '0 auto' }} onClick={() => { try { sessionStorage.removeItem('ts_reload'); } catch { /* */ } this.setState({ bad: false, err: '' }); }}>{this.props.retry}</button>
      <button className="textlink" style={{ margin: '8px auto 0' }} onClick={() => location.reload()}>{this.props.reload}</button></div>);
  }
}
const V = { inicio: Hero, explorar: WorldMap, lab: Lab, decidir: Decide, lagos: Lakes, aprender: Game, proyecto: Project };
export default function App() {
  useEffect(() => { startAgent(); const t = setTimeout(() => { try { sessionStorage.removeItem('ts_reload'); } catch { /* */ } }, 10000); const h = () => { if (!sessionStorage.getItem('ts_reload')) { try { sessionStorage.setItem('ts_reload', '1'); } catch { /* */ } location.reload(); } }; window.addEventListener('vite:preloadError', h); return () => { clearTimeout(t); window.removeEventListener('vite:preloadError', h); }; }, []);
  const practice = useStore((s) => s.practice), lakesL = useStore((s) => s.lakes);
  useEffect(() => { const t = setTimeout(() => { if (useStore.getState().agent.last) runCycle(); }, 800); return () => clearTimeout(t); }, [practice, lakesL]);
  const { t, lang } = useT(); const view = useStore((s) => s.view), collapsed = useStore((s) => s.collapsed); const C = V[view] || Hero, home = view === 'inicio';
  return (
    <ClickSpark sparkColor="#0c5a43" sparkSize={12} sparkRadius={22} sparkCount={9}>
      <Background />
      {home ? <Nav /> : null}
      <div className={home ? '' : 'shell' + (collapsed ? ' min' : '')}>
        {!home && <Sidebar />}
        <div className="shell-main">
          {!home && <TopStrip />}
          <main>
            <AnimatePresence mode="wait">
              <motion.div key={view} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <Guard key={view} msg={lang === 'es' ? 'Algo falló en esta sección.' : 'Something failed in this section.'} retry={lang === 'es' ? 'Volver a intentar' : 'Try again'} reload={lang === 'es' ? 'Recargar la página' : 'Reload the page'}><Suspense fallback={<div className="loadk"><Killa estado="esperando" size={120} /><Loader color="forest" size="sm" type="dots" /></div>}><C /></Suspense></Guard>
              </motion.div>
            </AnimatePresence>
          </main>
          <footer><div className="fkilla"><Killa estado="bienvenida" size={84} /></div><p>{t.footer}</p><p>{t.team}</p></footer>
        </div>
      </div>
      <TabBar />
      <MapModal />
      <Tour />
    </ClickSpark>
  );
}
