import { useEffect, useState } from 'react';
/* Efectos pesados (WebGL, cursor) solo en pantallas con mouse, sin 'reducir movimiento' y con ancho de escritorio. */
export default function useFx() {
  const q = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [on, set] = useState(q);
  useEffect(() => { const m = window.matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)'); const f = () => set(q()); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
  return on;
}
