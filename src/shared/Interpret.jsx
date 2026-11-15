import Rich from './Rich';
/* "Explícame este gráfico": la IA interpreta el gráfico para quien no sabe leerlo. Si la IA no responde, muestra una lectura básica escrita por la app. */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader } from '@mantine/core';
import { useT } from '../core/i18n';
import Killa from '../killa/Killa';
import { explainChart } from '../features/decide/llm';
import { useStore } from '../core/store';

export default function Interpret({ title, facts, plain, how, next }) {
  const { lang } = useT(), L = (a, b) => (lang === 'es' ? a : b);
  const aud = useStore((x) => x.aud), [st, setSt] = useState('idle'), [txt, setTxt] = useState(''), [ai, setAi] = useState(false);
  useEffect(() => { setSt('idle'); setTxt(''); }, [facts, lang]);
  const go = async () => {
    if (st === 'open') { setSt('idle'); return; }
    setSt('load');
    try { const t = await explainChart({ title, facts, lang, aud }); setTxt(t); setAi(true); }
    catch { setTxt(`${how ? how + '\n' : ''}${plain || ''}${next ? '\n' + L('Siguiente paso: ', 'Next step: ') + next : ''}`); setAi(false); }
    setSt('open');
  };
  return (
    <div className="interp">
      <button className="interp-b" onClick={go} aria-expanded={st === 'open'}><Killa estado={st === 'open' ? 'ensenando' : 'idea'} size={42} live={false} shadow={false} tap={false} /><span>{st === 'open' ? L('Ocultar explicación', 'Hide explanation') : L('Explícame este gráfico', 'Explain this chart')}</span>{st === 'load' && <Loader size="xs" color="forest" />}</button>
      <AnimatePresence>{st === 'open' && (
        <motion.div className="interp-t" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
          <div className="interp-in">
            <Rich text={txt.replace(/\*\*/g, '').replace(/\s*(Cómo se lee:|Qué dice aquí:|Ojo:|Siguiente paso:|How to read it:|What it says here:|Careful:|Next step:)/g, '\n**$1** ')} />
            <small>{ai ? L('Explicado por Killa con los números de este gráfico.', 'Explained by Killa using this chart’s numbers.') : L('Explicación básica (la IA no respondió).', 'Basic explanation (the AI did not answer).')}</small>
          </div>
        </motion.div>)}</AnimatePresence>
    </div>
  );
}
