import { useEffect, useState } from 'react';
import { useRequest, aborted } from '../../core/useRequest';
import { runAnalysis } from './run';
export function useAnalysis(type, payload, dependencies) {
  const begin = useRequest(dependencies), [state, setState] = useState({ dependencies: [], value: null, error: null, loading: false });
  useEffect(() => {
    const request = begin();
    if (!payload) { setState({ dependencies, value: null, error: null, loading: false }); return; }
    setState({ dependencies, value: null, error: null, loading: true });
    runAnalysis(type, payload, { signal: request.signal }).then((value) => { if (request.current()) setState({ dependencies, value, error: null, loading: false }); }).catch((error) => { if (request.current() && !aborted(error)) setState({ dependencies, value: null, error, loading: false }); });
  }, dependencies);
  const current = state.dependencies.length === dependencies.length && dependencies.every((dependency, index) => Object.is(dependency, state.dependencies[index]));
  return current ? state : { value: null, error: null, loading: !!payload };
}
