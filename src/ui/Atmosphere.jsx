import { Component, lazy, Suspense, useRef } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

const Galaxy = lazy(() => import('./react-bits/Galaxy'));
const GhostFibers = lazy(() => import('./react-bits/GhostFibers'));
const Particles = lazy(() => import('./react-bits/Particles'));

// Decorative effects never block navigation or the data when WebGL is unavailable.
class EffectGuard extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function Atmosphere({ variant = 'fibers', light = false, className = '' }) {
  const ref = useRef(null);
  const visible = useInView(ref, { margin: '80px' });
  const reduced = useReducedMotion();
  return <div ref={ref} className={`atmosphere atmosphere-${variant} ${className}`} aria-hidden="true">
    {visible && !reduced && <EffectGuard><Suspense fallback={null}>
      {variant === 'galaxy' ? <Galaxy density={0.7} layers={2} speed={0.25} starSpeed={0.16} rotationSpeed={0.025} dpr={1} glowIntensity={0.18} twinkleIntensity={0.12} mouseInteraction={false} clickWarp={false} lightMode={light} starColors={light ? ['#167d66', '#426b9a'] : ['#a5e9d6', '#afcaff', '#ffffff']} />
        : variant === 'particles' ? <Particles particleCount={55} particleColors={light ? ['#177b63', '#345b8c'] : ['#c1f8e4', '#b8d7ff']} speed={0.035} particleBaseSize={65} pixelRatio={1} glow={0.15} opacity={0.6} moveParticlesOnHover={false} clickBurst={false} lightMode={light} />
          : <GhostFibers glowColor="#54c5a3" secondaryColor="#6f9be9" lineColor="#8acbb5" layers={2} threads={28} density={0.65} speed={0.18} rollSpeed={0.035} dpr={1} glow={0.3} brightness={0.8} grain={0} particles={0.12} mouseInteraction={false} pulseOnClick={false} lightMode={light} />}
    </Suspense></EffectGuard>}
  </div>;
}
