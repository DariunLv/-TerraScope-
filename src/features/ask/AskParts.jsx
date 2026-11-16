import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { IconArrowUpRight, IconCopy, IconCheck } from '@tabler/icons-react';
import Killa from '../../killa/Killa';
import Rich from '../../shared/Rich';
import { useStore } from '../../core/store';
import { answerSource } from './askContent';

export const modeLabel = answerSource;

export function AskLink({ view, children }) {
  const query = new URLSearchParams(window.location.search);
  query.set('vista', view); query.delete('sec');
  return <a className="killa-route" href={`${window.location.pathname}?${query}`} onClick={event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); useStore.getState().setView(view);
  }}>{children}<IconArrowUpRight size={16} aria-hidden="true" /></a>;
}

export const ChatMessage = memo(function ChatMessage({ message, lang, onCopy, copied }) {
  const L = (es, en) => lang === 'es' ? es : en, reduced = useReducedMotion();
  if (message.source === 'note') return <div className="killa-chat-note">{message.text}</div>;
  return <motion.article className={`killa-message${message.me ? ' is-user' : ''}`} initial={reduced ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }} aria-label={message.me ? L('Tu pregunta', 'Your question') : L('Respuesta de Killa', 'Killa’s answer')}>
    {!message.me && <div className="killa-message-avatar" aria-hidden="true"><Killa estado={message.source === 'local' ? 'pista' : 'idea'} size={35} live={false} look={false} shadow={false} tap={false} /></div>}
    <div className="killa-message-content"><div className="killa-message-meta"><b>{message.me ? L('Tú', 'You') : 'Killa'}</b>{!message.me && <span>{modeLabel(message.source, lang)}</span>}<time dateTime={new Date(message.when).toISOString()}>{new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' }).format(message.when)}</time></div><div className="killa-message-bubble"><Rich text={message.text} /></div>
      {message.fallback && <p className="killa-fallback">{L('El modelo no respondió. Esta es una guía local preparada.', 'The model did not respond. This is a prepared local guide.')}</p>}
      {!message.me && <div className="killa-message-actions"><button type="button" onClick={() => onCopy(message)} aria-label={copied ? L('Respuesta copiada', 'Answer copied') : L('Copiar respuesta', 'Copy answer')}>{copied ? <IconCheck size={14} aria-hidden="true" /> : <IconCopy size={14} aria-hidden="true" />}{copied ? L('Copiado', 'Copied') : L('Copiar', 'Copy')}</button>{message.view && <AskLink view={message.view}>{L('Explorar esta herramienta', 'Explore this tool')}</AskLink>}</div>}
    </div>
  </motion.article>;
});
