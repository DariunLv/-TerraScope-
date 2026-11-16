/* Encabezado de cada vista: etiqueta pequeña, título grande, subtítulo y, a la derecha, acciones o cifras clave.
   Es el primer nivel de la jerarquía visual: lo más grande de la pantalla, siempre con el mismo estilo. */
import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import useFx from '../ui/useFx';
const Galaxy = lazy(() => import('../components/reactbits/Galaxy/Galaxy'));
const GhostFibers = lazy(() => import('../components/reactbits/GhostFibers/GhostFibers'));
import { useStore } from '../core/store';
import Killa, { VIEW_POSE } from '../killa/Killa';
export default function PageHead({ icon: I, eyebrow, title, sub, children, tone = 'forest', pose }) {
  const fx = useFx(), view = useStore((s) => s.view), est = pose || VIEW_POSE[view];
  return (
    <motion.header className={`pagehead ph-${tone}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
      <div className="ph-bg"><i className="ph-orb a" /><i className="ph-orb b" />{fx && <Suspense fallback={null}><div className="ph-gl">{view === 'decidir' || view === 'lagos' ? <GhostFibers glowColor="#34d399" lineColor="#a7f3d0" secondaryColor="#7dd3fc" speed={0.4} threads={56} fiberStyle="dots" mouseInteraction={false} pulseOnClick={false} grain={0.02} dpr={1} /> : <Galaxy hueShift={150} density={0.8} glowIntensity={0.35} saturation={0.3} mouseRepulsion={false} twinkleIntensity={0.4} starSpeed={0.3} transparent dpr={1} />}</div></Suspense>}</div>
      <div className="ph-text">
        {eyebrow && <span className="ph-eyebrow">{I && <I size={16} />}{eyebrow}</span>}
        <h1 className="ph-title">{title}</h1>
        {sub && <p className="ph-sub">{sub}</p>}
      </div>
      {children && <div className="ph-side">{children}</div>}
      {est && <div className="ph-killa" aria-hidden="true"><Killa estado={est} size={176} /></div>}
    </motion.header>
  );
}
