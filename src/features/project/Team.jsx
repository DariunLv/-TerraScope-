import Killa from '../../killa/Killa';
import SpotlightCard from '../../ui/SpotlightCard';
import { useT } from '../../core/i18n';
import { useTheme } from '../../core/palette';
export default function Team() {
  const theme = useTheme();
  const { t } = useT();
  const m = [['Flor Melany Yanarico Huanca', t.leader, 'F'], ['Yeferson Dariun Laura Livise', t.member, 'Y']];
  return (
    <section id="equipo"><div className="wrap" style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}><Killa estado="orgullosa" size={130} /></div>
      <h2>{t.teamTitle} · The Innovators</h2>
      <div className="team">{m.map(([n, r, i]) => <SpotlightCard key={n} theme={theme} className="member"><div className="avatar">{i}</div><h3 style={{ margin: '10px 0 2px' }}>{n}</h3><span className="tag how">{r}</span></SpotlightCard>)}</div>
    </div></section>
  );
}
