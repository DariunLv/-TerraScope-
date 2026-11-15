import Aurora from '../rb/Aurora';
import { useTheme } from '../palette';
export default function Background() {
  const theme = useTheme(); const d = theme === 'dark';
  return (
    <div className="bg" aria-hidden>
      <Aurora key={theme} colorStops={d ? ['#0e7490', '#6d28d9', '#be185d'] : ['#bfe6d6', '#cfe0fb', '#d9f2e6']} amplitude={1.1} blend={0.6} speed={0.6} height={0.7} glow={d ? 0.8 : 0.5} lightMode={!d} opacity={d ? 0.85 : 0.55} />
      <div className="vignette" />
    </div>
  );
}
