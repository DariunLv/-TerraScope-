export const PAL = {
  dark: { bg: '#080d1c', card: '#121a33', ink: '#e8eefc', muted: '#8fa0c8', grid: 'rgba(143,160,200,.16)', c: ['#22d3ee', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#60a5fa'], warm: '#fb7185', cool: '#38bdf8', accent: '#22d3ee', seq: ['#0b1d3a', '#12467a', '#1b7fb0', '#22d3ee', '#a5f3fc'] },
  light: { bg: '#f4f8ff', card: '#ffffff', ink: '#14213d', muted: '#5b6b8c', grid: 'rgba(91,107,140,.18)', c: ['#0c7a5b', '#1e3a8a', '#c2410c', '#d97706', '#7c3aed', '#3b66d1'], warm: '#c2410c', cool: '#1e40af', accent: '#0c5a43', seq: ['#eff6ff', '#bfdbfe', '#60a5fa', '#2563eb', '#1e3a8a'] },
};
import { useStore } from './store';
export const usePal = () => PAL[useStore((s) => s.theme)];
export const useTheme = () => useStore((s) => s.theme);
