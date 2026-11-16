import { expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { useStore } from '../core/store';
import MapModal from '../layout/MapModal';
const mocks = vi.hoisted(()=>({ maps:[] }));
vi.mock('maplibre-gl',()=>({
  setWorkerUrl:vi.fn(),
  Map:class { constructor(options){this.options=options;this.handlers={};this.setLayoutProperty=vi.fn();this.remove=vi.fn();mocks.maps.push(this);} addControl(){} on(){} once(name,callback){this.handlers[name]=callback;} getLayer(){return true;} isStyleLoaded(){return false;} },
  Marker:class {setLngLat(){return this;}addTo(){return this;}},NavigationControl:class{}
}));
it('applies the selected layer after asynchronous initialization and reopening, and restores focus',async()=>{
  const user=userEvent.setup(); useStore.setState({lang:'es',mapOpen:true,place:{id:'moq',lat:-17.19,lon:-70.93}});
  const opener=document.createElement('button');opener.textContent='Abrir mapa';document.body.appendChild(opener);opener.focus();
  render(<MantineProvider><MapModal/></MantineProvider>);
  await waitFor(()=>expect(mocks.maps.length).toBe(1));const radios=screen.getAllByRole('radio');expect(radios.length).toBe(5);
  await user.click(radios[2]);act(()=>mocks.maps[0].handlers.load());
  expect(mocks.maps[0].setLayoutProperty).toHaveBeenCalledWith('tc','visibility','visible');
  await user.keyboard('{Escape}');expect(useStore.getState().mapOpen).toBe(false);expect(document.activeElement).toBe(opener);expect(mocks.maps[0].remove).toHaveBeenCalled();
  await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
  act(()=>useStore.getState().setMapOpen(true));await waitFor(()=>expect(mocks.maps.length).toBe(2));act(()=>mocks.maps[1].handlers.load());
  expect(mocks.maps[1].setLayoutProperty).toHaveBeenCalledWith('tc','visibility','visible');expect(screen.getAllByRole('radio')[2].checked).toBe(true);
  await user.keyboard('{Escape}');opener.remove();
});
