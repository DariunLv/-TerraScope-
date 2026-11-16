import { useEffect } from 'react';
import { useStore } from './store';
import { routeParam } from './navigation';
import { useSessionState } from './useSessionState';
export function useRouteState(key, initial, valid = (value) => value !== null) {
  const revision = useStore((state) => state.routeRevision);
  const [value, setValue] = useSessionState(key, () => valid(routeParam(key)) ? routeParam(key) : initial);
  useEffect(() => { const next = routeParam(key); if (valid(next)) setValue(next); else if (next === null) setValue(initial); }, [revision, key]);
  const update = (next) => { setValue(next); useStore.getState().setRouteParams({ [key]: next }); };
  return [value, update];
}
