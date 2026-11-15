import { create } from 'zustand';
export const useStore = create((set) => ({
  theme: 'light',
  lang: 'es',
  setLang: (lang) => set({ lang }),
  view: 'inicio',
  setView: (view) => { set({ view }); try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch { window.scrollTo(0, 0); } },
  practice: false, // true = usar siempre datos de práctica (sin internet)
  setPractice: (practice) => set({ practice }),
  place: { id: 'moq', lat: -17.19, lon: -70.93 },
  setPlace: (place) => set({ place }),
  mapOpen: false,
  setMapOpen: (mapOpen) => set({ mapOpen }),
  scan: null,
  setScan: (scan) => set({ scan }),
  lake: 'titicaca',
  setLake: (lake) => set({ lake }),
  job: null, // { n, vars }
  openCase: (c, place) => { set((s) => ({ place, view: 'lab', job: { n: (s.job?.n || 0) + 1, vars: c.vars } })); window.scrollTo(0, 0); },
}));
export const placeLabel = (p, PLACES, lang) => p.name || PLACES.find((x) => x.id === p.id)?.[lang] || `${p.lat}°, ${p.lon}°`;
