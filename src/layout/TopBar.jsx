import { SegmentedControl, Switch, Tooltip } from '@mantine/core';
import { IconSatellite, IconHome, IconWorldSearch, IconFlask, IconRipple, IconSchool, IconInfoCircle, IconShieldCheck } from '@tabler/icons-react';
import { useStore } from '../core/store';
import { useT } from '../core/i18n';
import { SentinelButton } from '../features/decide/AgentPanel';
export const VIEWS = [['inicio', IconHome, 'Inicio', 'Home'], ['explorar', IconWorldSearch, 'Explorar', 'Explore'], ['lab', IconFlask, 'Laboratorio', 'Lab'], ['decidir', IconShieldCheck, 'Decidir', 'Decide'], ['lagos', IconRipple, 'Lagos', 'Lakes'], ['aprender', IconSchool, 'Aprender', 'Learn'], ['proyecto', IconInfoCircle, 'Proyecto', 'Project']];
export default function Nav() {
  const { t, lang } = useT(); const { setLang, view, setView, practice, setPractice } = useStore();
  return (<>
    <header className="nav">
      <div className="glass navbar">
        <div className="nav-in">
          <b className="brand" onClick={() => setView('inicio')} style={{ cursor: 'pointer' }}><IconSatellite size={20} style={{ verticalAlign: '-4px', marginRight: 6 }} />{t.brand}</b>
          <nav className="links">{VIEWS.map(([id, I, es, en]) => <button key={id} className={view === id ? 'on' : ''} onClick={() => setView(id)}><I size={16} />{lang === 'es' ? es : en}</button>)}</nav>
          <div className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
            <SentinelButton />
            <Tooltip multiline w={230} label={lang === 'es' ? 'Activa esto si no tienes internet: usa datos simulados de práctica.' : 'Turn on if you are offline: uses simulated practice data.'}><div><Switch size="xs" color="navy" checked={practice} onChange={(e) => setPractice(e.currentTarget.checked)} label={lang === 'es' ? 'Práctica' : 'Practice'} /></div></Tooltip>
            <SegmentedControl size="xs" value={lang} onChange={setLang} data={['es', 'en'].map((v) => ({ label: v.toUpperCase(), value: v }))} />
          </div>
        </div>
      </div>
    </header>
  </>);
}

export function TabBar() {
  const { lang } = useT(); const { view, setView } = useStore();
  return <nav className="tabbar">{VIEWS.map(([id, I, es, en]) => <button key={id} className={view === id ? 'on' : ''} onClick={() => setView(id)}><I size={20} /><span>{lang === 'es' ? es : en}</span></button>)}</nav>;
}
