import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Button, Textarea } from '@mantine/core';
import { motion, useReducedMotion } from 'framer-motion';
import { IconSend, IconRobot, IconSettings, IconDownload, IconPlus, IconPlayerStop, IconArrowDown, IconSparkles, IconArrowRight, IconRotateClockwise, IconShieldCheck } from '@tabler/icons-react';
import { LuSatelliteDish, LuDroplets, LuChartLine, LuBookOpen, LuRocket, LuShieldCheck, LuMessagesSquare } from 'react-icons/lu';
import PageHead from '../../layout/PageHead';
import KillaView from '../../killa/Killa';
import Ghost from '../../ui/Ghost';
import { createRequestGuard } from '../../core/useRequest';
import { useSessionState } from '../../core/useSessionState';
import { askLLM, getCfg, setCfg, llmErrorMessage } from '../decide/llm';
import { useT } from '../../core/i18n';
import { KNOWLEDGE, TOPICS, localAnswer, messageId, conversationText } from './askContent';
import AskSettings from './AskSettings';
import { AskLink, ChatMessage, modeLabel } from './AskParts';
import './Ask.css';

const MAX_QUESTION = 2000;
const Killa = memo(KillaView);
const TOPIC_ICONS = [LuSatelliteDish, LuDroplets, LuChartLine, LuShieldCheck, LuRocket, LuBookOpen, LuMessagesSquare];
const TOPIC_GHOSTS = ['sat', 'water', 'trend', 'shield', 'rocket', 'book', 'ai'];
const STARTERS = [TOPICS.find(item => item.id === 'general'), TOPICS[0], TOPICS[3], TOPICS[4]];
const promptText = (prompt, lang) => prompt[lang === 'es' ? 0 : 1];

