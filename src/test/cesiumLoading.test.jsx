import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { beforeEach, expect, it, vi } from 'vitest';
import Earth from '../shared/earth/Earth';
import { loadCesium } from '../shared/earth/loadCesium';
import { useStore } from '../core/store';
vi.mock('../shared/earth/loadCesium', () => ({ loadCesium: vi.fn() }));
const wrapper = ({ children }) => <MantineProvider theme={{ colors: { forest: Array(10).fill('#0c5a43') } }}>{children}</MantineProvider>;
beforeEach(() => { useStore.setState({ lang: 'es' }); loadCesium.mockReset(); });
it.each(['hero', 'explore', 'lakes', 'pick'])('opens Cesium directly in %s without a capability probe or intersection gate', async (mode) => {
  loadCesium.mockResolvedValue({ default: (props) => <div data-testid="cesium">Cesium {props.mode}</div> });
  const { container } = render(<Earth mode={mode} />, { wrapper });
  expect((await screen.findByTestId('cesium')).textContent).toBe(`Cesium ${mode}`);
  expect(loadCesium).toHaveBeenCalledOnce();
  expect(container.querySelector('.cssplanet,.earth-flat,.earth-skel')).toBeNull();
});
it('lets a failed initialization retry without replacing Cesium with a decorative globe', async () => {
  const user = userEvent.setup(), warning = vi.spyOn(console, 'warn').mockImplementation(() => {}), error = vi.spyOn(console, 'error').mockImplementation(() => {});
  const expectedFailure = (event) => { if (event.message === 'Context lost') event.preventDefault(); };
  window.addEventListener('error', expectedFailure);
  loadCesium.mockResolvedValueOnce({ default: () => { throw new Error('Context lost'); } }).mockResolvedValueOnce({ default: () => <div>Cesium recuperado</div> });
  const { container } = render(<Earth mode="explore" />, { wrapper });
  await user.click(await screen.findByRole('button', { name: 'Reintentar mapa 3D' }));
  expect(await screen.findByText('Cesium recuperado')).toBeTruthy(); expect(container.querySelector('.cssplanet')).toBeNull(); warning.mockRestore(); error.mockRestore(); window.removeEventListener('error', expectedFailure);
});
