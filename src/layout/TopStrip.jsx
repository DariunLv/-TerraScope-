/* Barra fina superior del modo dashboard: sección actual + Centinela, modo práctica e idioma. */
import { SegmentedControl, Switch, Tooltip } from '@mantine/core';
import { IconSatellite } from '@tabler/icons-react';
import { useStore } from '../core/store';
import { useT } from '../core/i18n';
import { VIEWS } from './TopBar';
import { SentinelButton } from '../features/decide/AgentPanel';
export default function TopStrip() {
  const { lang } = useT(); const { setLang, view, setView, practice, setPractice } = useStore(); const v = VIEWS.find((x) => x[0] === view), I = v?.[1];
  return (
    <div className="strip">
      <button className="strip-brand" onClick={() => setView('inicio')} aria-label="TerraScope"><IconSatellite size={18} /></button>
      <h2 className="strip-t">{I && <I size={20} />}{lang === 'es' ? v?.[2] : v?.[3]}</h2>
      <div className="strip-r">
        <SentinelButton />
        <Tooltip multiline w={230} label={lang === 'es' ? 'Activa esto si no tienes internet: usa datos simulados de práctica.' : 'Turn on if you are offline: uses simulated practice data.'}><div><Switch size="xs" color="navy" checked={practice} onChange={(e) => setPractice(e.currentTarget.checked)} label={lang === 'es' ? 'Práctica' : 'Practice'} /></div></Tooltip>
        <SegmentedControl size="xs" value={lang} onChange={setLang} data={['es', 'en'].map((x) => ({ label: x.toUpperCase(), value: x }))} />
      </div>
    </div>
  );
}
