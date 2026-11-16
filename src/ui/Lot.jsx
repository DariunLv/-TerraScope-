/* Animaciones Lottie cargadas bajo demanda (el reproductor y cada JSON se descargan solo cuando se ven). */
import { useEffect, useRef } from 'react';
const FILES = { thermo: () => import('../assets/lottie/thermo.json'), globe: () => import('../assets/lottie/globe.json'), lakes: () => import('../assets/lottie/lakes.json') };
export default function Lot({ k = 'globe', size = 160, loop = true, className = '', style, pauseOffscreen = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return; let anim, dead = false, io, view, visible = true;
    const playback = () => { if (!pauseOffscreen || !anim || dead) return; if (visible && !document.hidden) anim.play(); else anim.pause(); };
    const start = async () => {
      try {
        const [lw, d] = await Promise.all([import('lottie-web/build/player/lottie_light'), FILES[k]()]); if (dead) return;
        const lottie = lw.default || lw; anim = lottie.loadAnimation({ container: el, renderer: 'svg', loop, autoplay: !pauseOffscreen || visible && !document.hidden, animationData: JSON.parse(JSON.stringify(d.default || d)), rendererSettings: { preserveAspectRatio: 'xMidYMid meet' } }); playback();
      } catch { /* sin animación */ }
    };
    if (typeof IntersectionObserver === 'undefined') start(); else {
      if (pauseOffscreen) { visible = false; view = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; playback(); }); view.observe(el); }
      io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '200px' }); io.observe(el);
    }
    if (pauseOffscreen) document.addEventListener('visibilitychange', playback);
    return () => { dead = true; io?.disconnect(); view?.disconnect(); if (pauseOffscreen) document.removeEventListener('visibilitychange', playback); try { anim?.destroy(); } catch { /* ya destruida */ } };
  }, [k, loop, pauseOffscreen]);
  return <span ref={ref} className={'lot ' + className} aria-hidden="true" style={{ width: size, height: size, ...style }} />;
}
