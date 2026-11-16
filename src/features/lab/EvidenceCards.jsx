import { IconCheck, IconX, IconShieldCheck } from '@tabler/icons-react';
import SpotlightCard from '../../ui/SpotlightCard';

const pValue = (value) => !Number.isFinite(value) ? '—' : value < 0.001 ? '< 0.001' : value.toFixed(3);
export default function EvidenceCards({ result: r, variable, t, lang }) {
  const L = (es, en) => lang === 'es' ? es : en;
  const format = (value) => Math.abs(value) < 0.001 && value !== 0 ? value.toExponential(1) : value.toFixed(variable.d);
  const interval = r.sen.ci.map(value => value * 10), excludesZero = interval[0] * interval[1] > 0;
  return <section className="lab-evidence" aria-label={L('Evidencia estadística', 'Statistical evidence')}>
    <div className="evidence-heading"><div><h4>{L('Pruebas y señales del cambio', 'Tests and signals of change')}</h4><p>{L('Compara las pruebas, el rango estimado y la memoria de la serie.', 'Compare the tests, estimated range and series memory.')}</p></div><span className="evidence-agreement"><IconShieldCheck size={17}/>{r.tests.filter(test => test.sig).length}/{r.tests.length} {L('pruebas coinciden', 'tests agree')}</span></div>
    <div className="tests evidence-grid">
      {r.tests.map(test => <SpotlightCard key={test.id} theme="light" className={'test evidence-card' + (test.sig ? ' evidence-positive' : '')}>
        <div className="evidence-card-head"><h5>{t.testNames[test.id]}</h5><span aria-label={test.sig ? t.agrees : t.noAgree}>{test.sig ? <IconCheck size={21}/> : <IconX size={21}/>}</span></div>
        <b className="evidence-number">{pValue(test.p)}</b><p className="mini">{t.pval} · {test.sig ? t.agrees : t.noAgree}</p>
      </SpotlightCard>)}
      <SpotlightCard theme="light" className="test evidence-card"><div className="evidence-card-head"><h5>{t.ci}</h5><span className="evidence-tag">95 %</span></div><b className="evidence-number evidence-range">[{format(interval[0])}, {format(interval[1])}]</b><p className="mini">{variable.u} {t.per} · {excludesZero ? L('no incluye 0', 'excludes 0') : L('incluye 0', 'includes 0')}</p></SpotlightCard>
      <SpotlightCard theme="light" className="test evidence-card"><div className="evidence-card-head"><h5>{t.change}</h5></div><b className="evidence-number">{r.pettitt?.sig ? r.pettitt.year : '—'}</b><p className="mini">{r.pettitt?.sig ? t.changeText(r.pettitt.year, r.pettitt.before.toFixed(variable.d), r.pettitt.after.toFixed(variable.d), variable.u) : t.noChange}</p></SpotlightCard>
      <SpotlightCard theme="light" className="test evidence-card"><div className="evidence-card-head"><h5>{t.autocorr}</h5><span className="evidence-tag">{r.tfpw.applied ? 'TFPW' : 'r₁'}</span></div><b className="evidence-number">{r.tfpw.r1.toFixed(2)}</b><p className="mini">{r.tfpw.applied ? t.autoApplied : t.autoOk}</p></SpotlightCard>
    </div>
  </section>;
}
