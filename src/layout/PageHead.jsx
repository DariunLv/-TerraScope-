/* Encabezado de cada vista: etiqueta pequeña, título grande, subtítulo y, a la derecha, acciones o cifras clave.
   Es el primer nivel de la jerarquía visual: lo más grande de la pantalla, siempre con el mismo estilo. */
import { motion } from 'framer-motion';
import { useStore } from '../core/store';
import Killa, { VIEW_POSE } from '../killa/Killa';
export default function PageHead({ icon: I, eyebrow, title, sub, children, tone = 'forest', pose }) {
  const view = useStore((s) => s.view), est = pose || VIEW_POSE[view];
  return (
    <motion.header className={`pagehead ph-${tone}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
      <div className="ph-bg"><i className="ph-orb a" /><i className="ph-orb b" /></div>
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
