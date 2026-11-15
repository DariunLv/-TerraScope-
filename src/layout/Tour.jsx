/* Recorrido guiado de 3 minutos: lugar > tendencia > semáforo > tres futuros > pregunta al asistente > opinión */
import { useEffect, useState } from 'react';
import { Button, SegmentedControl, Textarea } from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconArrowRight, IconArrowLeft, IconDownload } from '@tabler/icons-react';
import { useStore } from '../core/store';
import Killa from '../killa/Killa';
import { useT } from '../core/i18n';

const KEY = 'ts_feedback_v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
export const exportFeedback = () => {
  const rows = load(), esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = ['fecha,claridad_1a5,donde_se_perdio,comentario', ...rows.map((r) => [r.t, r.score, r.lost, r.note].map(esc).join(','))].join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'pruebas-usuarios.csv'; a.click();
};

export function TourLink({ className }) {
  const { lang } = useT(); const open = useStore((s) => s.openTour);
  return <button className={className || 'textlink'} onClick={open}>{lang === 'es' ? 'Recorrido guiado de 3 minutos' : '3-minute guided tour'}</button>;
}

export default function Tour() {
  const { lang } = useT(), L = (a, b) => (lang === 'es' ? a : b);
  const step = useStore((s) => s.tour), setTour = useStore((s) => s.setTour), setView = useStore((s) => s.setView);
  const [score, setScore] = useState('4'), [lost, setLost] = useState(''), [note, setNote] = useState(''), [sent, setSent] = useState(false);
  const S = [
    { pose: 'decidida', id: 'decidir', t: L('1. Elige un lugar', '1. Choose a place'), d: L('Arriba está el selector. Puedes cambiarlo cuando quieras; el análisis se recalcula solo.', 'The selector is at the top. You can change it any time; the analysis recalculates by itself.') },
    { pose: 'grafico', id: 'tend', t: L('2. ¿Hay una tendencia real?', '2. Is there a real trend?'), d: L('Se prueba si el agua cambia año tras año y si ese cambio puede ser azar. “Significativa” quiere decir que es poco probable que sea casualidad.', 'We test whether water changes year after year and whether that could be chance. “Significant” means it is unlikely to be coincidence.') },
    { pose: 'alerta', id: 'semaforo', t: L('3. El semáforo', '3. The traffic light'), d: L('Resume todo en verde, ámbar o rojo, con su confianza. Debajo dice por qué y qué hacer.', 'Summarises everything as green, amber or red, with its confidence. Below it says why and what to do.') },
    { pose: 'comparando', id: 'futuros', t: L('4. Tres futuros', '4. Three futures'), d: L('Qué pasaría si ocurre algo peligroso, si no cambia nada o si todo está tranquilo, siempre con su rango de duda.', 'What would happen if something dangerous occurs, nothing changes or all stays calm, always with its uncertainty range.') },
    { pose: 'explicando', id: 'asistente', t: L('5. Pregunta al asistente', '5. Ask the assistant'), d: L('Le acabamos de preguntar por qué está así. Escribe tu propia pregunta abajo, por ejemplo “si llueve 25 % menos”.', 'We just asked it why this is the state. Type your own question below, for example “if rain drops 25 %”.'), ask: L('¿Por qué está así y qué debo hacer?', 'Why is it like this and what should I do?') },
  ];
  const n = S.length, open = step != null;
  useEffect(() => {
    if (step == null) return;
    if (step === 0) setView('decidir');
    const s = S[step]; if (!s) return;
    const t = setTimeout(() => { document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); if (s.ask) window.dispatchEvent(new CustomEvent('td-ask', { detail: s.ask })); }, step === 0 ? 700 : 150);
    return () => clearTimeout(t);
  }, [step]);
  const send = () => { try { localStorage.setItem(KEY, JSON.stringify([...load(), { t: new Date().toISOString(), score, lost, note }])); } catch { /* sin espacio */ } setSent(true); useStore.getState().sayKilla('celebrando', lang === 'es' ? '¡Gracias por probarme!' : 'Thanks for trying me!'); };
  const close = () => { setTour(null); setSent(false); setLost(''); setNote(''); };
  return (
    <AnimatePresence>{open && (
      <motion.aside className="tour" role="dialog" aria-label={L('Recorrido guiado', 'Guided tour')} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}>
        <button className="tour-x" onClick={close} aria-label={L('Cerrar', 'Close')}><IconX size={18} /></button>
        <div className="tour-killa"><Killa estado={step < n ? S[step].pose : sent ? 'celebrando' : 'duda'} size={104} /></div>
        <div className="tour-dots">{[...S, 0].map((_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
        {step < n ? (<>
          <b>{S[step].t}</b><p>{S[step].d}</p>
          <div className="tour-btns">
            <Button variant="default" radius="xl" disabled={step === 0} leftSection={<IconArrowLeft size={16} />} onClick={() => setTour(step - 1)}>{L('Atrás', 'Back')}</Button>
            <Button color="forest" radius="xl" rightSection={<IconArrowRight size={16} />} onClick={() => setTour(step + 1)}>{step === n - 1 ? L('Terminar', 'Finish') : L('Siguiente', 'Next')}</Button>
          </div></>) : sent ? (<><b>{L('Gracias por tu opinión', 'Thanks for your feedback')}</b><p>{L('Quedó guardada en este navegador.', 'It was saved in this browser.')}</p><div className="tour-btns"><Button variant="default" radius="xl" leftSection={<IconDownload size={16} />} onClick={exportFeedback}>{L('Descargar respuestas (CSV)', 'Download answers (CSV)')}</Button><Button color="forest" radius="xl" onClick={close}>{L('Cerrar', 'Close')}</Button></div></>) : (<>
          <b>{L('¿Se entendió?', 'Was it clear?')}</b>
          <SegmentedControl fullWidth color="forest" value={score} onChange={setScore} data={['1', '2', '3', '4', '5']} aria-label={L('Claridad de 1 a 5', 'Clarity 1 to 5')} />
          <Textarea size="xs" mt={8} autosize minRows={1} placeholder={L('¿En qué parte te perdiste?', 'Where did you get lost?')} value={lost} onChange={(e) => setLost(e.currentTarget.value)} />
          <Textarea size="xs" mt={6} autosize minRows={1} placeholder={L('Comentario libre (opcional)', 'Free comment (optional)')} value={note} onChange={(e) => setNote(e.currentTarget.value)} />
          <div className="tour-btns"><Button variant="default" radius="xl" onClick={close}>{L('Omitir', 'Skip')}</Button><Button color="forest" radius="xl" onClick={send}>{L('Enviar', 'Send')}</Button></div></>)}
      </motion.aside>)}</AnimatePresence>
  );
}
