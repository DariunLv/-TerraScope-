import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import Hero from '../features/home/Hero';
import { useStore } from '../core/store';

const draws = vi.hoisted(() => ({ particles: vi.fn(), earth: vi.fn(), text: vi.fn() }));
vi.mock('../ui/useFx', () => ({ default: () => true }));
vi.mock('../features/home/About', () => ({ default: () => <section>About</section> }));
vi.mock('../ui/Drip', () => ({ default: () => null }));
vi.mock('../ui/Ghost', () => ({ default: () => null }));
vi.mock('../ui/Lot', () => ({ default: () => null }));
vi.mock('../killa/Killa', () => ({ default: () => null, KillaSay: () => null }));
vi.mock('../layout/Tour', () => ({ TourLink: () => null }));
vi.mock('../ui/Particles', () => ({ default: props => { draws.particles(props); return null; } }));
vi.mock('../shared/earth/Earth', () => ({ default: () => { draws.earth(); return null; } }));
vi.mock('../components/reactbits/TechText/TechText', () => ({ default: props => { draws.text(props); return <span data-testid="headline-row">{props.text}</span>; } }));
vi.mock('../components/reactbits/TextLoop/TextLoop', () => ({ default: () => null }));
vi.mock('../ui/SpotlightCard', () => ({ default: ({ children, className, onClick }) => <div className={className} onClick={onClick}>{children}</div> }));
vi.mock('../ui/BlurText', () => ({ default: ({ text }) => <p>{text}</p> }));
vi.mock('../ui/ShinyText', () => ({ default: ({ text }) => <span>{text}</span> }));
vi.mock('../ui/CountUp', () => ({ default: ({ to }) => to }));

let observers;
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); useStore.setState({ lang: 'es', view: 'inicio' }); observers = [];
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
    observe(target) { this.target = target; }
    unobserve() {}
    disconnect() {}
  });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
const view = () => render(<MantineProvider theme={{ colors: { forest: Array(10).fill('#0c5a43') } }}><Hero /></MantineProvider>);

describe('homepage rendering isolation', () => {
  it('ignores background progress updates and preserves every headline reveal without redrawing the page', async () => {
    view();
    expect(draws.particles).not.toHaveBeenCalled();
    const particleObserver = observers.find(o => o.target?.className === 'hero-fx' && o.options?.rootMargin === '500px');
    await act(async () => particleObserver.callback([{ isIntersecting: true }]));
    const particles = draws.particles.mock.calls.length, earth = draws.earth.mock.calls.length;
    expect(screen.getAllByTestId('headline-row')).toHaveLength(1);
    for (let pct = 10; pct <= 100; pct += 10) act(() => useStore.setState(s => ({ agent: { ...s.agent, status: 'running', pct }, killa: { estado: 'analizando', msg: String(pct) } })));
    expect(draws.particles).toHaveBeenCalledTimes(particles);
    expect(draws.earth).toHaveBeenCalledTimes(earth);
    act(() => vi.advanceTimersByTime(3600));
    expect(screen.getAllByTestId('headline-row')).toHaveLength(2);
    act(() => vi.advanceTimersByTime(3600));
    expect(screen.getAllByTestId('headline-row')).toHaveLength(3);
    expect(draws.text).toHaveBeenCalledTimes(3);
    expect(draws.particles).toHaveBeenCalledTimes(particles);
    expect(draws.earth).toHaveBeenCalledTimes(earth);
    expect(draws.particles.mock.calls[0][0]).toMatchObject({ particleCount: 110, speed: 0.05, particleBaseSize: 90, moveParticlesOnHover: true });
    act(() => useStore.setState({ lang: 'en' }));
    expect(screen.getAllByTestId('headline-row')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Open the decision center' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open the decision center' }));
    expect(useStore.getState().view).toBe('decidir');
  });
});
