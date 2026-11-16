/* Elegir un lugar sobre el planeta 3D de Cesium: puntos con nombre, zona sombreada del elegido, onda y vuelo hasta él. */
import Earth from '../../shared/earth/Earth';
import { useT } from '../../core/i18n';
export default function PlacePicker({ places, sel, onSelect, radiusKm = 300, height = 380 }) {
  const { lang } = useT();
  return <div className="pp" style={{ height }}><Earth mode="pick" pick={{ places, sel, onSelect, radiusKm }} />
    <div className="pp-hint">{lang === 'es' ? 'Toca un punto del planeta o un botón para elegir el lugar' : 'Tap a point on the planet or a button to choose the place'}</div></div>;
}
