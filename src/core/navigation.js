import { PLACES, KEYS } from '../lib/nasa/catalog.js';
const views = new Set(['inicio', 'explorar', 'lab', 'decidir', 'lagos', 'aprender', 'proyecto', 'killa']);
export function routeParam(key) { try { return new URL(location.href).searchParams.get(key); } catch { return null; } }
export function placeParams(place) { return { lugar: place.id, lat: place.id === 'custom' ? place.lat : null, lon: place.id === 'custom' ? place.lon : null, nombre: place.id === 'custom' ? place.name || null : null }; }
export function readNavigation() {
  const view = routeParam('vista'), sec = routeParam('sec'), known = PLACES.find((place) => place.id === routeParam('lugar'));
  const lat = routeParam('lat'), lon = routeParam('lon');
  let place;
  if (known) place = { id: known.id, lat: known.lat, lon: known.lon };
  else if (lat !== null && lon !== null && Number.isFinite(+lat) && Math.abs(+lat) <= 90 && Number.isFinite(+lon) && Math.abs(+lon) <= 180) place = { id: 'custom', lat: +lat, lon: +lon, ...(routeParam('nombre') ? { name: routeParam('nombre').slice(0, 160) } : {}) };
  return { view: views.has(view) ? view : 'inicio', sec: sec && /^[a-z]+:[\w-]+$/.test(sec) ? sec : null, place: place || { id: 'moq', lat: -17.19, lon: -70.93 }, practice: routeParam('practice') === '1' };
}
export function writeNavigation(patch, push = false) {
  try {
    const url = new URL(location.href);
    Object.entries(patch).forEach(([key, value]) => value == null || value === '' ? url.searchParams.delete(key) : url.searchParams.set(key, String(value)));
    if (url.href === location.href) return false;
    history[push ? 'pushState' : 'replaceState'](null, '', url);
    return true;
  } catch { return false; }
}
export function startNavigation(store) {
  const restore = () => {
    const route = readNavigation(), variables = (routeParam('variables') || '').split(',').filter((key) => KEYS.includes(key));
    store.setState((previous) => ({ ...route, secN: previous.secN + 1, routeRevision: previous.routeRevision + 1,
      ...(route.view === 'lab' && variables.length ? { job: { n: (previous.job?.n || 0) + 1, vars: variables } } : {}) }));
  };
  restore(); window.addEventListener('popstate', restore);
  return () => window.removeEventListener('popstate', restore);
}
