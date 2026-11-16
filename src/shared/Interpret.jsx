import Rich from './Rich';
/* "Explícame este gráfico": la IA interpreta el gráfico para quien no sabe leerlo. Si la IA no responde, muestra una lectura básica escrita por la app. */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader } from '@mantine/core';
import { useT } from '../core/i18n';
import Killa from '../killa/Killa';
import { explainChart } from '../features/decide/llm';
import { useStore } from '../core/store';
import { useRequest, aborted } from '../core/useRequest';

export default function Interpret({ title, facts, plain, how, next, kind = 'chart' }) {
  const { lang } = useT(), L = (a, b) => (lang === 'es' ? a : b);
  const aud = useStore((x) => x.aud), [st, setSt] = useState('idle'), [txt, setTxt] = useState(''), [ai, setAi] = useState(false);
  const begin = useRequest([title, facts, lang, aud, kind]);
  useEffect(() => { setSt('idle'); setTxt(''); setAi(false); }, [title, facts, lang, aud, kind]);
  const go = async () => {
    if (st === 'load') return;
    if (st === 'open') { begin(); setSt('idle'); return; }
    const request = begin();
    setSt('load');
    try { const t = await explainChart({ title, facts, lang, aud, kind, signal: request.signal }); if (request.current()) { setTxt(t); setAi(true); } }
    catch (error) { if (request.current() && !aborted(error)) { setTxt(`${how ? how + '\n' : ''}${plain || ''}${next ? '\n' + L('Siguiente paso: ', 'Next step: ') + next : ''}`); setAi(false); } }
    if (request.current()) setSt('open');
  };
  return (
    <div className="interp" data-interpret-title={title}>
      <button type="button" className="interp-b" title={title} onClick={go} aria-expanded={st === 'open'} aria-busy={st === 'load'}><Killa estado={st === 'open' ? 'ensenando' : 'idea'} size={42} live={false} shadow={false} tap={false} /><span>{st === 'open' ? L('Ocultar explicación', 'Hide explanation') : kind === 'table' ? L('Explícame esta tabla', 'Explain this table') : kind === 'result' ? L('Explícame este resultado', 'Explain this result') : L('Explícame este gráfico', 'Explain this chart')}</span>{st === 'load' && <Loader size="xs" color="forest" />}</button>
      <AnimatePresence>{st === 'open' && (
        <motion.div className="interp-t" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
          <div className="interp-in">
            <Rich text={txt.replace(/\*\*/g, '').replace(/\s*(Qué es:|Cómo se lee:|Qué dice aquí:|Por qué importa:|Ojo:|Siguiente paso:|What it is:|How to read it:|What it says here:|Why it matters:|Careful:|Next step:)/g, '\n**$1** ')} />
            <small>{ai ? L('Explicado por Killa con los datos de ', 'Explained by Killa using data from ') + (kind === 'table' ? L('esta tabla.', 'this table.') : kind === 'result' ? L('este resultado.', 'this result.') : L('este gráfico.', 'this chart.')) : L('Explicación local de Killa.', 'Local explanation by Killa.')}</small>
          </div>
        </motion.div>)}</AnimatePresence>
    </div>
  );
}
