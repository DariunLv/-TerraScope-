import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import useAgentBootstrap from '../core/useAgentBootstrap';
import { useStore } from '../core/store';
import { startAgent, stopAgent } from '../features/decide/agent';
import { SentinelButton } from '../features/decide/AgentPanel';

const panel = vi.hoisted(() => vi.fn());
vi.mock('../features/decide/agent', () => ({ startAgent: vi.fn(), stopAgent: vi.fn() }));
vi.mock('../features/decide/SentinelPanel', () => ({ default: props => { panel(props.opened); return props.opened ? <div role="dialog"><button onClick={props.onClose}>Close panel</button></div> : null; } }));
beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); useStore.setState({ view: 'inicio', lang: 'en' }); });
afterEach(() => vi.useRealTimers());

it('starts the automatic review after the homepage intro and stops it on cleanup', async () => {
  const { unmount } = renderHook(useAgentBootstrap);
  await act(async () => vi.advanceTimersByTimeAsync(7999)); expect(startAgent).not.toHaveBeenCalled();
  await act(async () => vi.advanceTimersByTimeAsync(1)); expect(startAgent).toHaveBeenCalledOnce();
  await act(async () => vi.advanceTimersByTimeAsync(10000)); expect(startAgent).toHaveBeenCalledOnce();
  unmount(); expect(stopAgent).toHaveBeenCalledOnce();
});
it('starts without the homepage delay when another section is opened', async () => {
  const { unmount } = renderHook(useAgentBootstrap);
  await act(async () => useStore.setState({ view: 'decidir' })); expect(startAgent).toHaveBeenCalledOnce();
  await act(async () => vi.advanceTimersByTimeAsync(10000)); expect(startAgent).toHaveBeenCalledOnce();
  unmount(); expect(stopAgent).toHaveBeenCalledOnce();
});
it('does not start background work after the application unmounts', async () => {
  const { unmount } = renderHook(useAgentBootstrap); unmount();
  await act(async () => vi.advanceTimersByTimeAsync(20000));
  expect(startAgent).not.toHaveBeenCalled(); expect(stopAgent).not.toHaveBeenCalled();
});
it('loads the Sentinel panel on first use and retains it for its closing animation', async () => {
  render(<SentinelButton />); expect(panel).not.toHaveBeenCalled();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Open the AI Sentinel' })));
  expect(screen.getByRole('dialog')).toBeTruthy(); expect(panel).toHaveBeenLastCalledWith(true);
  fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));
  expect(panel).toHaveBeenLastCalledWith(false);
});
