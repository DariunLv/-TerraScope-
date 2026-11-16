import { describe, expect, it, vi } from 'vitest';
import * as C from 'cesium';
import { PLACES } from '../lib/nasa/data';
import { drawPickArea, drawPickPlaces, focusPickPlace, pickPlaceAt, showPickPlaces } from '../shared/earth/pickScene';

const viewer = () => ({ camera: { cancelFlight: vi.fn(), flyTo: vi.fn() }, scene: { requestRender: vi.fn() } });
const points = PLACES.map((place) => ({ ...place, label: place.es }));

describe('Cesium laboratory locations', () => {
  it('creates every catalog location with the same selectable name and correct coordinates', () => {
    const source = new C.CustomDataSource('places'), now = C.JulianDate.now();
    drawPickPlaces(source, points, 'mad');
    expect(source.entities.values).toHaveLength(PLACES.length);
    for (const point of points) {
      const entity = source.entities.getById(`pick:${point.id}`);
      expect(entity.label.text.getValue(now)).toBe(point.label);
      expect(entity._td).toMatchObject({ kind: 'pick', id: point.id, name: point.label });
      const position = C.Cartographic.fromCartesian(entity.position.getValue(now));
      expect(C.Math.toDegrees(position.latitude)).toBeCloseTo(point.lat, 5);
      expect(C.Math.toDegrees(position.longitude)).toBeCloseTo(point.lon, 5);
      expect(entity.point.disableDepthTestDistance).toBeUndefined();
    }
    expect(source.entities.getById('pick:mad').point.pixelSize.getValue(now)).toBeGreaterThan(source.entities.getById('pick:lim').point.pixelSize.getValue(now));
    // Replacing an equally sized list must discard old markers, not reuse a stale collection.
    drawPickPlaces(source, points.slice(0, 3), 'moq');
    drawPickPlaces(source, points.slice(3, 6), 'art');
    expect(source.entities.values.map((entity) => entity._td.id)).toEqual(points.slice(3, 6).map((point) => point.id));
  });

  it('keeps a valid, constant reference circle through repeated selections and time changes', () => {
    const source = new C.CustomDataSource('selection'), now = C.JulianDate.now();
    for (const point of points) {
      drawPickArea(source, point, 300);
      expect(source.entities.values).toHaveLength(1);
      const entity = source.entities.values[0], ellipse = entity.ellipse;
      expect(ellipse.semiMajorAxis.isConstant).toBe(true);
      expect(ellipse.semiMinorAxis.isConstant).toBe(true);
      for (const seconds of [0, 0.001, 1, 2, 60]) {
        const time = C.JulianDate.addSeconds(now, seconds, new C.JulianDate());
        const major = ellipse.semiMajorAxis.getValue(time), minor = ellipse.semiMinorAxis.getValue(time);
        expect(major).toBe(300000);
        expect(minor).toBe(major);
        expect(() => C.EllipseGeometry.createGeometry(new C.EllipseGeometry({ center: entity.position.getValue(time), semiMajorAxis: major, semiMinorAxis: minor }))).not.toThrow();
      }
    }
    drawPickArea(source, null);
    expect(source.entities.values).toHaveLength(0);
  });

  it('cancels earlier flights and navigates to the last selection', () => {
    const map = viewer();
    for (const point of points) focusPickPlace(map, point);
    expect(map.camera.cancelFlight).toHaveBeenCalledTimes(points.length);
    const destination = C.Cartographic.fromCartesian(map.camera.flyTo.mock.lastCall[0].destination);
    expect(C.Math.toDegrees(destination.latitude)).toBeCloseTo(points.at(-1).lat);
    expect(C.Math.toDegrees(destination.longitude)).toBeCloseTo(points.at(-1).lon);
    expect(destination.height).toBeCloseTo(3.2e6);
    expect(map.scene.requestRender).toHaveBeenCalledTimes(points.length);
  });

  it('fits locations across the date line and keeps polar bounds valid', () => {
    const map = viewer(), locations = [{ lat: 87, lon: 178 }, { lat: 78, lon: -178 }];
    showPickPlaces(map, locations);
    const rectangle = map.camera.flyTo.mock.lastCall[0].destination;
    expect(C.Rectangle.computeWidth(rectangle)).toBeLessThan(C.Math.toRadians(20));
    expect(rectangle.north).toBeLessThanOrEqual(Math.PI / 2);
    locations.forEach((point) => expect(C.Rectangle.contains(rectangle, C.Cartographic.fromDegrees(point.lon, point.lat))).toBe(true));
    showPickPlaces(map, [points[0]]);
    expect(map.camera.flyTo.mock.lastCall[0].destination).toBeInstanceOf(C.Cartesian3);
  });

  it('selects a location through overlapping labels and ignores other map features', () => {
    const data = { kind: 'pick', id: 'mad' }, position = new C.Cartesian2(20, 30);
    const scene = { drillPick: vi.fn(() => [{ primitive: {} }, { id: { _td: { kind: 'country' } } }, { id: { _td: data } }]) };
    expect(pickPlaceAt(scene, position)).toBe(data);
    expect(scene.drillPick).toHaveBeenCalledWith(position, 8);
    scene.drillPick.mockReturnValue([]);
    expect(pickPlaceAt(scene, position)).toBeUndefined();
  });
});