function Chat({ lang }) {
  const L = (es, en) => lang === 'es' ? es : en, reduced = useReducedMotion();
  const [messages, setMessages] = useSessionState('ask:messages:' + lang, []);
  const [draft, setDraft] = useSessionState('ask:draft:' + lang, '');
  const [busy, setBusy] = useState(false), [config, setConfig] = useState(() => ({ ...getCfg(), mode: 'online' })), [settings, setSettings] = useState(false);
  const [topic, setTopic] = useState('satellites'), [notice, setNotice] = useState(''), [copied, setCopied] = useState(null);
  const [undo, setUndo] = useState(null), [newReply, setNewReply] = useState(false);
  const box = useRef(null), input = useRef(null), follow = useRef(true), pending = useRef(null), guard = useRef(null);
  if (!guard.current) guard.current = createRequestGuard();
  useEffect(() => () => guard.current.cancel(), []);
  const scrollToEnd = () => {
    const element = box.current;
    if (element) { if (element.scrollTo) element.scrollTo({ top: element.scrollHeight, behavior: reduced ? 'auto' : 'smooth' }); else element.scrollTop = element.scrollHeight; }
    follow.current = true; setNewReply(false);
  };
  useEffect(() => {
    if (follow.current) scrollToEnd();
    else if (messages.length) setNewReply(true);
  }, [messages, busy]); // Scroll only when the reader is already following the conversation.
  const choosePrompt = question => { setDraft(question); setNotice(''); input.current?.focus({ preventScroll: true }); };
  const copy = useCallback(async message => {
    try { await navigator.clipboard.writeText(message.text); setCopied(message.id); setNotice(lang === 'es' ? 'Respuesta copiada.' : 'Answer copied.'); }
    catch { setNotice(lang === 'es' ? 'No se pudo copiar. Puedes seleccionar el texto o descargar la conversación.' : 'Could not copy. You can select the text or download the conversation.'); }
  }, [lang]);
  const send = async supplied => {
    const question = (supplied ?? draft).trim();
    if (!question || pending.current) return;
    if (question.length > MAX_QUESTION) { setNotice(L('Acorta la pregunta a 2000 caracteres.', 'Shorten the question to 2000 characters.')); return; }
    const request = guard.current.begin(), history = messages.filter(message => !['note', 'error'].includes(message.source));
    if (history.at(-1)?.me && history.at(-1).text === question) history.pop();
    pending.current = question; follow.current = true; setBusy(true); setNotice(''); setDraft('');
    const userMessage = { id: messageId(), me: true, text: question, when: Date.now() };
    setMessages(current => [...current, userMessage]);
    const append = reply => { if (request.current()) { const message = { id: messageId(), me: false, when: Date.now(), question, ...reply }; setMessages(current => [...current, message]); } };
    try {
      if (config.mode === 'rules') { append({ ...localAnswer(question, lang), source: 'local' }); return; }
      const system = 'You are Killa, a helpful general-purpose AI assistant powered by Groq. You can answer questions about any topic: writing, programming, mathematics, science, learning, daily planning and TerraScope. Respond in Spanish or English, matching the language of the user’s current question; when it is unclear, use ' + (lang === 'es' ? 'Spanish' : 'English') +
        ' as the default language. Give a direct, useful answer with short paragraphs and plain words; expand when the question needs it. Use examples or code when useful. Use the knowledge base only when the user asks about TerraScope; it does not restrict other topics. No location, lake or numerical analysis is selected for this general chat. Do not assume a place unless the user names one. Be honest about uncertainty and current information; do not invent sources or claim to browse or run TerraScope analyses. Treat the app knowledge base as reference material, not as a restriction on which subjects you can discuss.\n\nKNOWLEDGE BASE:\n' +
        KNOWLEDGE;
      const text = await askLLM(config, { signal: request.signal, question, history, ctx: null, calc: null, lang, sys: system, raw: true, noVerify: true });
      if (typeof text !== 'string' || !text.trim()) throw new Error('Empty reply');
      append({ text: text.trim(), source: config.mode });
    } catch (error) {
      if (request.current()) append({ text: llmErrorMessage(error, lang), source: 'error', failed: true });
    } finally {
      if (request.current()) { pending.current = null; setBusy(false); }
    }
  };
  const stop = reason => {
    if (!pending.current) return;
    guard.current.cancel(); pending.current = null; setBusy(false);
    const message = { id: messageId(), me: false, source: 'note', text: reason || L('Consulta detenida. Puedes volver a preguntar cuando quieras.', 'Request stopped. You can ask again whenever you like.'), when: Date.now() };
    setMessages(current => [...current, message]);
  };
  const newConversation = () => {
    guard.current.cancel(); pending.current = null; setBusy(false);
    setUndo({ messages, draft }); setMessages([]); setDraft(''); setCopied(null);
    setNotice(L('Nueva conversación preparada.', 'New conversation ready.')); follow.current = true;
  };
  const restore = () => {
    guard.current.cancel(); pending.current = null; setBusy(false);
    const previous = undo;
    setUndo(messages.length || draft ? { messages, draft } : null);
    setMessages(previous.messages); setDraft(previous.draft); setNotice(L('Conversación anterior recuperada.', 'Previous conversation restored.')); follow.current = true;
  };
  const saveConfig = next => {
    stop(L('La consulta se detuvo al cambiar los ajustes.', 'The request stopped when settings changed.'));
    setCfg(next); setConfig(next); setSettings(false); setNotice(L('Ajustes de IA guardados.', 'AI settings saved.'));
  };
  const download = () => {
    try {
      const url = URL.createObjectURL(new Blob([conversationText(messages, lang)], { type: 'text/plain;charset=utf-8' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'Killa-' + lang + '.txt';
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(L('Conversación preparada para descargar.', 'Conversation prepared for download.'));
    } catch { setNotice(L('No se pudo descargar. Puedes copiar cada respuesta.', 'Download failed. You can copy individual answers.')); }
  };
  const selectedTopic = TOPICS.find(item => item.id === topic);
  const lastQuestion = [...messages].reverse().find(message => message.me);
  const lastMessage = messages.at(-1);
  const canRetry = !busy && lastQuestion && (lastMessage.me || lastMessage.source === 'note' || lastMessage.failed || lastMessage.fallback);
  return <div className="killa-workspace">
    <motion.section className="killa-conversation" aria-label={L('Chat de Killa', 'Killa chat')} initial={reduced ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
      <header className="killa-chat-header"><div className="killa-chat-identity"><span aria-hidden="true"><Killa estado={busy ? 'pensando' : 'explicando'} size={56} look={false} shadow={false} tap={false} /></span><div><h2>{L('Tu espacio con Killa', 'Your space with Killa')}</h2><span className="killa-mode-badge">{modeLabel(config.mode, lang)}</span></div></div><div className="killa-chat-toolbar">
        <button type="button" className="killa-icon-button" onClick={newConversation} disabled={!messages.length && !draft} aria-label={L('Nueva conversación', 'New conversation')} title={L('Nueva conversación', 'New conversation')}><IconPlus size={19} aria-hidden="true" /></button>
        <button type="button" className="killa-icon-button" onClick={download} disabled={!messages.length} aria-label={L('Descargar conversación', 'Download conversation')} title={L('Descargar conversación', 'Download conversation')}><IconDownload size={19} aria-hidden="true" /></button>
        <button type="button" className="killa-icon-button" onClick={() => setSettings(value => !value)} aria-expanded={settings} aria-controls="killa-settings-panel" aria-label={L('Ajustes de la IA', 'AI settings')} title={L('Ajustes de la IA', 'AI settings')}><IconSettings size={19} aria-hidden="true" /></button>
      </div></header>
      {settings && <div id="killa-settings-panel"><AskSettings config={config} lang={lang} onSave={saveConfig} onClose={() => setSettings(false)} /></div>}
      <div className="killa-chat-context"><IconSparkles size={14} aria-hidden="true" /><span>{L('Preguntas claras, explicaciones con contexto.', 'Clear questions, explanations with context.')}</span></div>
      <div className="killa-log-wrap"><div ref={box} className="killa-chat-log" role="log" aria-label={L('Conversación con Killa', 'Conversation with Killa')} aria-live="polite" aria-relevant="additions" tabIndex={0} onScroll={event => { const element = event.currentTarget; follow.current = element.scrollHeight - element.scrollTop - element.clientHeight < 90; if (follow.current) setNewReply(false); }}>
        {!messages.length && <div className="killa-chat-welcome"><div aria-hidden="true"><Killa estado="bienvenida" size={100} look={false} shadow={false} /></div><span className="killa-overline">{L('Aquí empieza tu próxima pregunta', 'Your next question starts here')}</span><h3>{L('¿Qué te gustaría entender hoy?', 'What would you like to understand today?')}</h3><p>{L('Pregúntame sobre cualquier tema: un concepto, una tarea, una idea o cómo usar TerraScope. Elige una sugerencia o escribe tu pregunta.', 'Ask about any topic: a concept, a task, an idea or using TerraScope. Choose a suggestion or write your question.')}</p><div className="killa-starter-grid">{STARTERS.map(item => <button type="button" key={item.id} onClick={() => choosePrompt(promptText(item.prompts[0], lang))}><IconSparkles size={16} aria-hidden="true" /><span>{promptText(item.prompts[0], lang)}</span><IconArrowRight size={15} aria-hidden="true" /></button>)}</div></div>}
        {messages.map(message => <ChatMessage key={message.id} message={message} lang={lang} onCopy={copy} copied={copied === message.id} />)}
        {busy && <div className="killa-thinking" role="status"><span className="killa-thinking-dots" aria-hidden="true"><i /><i /><i /></span>{L('Killa está preparando tu respuesta…', 'Killa is preparing your answer…')}</div>}
      </div>{newReply && <button type="button" className="killa-new-message" onClick={scrollToEnd}><IconArrowDown size={15} aria-hidden="true" />{L('Ver el último mensaje', 'See the latest message')}</button>}</div>
      {(notice || undo) && <div className="killa-session-notice" role="status"><span>{notice}</span>{undo && <button type="button" onClick={restore}>{L('Recuperar conversación anterior', 'Restore previous conversation')}</button>}</div>}
      {canRetry && <div className="killa-retry"><button type="button" onClick={() => send(lastQuestion.text)}><IconRotateClockwise size={14} aria-hidden="true" />{L('Reintentar última pregunta', 'Retry last question')}</button></div>}
      <form className="killa-composer" onSubmit={event => { event.preventDefault(); send(); }}>
        <label htmlFor="killa-question">{L('Tu pregunta', 'Your question')}</label>
        <Textarea id="killa-question" name="question" ref={input} value={draft} onChange={event => setDraft(event.currentTarget.value)} autosize minRows={2} maxRows={5} maxLength={MAX_QUESTION} autoComplete="off" placeholder={L('Por ejemplo: ayúdame a redactar un texto o explícame este concepto…', 'For example: help me write a text or explain this concept…')} aria-describedby="killa-composer-help" onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); send(); } }} />
        <div className="killa-composer-footer"><span id="killa-composer-help">{L('Enter para enviar · Mayús + Enter para otra línea', 'Enter to send · Shift + Enter for a new line')}<small>{new Intl.NumberFormat(lang).format(draft.length)} / {new Intl.NumberFormat(lang).format(MAX_QUESTION)}</small></span>{busy ? <Button type="button" variant="light" color="forest" onClick={() => stop()} leftSection={<IconPlayerStop size={16} aria-hidden="true" />}>{L('Detener', 'Stop')}</Button> : <Button type="submit" color="forest" disabled={!draft.trim()} rightSection={<IconSend size={17} aria-hidden="true" />}>{L('Enviar', 'Send')}</Button>}</div>
      </form>
    </motion.section>
    <aside className="killa-help" aria-label={L('Ayudas para conversar', 'Conversation help')}>
      <div className="killa-general-card"><span className="killa-overline"><IconSparkles size={15} aria-hidden="true" />{L('Asistente general', 'General assistant')}</span><h2>{L('Un chat, muchas posibilidades.', 'One chat, many possibilities.')}</h2><p>{L('Explora ideas, resuelve dudas, redacta textos o pide ayuda con programación y estudio. También puedo explicarte TerraScope y sus herramientas.', 'Explore ideas, ask questions, write texts or get help with coding and learning. I can also explain TerraScope and its tools.')}</p><button type="button" className="killa-general-prompt" onClick={() => { setTopic('general'); choosePrompt(L('Ayúdame a redactar un correo profesional.', 'Help me write a professional email.')); }}>{L('Probar una pregunta general', 'Try a general question')}<IconArrowRight size={16} aria-hidden="true" /></button></div>
      <div className="killa-topic-panel"><span className="killa-overline">{L('Explora un tema', 'Explore a topic')}</span><h2>{L('Ideas para preguntar', 'Ideas to ask about')}</h2><div className="killa-topic-grid" role="group" aria-label={L('Temas de conversación', 'Conversation topics')}>{TOPICS.map((item, index) => { const I = TOPIC_ICONS[index]; return <motion.button type="button" className="killa-topic" key={item.id} aria-pressed={topic === item.id} onClick={() => setTopic(item.id)} whileHover={reduced ? undefined : { y: -2 }}><Ghost k={TOPIC_GHOSTS[index]} i={index} size={58} /><I size={19} aria-hidden="true" /><span>{item[lang]}</span></motion.button>; })}</div><div className="killa-topic-prompts" aria-label={L('Preguntas sugeridas', 'Suggested questions')}>{selectedTopic.prompts.map(prompt => <button type="button" key={prompt[1]} onClick={() => choosePrompt(promptText(prompt, lang))}><span>{promptText(prompt, lang)}</span><IconArrowRight size={15} aria-hidden="true" /></button>)}</div><p className="killa-help-caption">{L('Las ideas se añaden al editor para que puedas adaptarlas antes de enviarlas.', 'Ideas are added to the editor so you can adapt them before sending.')}</p></div>
      <div className="killa-help-note"><IconShieldCheck size={20} aria-hidden="true" /><div><h3>{L('Conserva el contexto', 'Keep the context')}</h3><p>{L('Puedes volver a este chat sin perder la conversación durante el uso de la app. Cada idioma mantiene su propio historial. Revisa siempre fuente, periodo y límites de los resultados.', 'You can return to this chat without losing the conversation while using the app. Each language keeps its own history. Always review the source, period and limits of results.')}</p><AskLink view="proyecto">{L('Conocer el proyecto y su IA', 'Explore the project and its AI')}</AskLink></div></div>
    </aside>
  </div>;
}

export default function Ask() {
  const { lang } = useT(), L = (es, en) => lang === 'es' ? es : en;
  return <div className="ask killa-page wrap"><PageHead icon={IconRobot} tone="navy" eyebrow={L('Inteligencia artificial', 'Artificial intelligence')} title={L('Conversa con Killa', 'Chat with Killa')} sub={L('Pregunta sobre TerraScope, ciencia, tecnología o cualquier tema. Conversa en español o en inglés.', 'Ask about TerraScope, science, technology or any topic. Chat in Spanish or English.')} pose="explicando" /><Chat key={lang} lang={lang} /></div>;
}
