import { useCallback, useState } from 'react';
const sessions = new Map();
export const clearSessions = () => sessions.clear();
export const readSession = (key) => sessions.get(key);
export const writeSession = (key, value) => sessions.set(key, value);
export function useSessionState(key, initial) {
  const [value, setValue] = useState(() => sessions.has(key) ? sessions.get(key) : typeof initial === 'function' ? initial() : initial);
  const update = useCallback((next) => setValue((previous) => { const result = typeof next === 'function' ? next(previous) : next; sessions.set(key, result); return result; }), [key]);
  return [value, update];
}
