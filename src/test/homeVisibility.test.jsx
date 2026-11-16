import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import HomeVisibility from '../features/home/HomeVisibility';
import Lot from '../ui/Lot';

const animation = vi.hoisted(() => ({ play: vi.fn(), pause: vi.fn(), destroy: vi.fn(), load: vi.fn() }));
vi.mock('lottie-web/build/player/lottie_light', () => ({ default: { loadAnimation: props => { animation.load(props); return animation; } } }));
let observers;
beforeEach(() => {
  observers = [];
  vi.clearAllMocks();
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback, options) { this.callback = callback; this.options = options; this.disconnect = vi.fn(); observers.push(this); }
    observe() {}
    emit(isIntersecting) { act(() => this.callback([{ isIntersecting }])); }
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('homepage effects entering and leaving the viewport', () => {
  it('prepares deferred effects nearby and keeps the same instance on return', () => {
    const mount = vi.fn(), stop = vi.fn();
    function Effect() { useEffect(() => { mount(); return stop; }, []); return <span>Fibers</span>; }
    const { unmount } = render(<HomeVisibility className="band-gl" defer><Effect /></HomeVisibility>);
    expect(screen.queryByText('Fibers')).toBeNull();
    observers.find(o => o.options?.rootMargin === '500px').emit(true);
    const original = screen.getByText('Fibers');
    observers.find(o => !o.options).emit(true);
    observers.find(o => !o.options).emit(false);
    observers.find(o => !o.options).emit(true);
    expect(screen.getByText('Fibers')).toBe(original);
    expect(mount).toHaveBeenCalledOnce();
    expect(stop).not.toHaveBeenCalled();
    unmount();
    expect(stop).toHaveBeenCalledOnce();
  });

  it('notifies the focus effect when it becomes visible without changing the layout wrapper', () => {
    const { container } = render(<HomeVisibility className="about-tf">{visible => <span>{visible ? 'Playing' : 'Paused'}</span>}</HomeVisibility>);
    expect(container.firstChild.className).toBe('about-tf');
    expect(screen.getByText('Paused')).toBeTruthy();
    observers.find(o => !o.options).emit(true);
    expect(screen.getByText('Playing')).toBeTruthy();
    observers.find(o => !o.options).emit(false);
    expect(screen.getByText('Paused')).toBeTruthy();
  });

  it('pauses offscreen Lottie playback and resumes the same animation without reloading', async () => {
    const { unmount } = render(<Lot k="thermo" pauseOffscreen />);
    observers.find(o => o.options?.rootMargin === '200px').emit(true);
    await waitFor(() => expect(animation.load).toHaveBeenCalledOnce());
    expect(animation.load.mock.calls[0][0]).toMatchObject({ autoplay: false, loop: true, renderer: 'svg' });
    expect(animation.pause).toHaveBeenCalled();
    observers.find(o => !o.options).emit(true);
    expect(animation.play).toHaveBeenCalledOnce();
    observers.find(o => !o.options).emit(false);
    expect(animation.pause).toHaveBeenCalledTimes(2);
    observers.find(o => !o.options).emit(true);
    expect(animation.play).toHaveBeenCalledTimes(2);
    expect(animation.load).toHaveBeenCalledOnce();
    unmount();
    expect(animation.destroy).toHaveBeenCalledOnce();
    expect(observers.every(o => o.disconnect.mock.calls.length > 0)).toBe(true);
  });

  it('keeps playback outside the homepage unchanged by default', async () => {
    render(<Lot k="globe" />);
    expect(observers).toHaveLength(1);
    observers[0].emit(true);
    await waitFor(() => expect(animation.load).toHaveBeenCalledOnce());
    expect(animation.load.mock.calls[0][0].autoplay).toBe(true);
    expect(animation.pause).not.toHaveBeenCalled();
  });
});
