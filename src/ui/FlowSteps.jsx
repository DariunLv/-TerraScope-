import { useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { IconCheck } from '@tabler/icons-react';

export default function FlowSteps({ steps, active, onSelect, maxReached = active, disabled = false, lang = 'es' }) {
  const progress = Math.round(((active + 1) / steps.length) * 100);
  return <div className="flow-steps">
    <div className="flow-meta" aria-live="polite"><span>{lang === 'es' ? 'Tu recorrido' : 'Your journey'}</span><b>{lang === 'es' ? 'Paso' : 'Step'} {active + 1} <span>/ {steps.length}</span></b></div>
    <ol className="flow-track">
      {steps.map(([Icon, label, description], i) => <li key={label} className={i === active ? 'current' : i < active ? 'complete' : ''}>
        <button type="button" disabled={disabled || !onSelect || i > maxReached} onClick={() => onSelect?.(i)} aria-current={i === active ? 'step' : undefined}>
          <span className="flow-icon" aria-hidden="true">{i < active ? <IconCheck size={20} /> : Icon ? <Icon size={20} /> : <span>{String(i + 1).padStart(2, '0')}</span>}</span>
          <span className="flow-label"><b>{label}</b>{' '}<small>{description}</small></span>
        </button>
      </li>)}
    </ol>
    <div className="flow-progress" role="progressbar" aria-label={lang === 'es' ? 'Progreso del formulario' : 'Form progress'} aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={active + 1}><span style={{ width: `${progress}%` }} /></div>
  </div>;
}

const variants = {
  enter: ({ direction, reduced }) => ({ opacity: reduced ? 1 : 0, x: reduced ? 0 : direction * 24 }),
  center: { opacity: 1, x: 0 },
  exit: ({ direction, reduced }) => ({ opacity: reduced ? 1 : 0, x: reduced ? 0 : direction * -16 }),
};

function FlowContent({ children, label, id, moveFocus }) {
  const ref = useRef(null);
  useEffect(() => { if (moveFocus) ref.current?.focus({ preventScroll: true }); }, []);
  return <div ref={ref} id={id} tabIndex={-1} role="group" aria-label={label} className="flow-content">{children}</div>;
}

export function FlowPanel({ active, direction = 1, label, children }) {
  const reduced = useReducedMotion();
  const id = useId();
  const initial = useRef(active);
  const hasChanged = useRef(false);
  if (active !== initial.current) hasChanged.current = true;
  return <div className="flow-panel"><AnimatePresence mode="wait" initial={false} custom={{ direction, reduced }}>
    <motion.div key={active} custom={{ direction, reduced }} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: reduced ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}>
      <FlowContent id={id} label={label} moveFocus={hasChanged.current}>{children}</FlowContent>
    </motion.div>
  </AnimatePresence></div>;
}
