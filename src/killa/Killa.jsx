/* Killa, la mascota de TerraScope. Con vida: flota, respira, mira al puntero, reacciona al toque y cambia de pose con un fundido.
   estado: una de las 36 poses (ver POSES). live=false la deja quieta (por ejemplo en listas). */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';

export const POSES = ['bienvenida', 'explorando', 'analizando', 'esperando', 'hallazgo', 'alerta', 'celebrando', 'reintentar', 'explicando', 'duda', 'sorpresa', 'pensando', 'idea', 'orgullosa', 'avergonzada', 'riendo', 'triste', 'decidida', 'lupa', 'globo', 'ubicacion', 'titicaca', 'comparando', 'tormenta', 'radar', 'grafico', 'bitacora', 'ensenando', 'siguiente', 'pista', 'confirmado', 'sin-conexion', 'reloj', 'sin-datos', 'evidencia', 'descarga'];
/* Poses con gesto serio, triste o molesto: se sustituyen por una expresión amable */
const FRIENDLY = { analizando: 'lupa', esperando: 'reloj', reintentar: 'duda', decidida: 'siguiente', alerta: 'sorpresa', triste: 'duda', tormenta: 'sorpresa', 'sin-conexion': 'duda', 'sin-datos': 'pista', avergonzada: 'riendo', titicaca: 'ubicacion' };
const src = (e0) => { const e = FRIENDLY[e0] || e0; return `${import.meta.env.BASE_URL}killa/killa-${POSES.includes(e) ? e : 'bienvenida'}.webp`; };
const _old = (e) => `${import.meta.env.BASE_URL}killa/killa-${POSES.includes(e) ? e : 'bienvenida'}.webp`;
export const VIEW_POSE = { explorar: 'globo', lab: 'lupa', decidir: 'decidida', lagos: 'titicaca', aprender: 'ensenando', proyecto: 'bitacora' };
const HAPPY = ['riendo', 'celebrando', 'sorpresa', 'idea', 'orgullosa', 'bienvenida'];

export default function Killa({ estado = 'bienvenida', size = 144, alt = '', className = '', live = true, look = true, tap = true, shadow = true, flip = false, style }) {
  const calm = useReducedMotion(), [pose, setPose] = useState(null), box = useRef(null), t = useRef(null);
  const mx = useMotionValue(0), my = useMotionValue(0), sx = useSpring(mx, { stiffness: 120, damping: 14 }), sy = useSpring(my, { stiffness: 120, damping: 14 });
  const rx = useTransform(sy, [-1, 1], [4, -4]), ry = useTransform(sx, [-1, 1], [-6, 6]), px = useTransform(sx, [-1, 1], [-4, 4]);
  const cur = pose || estado;
  useEffect(() => () => clearTimeout(t.current), []);
  useEffect(() => {
    if (!live || !look || calm) return;
    const mv = (e) => { const r = box.current?.getBoundingClientRect(); if (!r) return; const dx = (e.clientX - (r.left + r.width / 2)) / 420, dy = (e.clientY - (r.top + r.height / 2)) / 420; mx.set(Math.max(-1, Math.min(1, dx))); my.set(Math.max(-1, Math.min(1, dy))); };
    window.addEventListener('pointermove', mv, { passive: true }); return () => window.removeEventListener('pointermove', mv);
  }, [live, look, calm]);
  const poke = () => { if (!tap) return; setPose(HAPPY[Math.floor(Math.random() * HAPPY.length)]); clearTimeout(t.current); t.current = setTimeout(() => setPose(null), 1700); };
  const float = live && !calm;
  return (
    <motion.div ref={box} className={'killa ' + className} style={{ width: size, height: size, ...style }} initial={{ opacity: 0, scale: 0.6, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 15 }}
      onClick={poke} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>
      {shadow && live && <motion.i className="killa-shadow" animate={float ? { scaleX: [1, 0.82, 1], opacity: [0.28, 0.16, 0.28] } : undefined} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }} />}
      <motion.div className="killa-float" animate={float ? { y: [0, -size * 0.045, 0], rotate: [-1.2, 1.2, -1.2] } : undefined} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        whileHover={tap && !calm ? { scale: 1.07, rotate: [0, -5, 5, -3, 0], transition: { duration: 0.6 } } : undefined} whileTap={tap ? { scale: 0.92, y: 6 } : undefined}>
        <motion.div className="killa-tilt" style={float && look ? { rotateX: rx, rotateY: ry, x: px } : undefined}>
          <motion.div animate={float ? { scaleY: [1, 1.025, 1], scaleX: [1, 0.99, 1] } : undefined} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }} style={{ transformOrigin: '50% 100%' }}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.img key={cur} src={src(cur)} alt="" width={size} height={size} draggable={false} decoding="async" initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.06 }} transition={{ duration: 0.28 }} style={{ display: 'block', width: size, height: size, transform: flip ? 'scaleX(-1)' : undefined }} />
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* Killa con globo de diálogo que escribe el texto letra a letra */
export function KillaSay({ estado, text, size = 110, side = 'right', className = '', tone = 'light' }) {
  const [n, setN] = useState(0);
  useEffect(() => { setN(0); if (!text) return; const id = setInterval(() => setN((v) => (v >= text.length ? (clearInterval(id), v) : v + 1)), 18); return () => clearInterval(id); }, [text]);
  return (
    <div className={`killasay ${side} ${tone} ${className}`}>
      <Killa estado={estado} size={size} />
      {text && <motion.div className="killa-bubble" key={text} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}><span>{text.slice(0, n)}<i className="caret" /></span></motion.div>}
    </div>
  );
}

/* Tarjeta de estado con Killa: vacío, sin conexión, error, cargando */
export function KillaNote({ estado = 'sin-datos', title, children, size = 120, tone = 'blue' }) {
  return (
    <motion.div className={'killanote kn-' + tone} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Killa estado={estado} size={size} />
      <div>{title && <b>{title}</b>}<p>{children}</p></div>
    </motion.div>
  );
}
