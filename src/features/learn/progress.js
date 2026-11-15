import { useState, useCallback } from 'react';
const K = 'ts_learn_v1';
const load = () => { try { return JSON.parse(localStorage.getItem(K)) || {}; } catch { return {}; } };
export function useProgress() {
  const [p, setP] = useState(load);
  const upd = useCallback((f) => setP((o) => { const n = f({ ...o }); try { localStorage.setItem(K, JSON.stringify(n)); } catch { /* sin espacio */ } return n; }), []);
  return [p, upd];
}
