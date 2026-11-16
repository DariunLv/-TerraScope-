import { expect, it } from 'vitest';
import * as maplibre from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { loadMapLibre } from '../shared/maps/loadMapLibre';

it('loads the installed MapLibre ESM API and configures its bundled worker once', async () => {
  const first = loadMapLibre(), second = loadMapLibre();
  expect(first).toBe(second);
  const lib = await first;
  expect(lib.Map).toBe(maplibre.Map);
  expect(typeof lib.Marker).toBe('function');
  expect(typeof lib.Popup).toBe('function');
  expect(lib.getWorkerUrl()).toBe(workerUrl);
  expect(workerUrl).toContain('maplibre-gl-worker');
});
