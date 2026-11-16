import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { Profiler } from 'react';
import * as C from 'cesium';
import EarthView from '../shared/earth/EarthView';
import { useStore } from '../core/store';

const harness = vi.hoisted(() => ({ viewer: null, handler: null }));

// Keep real Cesium entities/math; substitute only the WebGL surface and tile transport.
vi.mock('cesium', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    buildModuleUrl: (path) => `/cesium/${path}`,
    ImageryLayer: { fromProviderAsync: vi.fn(() => ({})) },
    TileMapServiceImageryProvider: { fromUrl: vi.fn(() => Promise.resolve({})) },
    UrlTemplateImageryProvider: class { errorEvent = new actual.Event(); },
    ScreenSpaceEventHandler: class {
      actions = new Map();
      constructor() { harness.handler = this; }
      setInputAction(action, type) { this.actions.set(type, action); }
      destroy() {}
    },
    Viewer: class {
      constructor(element) {
        const canvas = document.createElement('canvas');
        element.appendChild(canvas);
        this.scene = { canvas, backgroundColor: null, globe: { ellipsoid: actual.Ellipsoid.WGS84 },
          screenSpaceCameraController: {}, fog: {}, renderError: new actual.Event(), requestRender: vi.fn(), drillPick: vi.fn(() => []) };
        this.camera = { setView: vi.fn(), flyTo: vi.fn(), cancelFlight: vi.fn(), rotate: vi.fn(),
          positionCartographic: actual.Cartographic.fromDegrees(-70, -17, 2e7) };
        this.dataSources = { add: vi.fn() };
        this.imageryLayers = { addImageryProvider: vi.fn(() => ({})), remove: vi.fn() };
        this.clock = { onTick: new actual.Event() };
        this.cesiumWidget = { screenSpaceEventHandler: { removeInputAction: vi.fn() } };
        this.entities = new actual.EntityCollection();
        this.resize = vi.fn(); this.destroy = vi.fn(); this.isDestroyed = () => false;
        harness.viewer = this;
      }
    },
  };
});

const locations = [
  { id: 'mex', label: 'Mexico City', lat: 19.43, lon: -99.13 },
  { id: 'mad', label: 'Madrid, Spain', lat: 40.42, lon: -3.7 },
  { id: 'tok', label: 'Tokyo, Japan', lat: 35.68, lon: 139.69 },
];
const view = (pick) => <MantineProvider><EarthView mode="pick" pick={pick} /></MantineProvider>;
const source = (name) => harness.viewer.dataSources.add.mock.calls.map(([data]) => data).find((data) => data.name === name);

beforeEach(() => useStore.setState({ lang: 'en', scan: null }));

describe('Cesium picker viewer', () => {
  it('keeps the homepage globe independent of background agent updates while preserving location changes', () => {
    const commit = vi.fn();
    render(<MantineProvider><Profiler id="home-globe" onRender={commit}><EarthView mode="hero" /></Profiler></MantineProvider>);
    const commits = commit.mock.calls.length, map = harness.viewer, flights = map.camera.flyTo.mock.calls.length;
    act(() => useStore.setState(s => ({ agent: { ...s.agent, pct: 80 }, killa: { estado: 'analizando', msg: '80%' } })));
    expect(commit).toHaveBeenCalledTimes(commits);
    act(() => useStore.setState({ place: { id: 'custom', lat: 40.42, lon: -3.7 } }));
    expect(commit.mock.calls.length).toBeGreaterThan(commits);
    expect(map.camera.flyTo).toHaveBeenCalledTimes(flights + 1);
    const destination = C.Cartographic.fromCartesian(map.camera.flyTo.mock.lastCall[0].destination);
    expect(C.Math.toDegrees(destination.longitude)).toBeCloseTo(-3.7);
    expect(C.Math.toDegrees(destination.latitude)).toBeCloseTo(40.42);
  });

  it('keeps camera navigation independent of parent rerenders and language updates', () => {
    const { rerender, unmount } = render(view({ places: locations, sel: 'mex', onSelect: vi.fn() }));
    const map = harness.viewer;
    expect(map.camera.flyTo).toHaveBeenCalledTimes(1);
    rerender(view({ places: [...locations], sel: 'mex', onSelect: vi.fn() }));
    act(() => useStore.setState({ lang: 'es' }));
    expect(map.camera.flyTo).toHaveBeenCalledTimes(1);
    expect(source('places').entities.values).toHaveLength(locations.length);
    rerender(view({ places: locations, sel: 'mad', onSelect: vi.fn() }));
    rerender(view({ places: locations, sel: 'tok', onSelect: vi.fn() }));
    const destination = C.Cartographic.fromCartesian(map.camera.flyTo.mock.lastCall[0].destination);
    expect(C.Math.toDegrees(destination.longitude)).toBeCloseTo(139.69);
    expect(C.Math.toDegrees(destination.latitude)).toBeCloseTo(35.68);
    expect(source('sel').entities.values).toHaveLength(1);
    fireEvent.pointerDown(map.scene.canvas);
    expect(map.camera.cancelFlight).toHaveBeenCalledTimes(4);
    unmount();
    expect(map.destroy).toHaveBeenCalledOnce();
  });

  it('uses the latest callback for clicks on map labels and offers all names inside the map', async () => {
    const user = userEvent.setup(), oldSelect = vi.fn(), select = vi.fn();
    const { rerender } = render(view({ places: locations, sel: 'mex', onSelect: oldSelect }));
    rerender(view({ places: locations, sel: 'mex', onSelect: select }));
    const marker = source('places').entities.getById('pick:mad');
    harness.viewer.scene.drillPick.mockReturnValue([{ id: marker }]);
    act(() => harness.handler.actions.get(C.ScreenSpaceEventType.LEFT_CLICK)({ position: new C.Cartesian2(100, 100) }));
    expect(select).toHaveBeenCalledWith('mad');
    expect(oldSelect).not.toHaveBeenCalled();
    await user.click(screen.getByRole('textbox', { name: 'Choose location on the map' }));
    for (const location of locations) expect(screen.getByRole('option', { name: location.label })).toBeTruthy();
    await user.click(screen.getByRole('option', { name: 'Tokyo, Japan' }));
    expect(select).toHaveBeenLastCalledWith('tok');
    await user.click(screen.getByRole('button', { name: 'View all', exact: true }));
    expect(harness.viewer.camera.flyTo.mock.lastCall[0].destination).toBeInstanceOf(C.Rectangle);
    await user.click(screen.getByRole('button', { name: 'Go to selection' }));
    expect(harness.viewer.camera.flyTo.mock.lastCall[0].destination).toBeInstanceOf(C.Cartesian3);
  });
});
