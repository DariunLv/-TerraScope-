import SplitFlapText from './react-bits/SplitFlapText';

export default function MetricFlap({ value }) {
  return <SplitFlapText className="metric-flap" text={String(value)} charset="numeric" padTo={1} loop={false} flipsPerChar={2} flipDuration={0.09} stagger={0.035} fontSize="clamp(32px, 3.4vw, 48px)" gap={3} tileRadius={7} tileColor="var(--metric-tile)" textColor="var(--ink)" depth={0.15} />;
}
