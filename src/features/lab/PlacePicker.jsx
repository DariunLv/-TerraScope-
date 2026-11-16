/* El mapa y los botones comparten lugares, selección y navegación. */
import { useCallback, useMemo, useState } from 'react';
import { IconCheck } from '@tabler/icons-react';
import Earth from '../../shared/earth/Earth';
import { useT } from '../../core/i18n';
export default function PlacePicker({ places, sel, onSelect, radiusKm = 300, height = 380 }) {
  const { lang } = useT();
  const [focusKey, setFocusKey] = useState(0);
  const selectPlace = useCallback((id) => {
    if (!places.some((place) => place.id === id)) return;
    onSelect(id);
    setFocusKey((key) => key + 1);
  }, [places, onSelect]);
  const pick = useMemo(() => ({ places, sel, onSelect: selectPlace, radiusKm, focusKey }), [places, sel, selectPlace, radiusKm, focusKey]);
  const selected = places.find((place) => place.id === sel);
  return <div className="place-picker">
    <div className="pp" style={{ height }}><Earth mode="pick" pick={pick} /></div>
    <div className="pp-options" role="group" aria-label={lang === 'es' ? 'Zonas disponibles' : 'Available locations'}>
      {places.map((place) => <button key={place.id} type="button" aria-pressed={place.id === sel} onClick={() => selectPlace(place.id)}>
        {place.id === sel && <IconCheck size={15} aria-hidden="true" />}{place.label}
      </button>)}
    </div>
    <p className="pp-selection" role="status">{selected
      ? <><b>{selected.label}</b><span>{selected.lat.toFixed(2)}°, {selected.lon.toFixed(2)}°</span></>
      : (lang === 'es' ? 'Elige una zona en el mapa o en la lista.' : 'Choose a location on the map or in the list.')}</p>
  </div>;
}
