import * as C from 'cesium';

const color = (hex, alpha = 1) => C.Color.fromCssColorString(hex).withAlpha(alpha);
const orientation = { heading: 0, pitch: -Math.PI / 2, roll: 0 };

// Static geometry avoids rebuilding an ellipse every frame and lets explicit rendering rest.
export function drawPickPlaces(source, places, selectedId) {
  source.entities.suspendEvents();
  try {
    source.entities.removeAll();
    places.forEach((place) => {
      const selected = place.id === selectedId;
      const entity = source.entities.add({
        id: `pick:${place.id}`,
        position: C.Cartesian3.fromDegrees(place.lon, place.lat, 500),
        point: {
          pixelSize: selected ? 17 : 12,
          color: color(selected ? '#f59e0b' : '#5eead4'),
          outlineColor: color('#06243f'), outlineWidth: 3,
        },
        label: {
          text: place.label, font: `${selected ? 700 : 600} 14px Inter, sans-serif`,
          fillColor: C.Color.WHITE, showBackground: true,
          backgroundColor: color(selected ? '#0c5a43' : '#06243f', 0.92),
          backgroundPadding: new C.Cartesian2(8, 5),
          pixelOffset: new C.Cartesian2(0, -28), verticalOrigin: C.VerticalOrigin.BOTTOM,
          scaleByDistance: new C.NearFarScalar(1e6, 1, 3.6e7, 0.8),
        },
      });
      // Depth testing hides locations on the far side of the globe.
      entity._td = { kind: 'pick', id: place.id, name: place.label, lat: place.lat, lon: place.lon };
    });
  } finally {
    source.entities.resumeEvents();
  }
}

export function drawPickArea(source, place, radiusKm = 300) {
  source.entities.removeAll();
  if (!place) return;
  const radius = radiusKm * 1000;
  const area = source.entities.add({
    position: C.Cartesian3.fromDegrees(place.lon, place.lat),
    ellipse: {
      semiMajorAxis: radius, semiMinorAxis: radius,
      material: color('#5eead4', 0.2),
      outline: true, outlineColor: color('#5eead4', 0.85), height: 0,
    },
  });
  area._td = { kind: 'pick', id: place.id, name: place.label, lat: place.lat, lon: place.lon };
}

export function focusPickPlace(viewer, place, duration = 1.2) {
  if (!viewer || !place) return;
  viewer.camera.cancelFlight();
  viewer.camera.flyTo({ destination: C.Cartesian3.fromDegrees(place.lon, place.lat, 3.2e6), orientation, duration });
  viewer.scene.requestRender();
}

export function showPickPlaces(viewer, places, duration = 1.2) {
  if (!viewer || !places?.length) return;
  if (places.length === 1) { focusPickPlace(viewer, places[0], duration); return; }
  const rectangle = C.Rectangle.fromCartesianArray(places.map((p) => C.Cartesian3.fromDegrees(p.lon, p.lat)));
  const padding = C.Math.toRadians(8);
  rectangle.south = Math.max(-Math.PI / 2, rectangle.south - padding);
  rectangle.north = Math.min(Math.PI / 2, rectangle.north + padding);
  viewer.camera.cancelFlight();
  viewer.camera.flyTo({ destination: rectangle, orientation, duration });
  viewer.scene.requestRender();
}

export function pickPlaceAt(scene, position) {
  // Country labels and the reference area can overlap a location marker.
  return scene.drillPick(position, 8).map((hit) => hit.id?._td).find((data) => data?.kind === 'pick');
}
