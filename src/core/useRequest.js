import { useCallback, useEffect, useRef } from 'react';
export const aborted = (error) => error?.name === 'AbortError';
export function createRequestGuard() {
  let sequence = 0, controller;
  const cancel = () => { sequence++; controller?.abort(); };
  return { cancel, begin() { cancel(); controller = new AbortController(); const id = sequence, signal = controller.signal; return { signal, current: () => id === sequence && !signal.aborted }; } };
}
export function useRequest(dependencies = []) {
  const guard = useRef(null); if (!guard.current) guard.current = createRequestGuard();
  useEffect(() => { const current = guard.current; return () => current.cancel(); }, dependencies);
  return useCallback(() => guard.current.begin(), []);
}
