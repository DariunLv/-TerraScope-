import { useEffect } from 'react';
import { useStore } from './store';

// Let the homepage intro settle before fetching analytical code and starting
// the automatic review. Opening another section starts it without that delay.
export default function useAgentBootstrap() {
  useEffect(() => {
    let disposed = false, loading = false, stop;
    const load = () => {
      if (disposed || loading) return;
      loading = true; clearTimeout(timer);
      import('../features/decide/agent').then(module => {
        if (disposed) return;
        module.startAgent(); stop = module.stopAgent;
      }).catch(error => { loading = false; console.warn('Centinela:', error); });
    };
    const timer = setTimeout(load, useStore.getState().view === 'inicio' ? 8000 : 0);
    const unsubscribe = useStore.subscribe((state, previous) => { if (state.view !== previous.view && state.view !== 'inicio') load(); });
    return () => { disposed = true; clearTimeout(timer); unsubscribe(); stop?.(); };
  }, []);
}
