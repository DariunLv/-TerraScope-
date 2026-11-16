import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

let promise;
// MapLibre 6 uses named ESM exports and a separate worker. Vite must bundle
// that worker explicitly so it also exists in the published application.
export function loadMapLibre() {
  if (!promise) promise = Promise.all([
    import('maplibre-gl'),
    import('maplibre-gl/dist/maplibre-gl.css'),
  ]).then(([lib]) => {
    lib.setWorkerUrl(workerUrl);
    return lib;
  }).catch(error => { promise = undefined; throw error; });
  return promise;
}
