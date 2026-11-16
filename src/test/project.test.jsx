import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MotionConfig } from 'framer-motion';
import Project from '../features/project/Project';
import { useStore } from '../core/store';

const data = vi.hoisted(() => ({ mount: vi.fn() }));
vi.mock('../layout/PageHead', () => ({ default: ({ title, sub }) => <header><h1>{title}</h1><p>{sub}</p></header> }));
vi.mock('../killa/Killa', () => ({ default: () => <span aria-hidden="true">Killa</span> }));
vi.mock('../ui/Ghost', () => ({ default: () => null }));
vi.mock('../ui/SpotlightCard', () => ({ default: ({ children, className }) => <div className={className}>{children}</div> }));
vi.mock('../features/project/ProjectData', () => ({ default: () => { data.mount(); return <section><h2>Live data module</h2></section>; } }));

const theme = { colors: { forest: Array(10).fill('#0c5a43') } };
const defaultLakes = useStore.getState().lakes;
const view = () => render(<MantineProvider theme={theme}><MotionConfig reducedMotion="always"><Project /></MotionConfig></MantineProvider>);
beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/?vista=proyecto');
  useStore.setState({ lang: 'es', view: 'proyecto', routeRevision: 0, lakes: defaultLakes });
});

describe('Project presentation and navigation', () => {
  it('keeps data services inactive until requested and opens Killa from the overview', async () => {
    const user = userEvent.setup();
    view();
    expect(screen.getAllByRole('tab')).toHaveLength(6);
    expect(data.mount).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Vigilar con Centinela' })).toBeTruthy();
    const inventory = screen.getByText('lagos en el inventario activo').parentElement;
    act(() => useStore.setState({ lakes: [{ id: 'test', name: 'Imported lake' }] }));
    expect(within(inventory).getByText('1')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Conocer a Killa y cómo funciona' }));
    expect(await screen.findByRole('heading', { name: 'Tres funciones, una misma evidencia.' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Killa e IA' }).getAttribute('aria-selected')).toBe('true');
    expect(new URL(location.href).searchParams.get('projectTab')).toBe('ai');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Reglas locales' })).toBeTruthy();
    expect(data.mount).not.toHaveBeenCalled();
    await user.click(screen.getByRole('tab', { name: 'Datos en vivo' }));
    expect(await screen.findByRole('heading', { name: 'Live data module' })).toBeTruthy();
    expect(data.mount).toHaveBeenCalled();
  });

  it('restores deep-linked tabs, supports keyboard navigation and preserves the selected tab across languages', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/?vista=proyecto&projectTab=ai');
    view();
    await screen.findByRole('heading', { name: 'Tres funciones, una misma evidencia.' });
    const ai = screen.getByRole('tab', { name: 'Killa e IA' });
    ai.focus();
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Brechas que resolvemos' }).getAttribute('aria-selected')).toBe('true'));
    await user.keyboard('{ArrowLeft}');
    act(() => useStore.setState({ lang: 'en' }));
    expect(await screen.findByRole('heading', { name: 'Three roles, the same evidence.' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Killa & AI' }).getAttribute('aria-selected')).toBe('true');
    act(() => { window.history.replaceState(null, '', '/?vista=proyecto&projectTab=team'); useStore.setState(s => ({ routeRevision: s.routeRevision + 1 })); });
    expect(await screen.findByText('Flor Melany Yanarico Huanca')).toBeTruthy();
    expect(screen.getByText('Yeferson Dariun Laura Livise')).toBeTruthy();
  });

  it('provides working module links that retain the selected place in their URL', () => {
    window.history.replaceState(null, '', '/?vista=proyecto&lugar=custom&lat=-16&lon=-70&nombre=Lago');
    view();
    const lab = screen.getByRole('link', { name: 'Ir al laboratorio' }), url = new URL(lab.href);
    expect(url.searchParams.get('vista')).toBe('lab');
    expect(url.searchParams.get('lat')).toBe('-16');
    expect(url.searchParams.get('lon')).toBe('-70');
    fireEvent.click(lab);
    expect(useStore.getState().view).toBe('lab');
    expect(new URL(location.href).searchParams.get('vista')).toBe('lab');
  });
});
