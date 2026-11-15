/* Carga diferida del planeta CesiumJS, con respaldo si el equipo no tiene WebGL */
import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useStore } from '../../core/store';
import earth from '../../assets/earth-day.jpg';
const EarthView = lazy(() => import('./EarthView'));
function hasWebGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }
class Safe extends Component { state = { bad: false }; static getDerivedStateFromError() { return { bad: true }; } componentDidCatch(e) { console.warn('Planeta 3D no disponible:', e?.message); } render() { return this.state.bad ? this.props.fallback : this.props.children; } }
const GL = typeof document !== 'undefined' && hasWebGL();
const slow = () => { try { const c = navigator.connection; return !!c && (c.saveData || /(^|-)2g$|3g/.test(c.effectiveType || '')); } catch { return false; } };
export default function Earth(props) {
  const mode = props.mode || 'hero', ref = useRef(null), [go, setGo] = useState(!slow()), [seen, setSeen] = useState(false);
  useEffect(() => { const el = ref.current; if (!el || typeof IntersectionObserver === 'undefined') { setSeen(true); return; } const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { rootMargin: '200px' }); io.observe(el); return () => io.disconnect(); }, []);
  const flat = <div className={'earthwrap earthwrap-' + mode}><div className={'earth earth-flat earth-' + mode}><div className="cssplanet"><div className="cssplanet-tex" style={{ backgroundImage: `url(${earth})` }} /></div></div></div>;
  const es = useStore.getState().lang === 'es';
  if (!GL) return <div ref={ref}>{flat}</div>;
  if (!go) return <div ref={ref} className="earthgate">{flat}<button className="cta-main earthbtn" onClick={() => setGo(true)}>{es ? 'Cargar planeta 3D (4 MB)' : 'Load 3D planet (4 MB)'}</button></div>;
  return <div ref={ref}>{seen ? <Safe fallback={flat}><Suspense fallback={flat}><EarthView {...props} /></Suspense></Safe> : flat}</div>;
}
