import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import FlatMap from '../features/explore/FlatMap';
import { useStore } from '../core/store';

const harness = vi.hoisted(() => ({ maps: [], markers: [] }));
// MapLibre 6 exposes named exports. Keep that contract while substituting the
// GPU surface; the loader test also checks the real installed library.
vi.mock('maplibre-gl', () => ({
  setWorkerUrl: vi.fn(),
  Map: class {
    constructor(options) {
      this.options = options; this.handlers = {}; this.onceHandlers = {}; this.controls = [];
      this.sources = Object.fromEntries(Object.keys(options.style.sources).map(id => [id, { setData: vi.fn() }]));
      this.canvas = document.createElement('canvas'); options.container.appendChild(this.canvas);
      this.setLayoutProperty = vi.fn(); this.setFeatureState = vi.fn(); this.flyTo = vi.fn(); this.easeTo = vi.fn(); this.resize = vi.fn();
      this.queryRenderedFeatures = vi.fn(() => []); this.remove = vi.fn(() => this.canvas.remove());
      harness.maps.push(this);
    }
    on(name, layer, callback) { this.handlers[callback ? name + ':' + layer : name] = callback || layer; }
    once(name, callback) { this.onceHandlers[name] = callback; }
    addControl(control) { this.controls.push(control); }
    getCanvas() { return this.canvas; }
    getSource(id) { return this.sources[id]; }
  },
  Marker: class {
    constructor(options) { this.options = options; this.setLngLat = vi.fn(() => this); harness.markers.push(this); }
    addTo() { return this; }
  },
  Popup: class { setLngLat() { return this; } setHTML() { return this; } addTo() { return this; } remove() {} },
  NavigationControl: class {}, ScaleControl: class {},
}));

const place = { id: 'moq', lat: -17.19, lon: -70.93 };
const dots = [{ ...place, name: 'Moquegua' }, { id: 'mex', name: 'Mexico City', lat: 19.43, lon: -99.13 }];
const view = (props = {}) => <MantineProvider theme={{ colors: { navy: Array(10).fill('#1e3a8a') } }}><FlatMap place={place} dots={dots} setPlace={vi.fn()} k="T2M" vlabel="Temperature" {...props} /></MantineProvider>;
const initialized = async () => { await waitFor(() => expect(harness.maps).toHaveLength(1)); const map = harness.maps[0]; expect(map.onceHandlers['style.load']).toBeTypeOf('function'); return map; };
beforeEach(() => { harness.maps.length = 0; harness.markers.length = 0; useStore.setState({ lang: 'en' }); });

describe('restored flat map', () => {
  it('preserves all layers and destinations, including layer changes made before the style is ready', async () => {
    const user = userEvent.setup(); render(view()); const map = await initialized();
    expect(map.options).toMatchObject({ center: [-70.93, -17.19], zoom: 2.4, renderWorldCopies: true });
    expect(map.options.style.sources.land.data.features.length).toBeGreaterThan(100);
    for (const id of ['bm', 'tc', 'nl', 'lst', 'gpm']) expect(map.options.style.sources[id].type).toBe('raster');
    await user.click(screen.getByRole('radio', { name: 'True color' }));
    expect(map.setLayoutProperty).not.toHaveBeenCalled();
    act(() => map.onceHandlers['style.load']());
    expect(map.setLayoutProperty).toHaveBeenCalledWith('tc', 'visibility', 'visible');
    expect(map.setLayoutProperty).toHaveBeenCalledWith('bm', 'visibility', 'none');
    expect(map.sources.pts.setData.mock.lastCall[0].features).toHaveLength(2);
    for (const name of ['Titicaca', 'Amazon', 'Himalaya', 'Sahara', 'Great Barrier Reef', 'Alps', 'Aral Sea', 'Greenland']) expect(screen.getByRole('button', { name, exact: true })).toBeTruthy();
    expect(screen.queryByText('Could not load the map. Try the 3D planet.')).toBeNull();
  });

  it('keeps navigation, tilt and north controls interactive', async () => {
    const user = userEvent.setup(); render(view()); const map = await initialized();
    act(() => map.onceHandlers['style.load']());
    await user.click(screen.getByRole('button', { name: '3D tilt' }));
    expect(map.easeTo).toHaveBeenLastCalledWith({ pitch: 58, bearing: -18, duration: 900 });
    await user.click(screen.getByRole('button', { name: 'Himalaya', exact: true }));
    expect(map.flyTo).toHaveBeenLastCalledWith(expect.objectContaining({ center: [86, 28], zoom: 5.2, pitch: 55 }));
    await user.click(screen.getByRole('button', { name: 'North' }));
    expect(map.easeTo).toHaveBeenLastCalledWith({ pitch: 0, bearing: 0, duration: 600 });
    await user.click(screen.getByRole('button', { name: 'Titicaca', exact: true }));
    expect(map.flyTo).toHaveBeenLastCalledWith(expect.objectContaining({ center: [-69.35, -15.85], pitch: 0 }));
    expect(map.controls).toHaveLength(2);
  });

  it('keeps the current selection, callbacks and scan data without recreating the viewer', async () => {
    const oldSelect = vi.fn(), select = vi.fn(); const { rerender, unmount } = render(view({ setPlace: oldSelect }));
    const map = await initialized(); act(() => map.onceHandlers['style.load']());
    const result = { list: [{ ...dots[1], perDec: 0.3, fdr: true }] };
    rerender(view({ setPlace: select, dots: result.list, res: result, place: { id: 'mex', lat: 19.43, lon: -99.13 } }));
    expect(harness.maps).toHaveLength(1);
    expect(harness.markers[0].setLngLat).toHaveBeenLastCalledWith([-99.13, 19.43]);
    expect(map.sources.pts.setData.mock.lastCall[0].features[0].properties).toMatchObject({ id: 'mex', c: '#f97316', fdr: true, o: 0.95 });
    map.queryRenderedFeatures.mockReturnValue([{ properties: { id: 'mex' } }]);
    act(() => map.handlers.click({ point: {}, lngLat: { lat: 19.43, lng: -99.13 } }));
    expect(select).toHaveBeenLastCalledWith({ id: 'mex', lat: 19.43, lon: -99.13 }); expect(oldSelect).not.toHaveBeenCalled();
    map.queryRenderedFeatures.mockReturnValue([]);
    act(() => map.handlers.click({ point: {}, lngLat: { lat: -12.345, lng: 190 } }));
    expect(select).toHaveBeenLastCalledWith({ id: 'custom', lat: -12.35, lon: -170 });
    expect(map.flyTo).not.toHaveBeenCalled();
    unmount(); expect(map.remove).toHaveBeenCalledOnce();
  });
});
