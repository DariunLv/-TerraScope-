import { create } from 'zustand';
import { LAKES, SAMPLE_POINTS } from '../features/lakes/lakesData';
import { placeParams, readNavigation, writeNavigation } from './navigation';
const initialRoute = readNavigation();
export const useStore = create((set) => ({
  theme: 'light',
  lang: 'en',
  setLang: (lang) => set({ lang }),
  view: initialRoute.view,
  routeRevision: 0,
  setRouteParams: (params) => { if (writeNavigation(params)) set((state) => ({ routeRevision: state.routeRevision + 1 })); },
  sec: null, secN: 0,
  goSec: (view, sec) => { writeNavigation({ vista: view, sec: view + ':' + sec }, true); set((s) => ({ view, sec: view + ':' + sec, secN: s.secN + 1, routeRevision: s.routeRevision + 1 })); },
  setSec: (sec) => { writeNavigation({ sec }); set({ sec }); },
  setView: (view) => { writeNavigation({ vista: view, sec: null }, true); set((state) => ({ view, sec: null, routeRevision: state.routeRevision + 1 })); try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch { window.scrollTo(0, 0); } },
  practice: initialRoute.practice ?? false,
  setPractice: (practice) => { writeNavigation({ practice: practice ? '1' : '0' }); set({ practice, scan: null }); },
  place: initialRoute.place || { id: 'moq', lat: -17.19, lon: -70.93 },
  setPlace: (place) => { writeNavigation(placeParams(place)); set({ place }); },
  mapOpen: false,
  setMapOpen: (mapOpen) => set({ mapOpen }),
  scan: null,
  setScan: (scan) => set({ scan }),
  lakes: LAKES, // inventario activo (se puede reemplazar por un CSV oficial)
  lakesSrc: '',
  setLakes: (lakes, lakesSrc = '') => set((s) => ({ lakes, lakesSrc, lake: lakes.some((l) => l.id === s.lake) ? s.lake : lakes[0]?.id })),
  lake: 'titicaca',
  setLake: (lake) => set({ lake }),
  monitoringPoints: SAMPLE_POINTS,
  monitoringSource: '',
  setMonitoringPoints: (monitoringPoints, monitoringSource = '') => set({ monitoringPoints, monitoringSource }),
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
  openCase: (c, place) => { writeNavigation({ vista: 'lab', sec: null, variables: c.vars.join(','), ...placeParams(place) }, true); set((s) => ({ place, view: 'lab', routeRevision: s.routeRevision + 1, job: { n: (s.job?.n || 0) + 1, vars: c.vars } })); window.scrollTo(0, 0); },
}));
export const placeLabel = (p, PLACES, lang) => p.name || PLACES.find((x) => x.id === p.id)?.[lang] || `${p.lat}°, ${p.lon}°`;
