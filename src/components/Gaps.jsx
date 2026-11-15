import { Tabs } from '@mantine/core';
import { IconAlertTriangle, IconBook2, IconBulb, IconTool, IconCircleCheck } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { GAPS, REFS } from '../gaps';
import { useT } from '../i18n';
const rich = (s) => s.split(/(\[\d+\])/g).map((p, i) => (/^\[\d+\]$/.test(p) ? <a key={i} className="cite" href={'#ref' + p.slice(1, -1)}>{p}</a> : p));
export default function Gaps() {
  const { t, lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b);
  const Row = ({ I, c, label, children }) => <div className="grow"><span className={'gtag ' + c}><I size={14} /> {label}</span><p>{children}</p></div>;
  return (
    <section id="brechas"><div className="wrap">
      <h2>{t.gapsTitle}</h2>
      <p className="sub">{L('Revisamos artículos científicos, informes oficiales y noticias recientes. Cada brecha tiene su evidencia, la función del programa que la atiende y qué tan viable es hoy.', 'We reviewed scientific papers, official reports and recent news. Each gap has its evidence, the program feature that addresses it and how viable it is today.')}</p>
      <Tabs defaultValue="0" mt="md" variant="pills" color="forest">
        <Tabs.List>{t.scales.map((s, i) => <Tabs.Tab key={s} value={String(i)}>{s}</Tabs.Tab>)}</Tabs.List>
        {GAPS[lang].map((g) => (
          <Tabs.Panel key={g.scale} value={String(g.scale)}>
            <div className="gapgrid">
              {g.items.map((it, i) => (
                <motion.div key={lang + g.scale + i} className="card gapcard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <h3><IconAlertTriangle size={18} color="#c2410c" style={{ verticalAlign: '-3px', marginRight: 6 }} />{it.gap}</h3>
                  <Row I={IconBook2} c="ev" label={L('Evidencia', 'Evidence')}>{rich(it.ev)}</Row>
                  <Row I={IconBulb} c="how" label={L('Cómo lo resolvemos', 'How we solve it')}>{it.how}</Row>
                  <Row I={IconTool} c="ft" label={L('Dónde está', 'Where it is')}>{it.feat}</Row>
                  <Row I={IconCircleCheck} c="via" label={L('Viabilidad', 'Viability')}>{it.via}</Row>
                </motion.div>
              ))}
            </div>
          </Tabs.Panel>
        ))}
      </Tabs>
      <h3 style={{ marginTop: 26 }}>{t.refs}</h3>
      <ol className="mini refs">{REFS.map((r) => <li key={r.id} id={'ref' + r.id}>{r.u ? <a className="ref" href={r.u} target="_blank" rel="noreferrer">{r.t}</a> : r.t}</li>)}</ol>
    </div></section>
  );
}
