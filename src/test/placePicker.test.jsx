import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MotionConfig } from 'framer-motion';
import Questions from '../features/lab/Questions';
import PlacePicker from '../features/lab/PlacePicker';
import { PLACES } from '../lib/nasa/data';
import { useStore } from '../core/store';

// Exercise the real selection UI/store across the boundary with the WebGL viewer.
vi.mock('../shared/earth/Earth', () => ({ default: ({ pick }) => <div role="group" aria-label="Cesium" data-selected={pick.sel} data-focus={pick.focusKey}>
  {pick.places.map((point) => <button key={point.id} onClick={() => pick.onSelect(point.id)}>{`Mapa: ${point.label}`}</button>)}
</div> }));

const theme = { colors: { forest: Array(10).fill('#0c5a43') } };
const wrap = (children) => <MantineProvider theme={theme}><MotionConfig reducedMotion="always">{children}</MotionConfig></MantineProvider>;

beforeEach(() => useStore.setState({ lang: 'es', job: null, place: { id: 'moq', lat: -17.19, lon: -70.93 } }));

describe('Laboratory location selection', () => {
  it('synchronizes map clicks, lower buttons, and the place used by the investigation', async () => {
    const user = userEvent.setup();
    render(wrap(<Questions />));
    await user.click(screen.getByRole('button', { name: 'Gran ciudad' }));
    await user.click(screen.getByRole('button', { name: 'Agricultura' }));
    const map = screen.getByRole('group', { name: 'Cesium' });
    const locations = screen.getByRole('group', { name: 'Zonas disponibles' });
    const cities = PLACES.filter((point) => point.b === 'city');
    expect(within(map).getAllByRole('button')).toHaveLength(cities.length);
    expect(within(locations).getAllByRole('button').map((button) => button.textContent)).toEqual(cities.map((point) => point.es));
    await user.click(screen.getByRole('button', { name: 'Madrid, España', exact: true }));
    expect(map.dataset.selected).toBe('mad');
    const focusKey = map.dataset.focus;
    await user.click(screen.getByRole('button', { name: 'Madrid, España', exact: true }));
    expect(map.dataset.focus).not.toBe(focusKey);
    await user.click(screen.getByRole('button', { name: 'Mapa: Tokio, Japón' }));
    expect(screen.getByRole('button', { name: 'Tokio, Japón', exact: true }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('status').textContent).toContain('Tokio, Japón');
    await user.click(screen.getByRole('button', { name: 'Gran ciudad' }));
    expect(map.dataset.selected).toBe('tok');
    await user.click(screen.getByRole('button', { name: 'Calor', exact: true }));
    expect(map.dataset.selected).toBe('tok');
    await user.click(screen.getByRole('button', { name: 'Investigar con estas pistas' }));
    expect(useStore.getState().place).toEqual({ id: 'tok', lat: 35.68, lon: 139.69 });
    expect(useStore.getState().job.vars).toEqual(['T2M_MAX', 'T2M_MIN', 'TS']);
  });

  it('offers every catalog zone for each landscape and resets incompatible selections', async () => {
    const user = userEvent.setup();
    render(wrap(<Questions />));
    await user.click(screen.getByRole('button', { name: 'Agua y sequía' }));
    for (const [type, label] of [['city', 'Gran ciudad'], ['mountain', 'Alta montaña'], ['forest', 'Selva o bosque'], ['polar', 'Zona polar'], ['coast', 'Costa, delta o estuario'], ['desert', 'Desierto o zona seca']]) {
      await user.click(screen.getByRole('button', { name: label }));
      const candidates = PLACES.filter((point) => point.b === type);
      const options = screen.getByRole('group', { name: 'Zonas disponibles' });
      expect(within(options).getAllByRole('button').map((button) => button.textContent)).toEqual(candidates.map((point) => point.es));
      expect(screen.getByRole('group', { name: 'Cesium' }).dataset.selected).toBe(candidates[0].id);
      await user.click(within(options).getByRole('button', { name: candidates.at(-1).es }));
    }
  });

  it('updates map and button labels when the language changes', () => {
    const select = vi.fn(), places = PLACES.slice(0, 2);
    const { rerender } = render(wrap(<PlacePicker places={places.map((point) => ({ ...point, label: point.es }))} sel="ama" onSelect={select} />));
    useStore.setState({ lang: 'en' });
    rerender(wrap(<PlacePicker places={places.map((point) => ({ ...point, label: point.en }))} sel="ama" onSelect={select} />));
    expect(screen.getByRole('button', { name: 'Mapa: Peruvian Amazon' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Peruvian Amazon', exact: true }).getAttribute('aria-pressed')).toBe('true');
  });
});
