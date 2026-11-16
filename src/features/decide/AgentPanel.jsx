/* Keep the visible control light; load its analytical panel on first use. */
import { lazy, Suspense, useState } from 'react';
import { IconRadar2 } from '@tabler/icons-react';
import { useStore } from '../../core/store';
import { useT } from '../../core/i18n';
const Panel = lazy(() => import('./SentinelPanel'));
export function SentinelButton() {
  const { lang } = useT(), L = (es, en) => lang === 'es' ? es : en;
  const agent = useStore(state => state.agent), clear = useStore(state => state.clearUnseen);
  const [open, setOpen] = useState(false), [loaded, setLoaded] = useState(false);
  return <>
    <button className={'sentinel' + (agent.status === 'running' ? ' run' : '') + (agent.unseen ? ' alert' : '')} onClick={() => { setLoaded(true); setOpen(true); clear(); }} aria-label={L('Abrir el Centinela IA', 'Open the AI Sentinel')}>
      <IconRadar2 size={18} /><span>{L('Centinela', 'Sentinel')}</span>{agent.unseen > 0 ? <b>{agent.unseen}</b> : <i />}
    </button>
    {loaded && <Suspense fallback={null}><Panel opened={open} onClose={() => setOpen(false)} /></Suspense>}
  </>;
}
