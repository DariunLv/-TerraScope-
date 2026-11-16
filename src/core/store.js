import { create } from 'zustand';
import { LAKES } from '../features/lakes/lakesData';
export const useStore = create((set) => ({
  theme: 'light',
  lang: 'en',
  setLang: (lang) => set({ lang }),
  view: 'inicio',
  sec: null, secN: 0,
  goSec: (view, sec) => { set((s) => ({ view, sec: view + ':' + sec, secN: s.secN + 1 })); },
  setSec: (sec) => set({ sec }),
  want3d: null, anInit: null,
  open3D: (kind) => { set({ view: 'lab', want3d: { kind, n: Date.now() }, anInit: kind === 'surface' ? 'seas' : null }); try { window.scrollTo(0, 0); } catch { /* sin scroll */ } },
  setView: (view) => { set({ view }); try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch { window.scrollTo(0, 0); } },
  practice: false, // true = usar siempre datos de práctica (sin internet)
  setPractice: (practice) => set({ practice }),
  place: { id: 'moq', lat: -17.19, lon: -70.93 },
  setPlace: (place) => set({ place }),
  mapOpen: false,
  setMapOpen: (mapOpen) => set({ mapOpen }),
  scan: null,
  setScan: (scan) => set({ scan }),
  lakes: LAKES, // inventario activo (se puede reemplazar por un CSV oficial)
  lakesSrc: '',
  setLakes: (lakes, lakesSrc = '') => set((s) => ({ lakes, lakesSrc, lake: lakes.some((l) => l.id === s.lake) ? s.lake : lakes[0]?.id })),
  lake: 'titicaca',
  setLake: (lake) => set({ lake }),
  agent: { status: 'idle', step: null, pct: 0, rows: null, space: null, needs: [], log: [], last: null, unseen: 0, auto: true, src: null, ledger: { pending: 0, hits: 0, total: 0 } },
  setAgentAuto: (auto) => set((s) => ({ agent: { ...s.agent, auto } })),
  clearUnseen: () => set((s) => ({ agent: { ...s.agent, unseen: 0 } })),
  collapsed: (() => { try { return localStorage.getItem('ts_side') === '1'; } catch { return false; } })(),
  setCollapsed: (collapsed) => { try { localStorage.setItem('ts_side', collapsed ? '1' : '0'); } catch { /* sin espacio */ } set({ collapsed }); },
  killa: null, // { estado, msg } reacción puntual de Killa
  sayKilla: (estado, msg, ms = 4500) => { set({ killa: { estado, msg, t: Date.now() } }); setTimeout(() => set((s) => (s.killa && Date.now() - s.killa.t >= ms - 50 ? { killa: null } : s)), ms); },
  tour: null,
  setTour: (tour) => set({ tour }),
  openTour: () => set({ tour: 0 }),
  job: null, // { n, vars }
  openCase: (c, place) => { set((s) => ({ place, view: 'lab', job: { n: (s.job?.n || 0) + 1, vars: c.vars } })); window.scrollTo(0, 0); },
}));
export const placeLabel = (p, PLACES, lang) => p.name || PLACES.find((x) => x.id === p.id)?.[lang] || `${p.lat}°, ${p.lon}°`;
