import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MotionConfig } from 'framer-motion';
import Ask from '../features/ask/Ask';
import { askLLM, getCfg, setCfg } from '../features/decide/llm';
import { KNOWLEDGE, TOPICS, localAnswer, conversationText } from '../features/ask/askContent';
import { useStore } from '../core/store';

vi.mock('../features/decide/llm', async original => ({ ...await original(), askLLM: vi.fn(), getCfg: vi.fn(), setCfg: vi.fn() }));
vi.mock('../layout/PageHead', () => ({ default: ({ title, sub }) => <header><h1>{title}</h1><p>{sub}</p></header> }));
vi.mock('../killa/Killa', () => ({ default: () => <span aria-hidden="true">Mascot</span> }));
vi.mock('../ui/Ghost', () => ({ default: () => null }));
const config = { mode: 'online', ollamaUrl: 'http://localhost:11434', ollamaModel: 'local-model', apiKey: '', claudeModel: 'configured-model' };
const theme = { colors: { forest: Array(10).fill('#0c5a43'), navy: Array(10).fill('#1e3a8a') } };
const view = () => render(<MantineProvider theme={theme}><MotionConfig reducedMotion="always"><Ask /></MotionConfig></MantineProvider>);
const question = () => screen.getByRole('textbox', { name: 'Tu pregunta' });
const submit = async (user, text) => { await user.clear(question()); await user.type(question(), text); await user.click(screen.getByRole('button', { name: 'Enviar', exact: true })); };
beforeEach(() => {
  vi.clearAllMocks();
  getCfg.mockReturnValue({ ...config });
  askLLM.mockResolvedValue('Esta es la explicación del modelo.');
  useStore.setState({ lang: 'es', place: { id: 'moq', lat: -17.19, lon: -70.93 }, practice: false });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('Killa conversation', () => {
  it.each([
    ['es', 'Ayúdame a redactar un correo profesional.', 'Asunto: Solicitud de información.'],
    ['en', 'Write a Python function that adds two numbers.', 'def add(a, b): return a + b'],
  ])('uses Groq for unrestricted %s questions without sending the selected place', async (lang, text, reply) => {
    const user = userEvent.setup();
    useStore.setState({ lang }); getCfg.mockReturnValue({ ...config, mode: 'rules' });
    askLLM.mockResolvedValue(reply); view();
    expect(screen.queryByText(/Moquegua/)).toBeNull();
    const input = screen.getByRole('textbox', { name: lang === 'es' ? 'Tu pregunta' : 'Your question' });
    await user.type(input, text);
    await user.click(screen.getByRole('button', { name: lang === 'es' ? 'Enviar' : 'Send', exact: true }));
    expect(await screen.findByText(reply)).toBeTruthy();
    expect(askLLM).toHaveBeenCalledWith(expect.objectContaining({ mode: 'online' }), expect.objectContaining({ question: text, lang, raw: true, noVerify: true }));
    const system = askLLM.mock.lastCall[1].sys;
    expect(system).toContain('matching the language');
    expect(system).not.toContain('Moquegua');
    expect(system).not.toContain('selectedPlace');
    expect(system).not.toContain('activeInventoryCount');
  });

  it('lets users edit suggestions, write several lines, send with Enter, copy and export with provenance', async () => {
    const user = userEvent.setup();
    view();
    await user.click(within(screen.getByRole('log')).getByRole('button', { name: '¿Qué es NASA POWER?' }));
    expect(question().value).toBe('¿Qué es NASA POWER?');
    expect(askLLM).not.toHaveBeenCalled();
    await user.keyboard('{Shift>}{Enter}{/Shift}Explícalo con palabras simples.');
    expect(question().value).toContain('\n');
    expect(askLLM).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');
    const answer = await screen.findByRole('article', { name: 'Respuesta de Killa' });
    expect(within(answer).getByText('Groq')).toBeTruthy();
    expect(askLLM).toHaveBeenCalledOnce();
    expect(askLLM.mock.calls[0][1].question).toContain('\nExplícalo');
    expect(askLLM.mock.calls[0][1].sys).not.toContain('Moquegua');
    expect(askLLM.mock.calls[0][1].sys.length).toBeLessThan(10000);
    expect(askLLM.mock.calls[0][1].sys).toContain('general-purpose AI assistant');
    const clipboard = vi.spyOn(navigator.clipboard, 'writeText');
    await user.click(within(answer).getByRole('button', { name: 'Copiar respuesta' }));
    expect(clipboard).toHaveBeenCalledWith('Esta es la explicación del modelo.');
    const BaseURL = URL, create = vi.fn(() => 'blob:conversation'), revoke = vi.fn();
    vi.stubGlobal('URL', class extends BaseURL { static createObjectURL = create; static revokeObjectURL = revoke; });
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { expect(this.download).toBe('Killa-es.txt'); });
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Descargar conversación' }));
    expect(download).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0].type).toBe('text/plain;charset=utf-8');
    act(() => vi.advanceTimersByTime(1000));
    expect(revoke).toHaveBeenCalledWith('blob:conversation');
  });

  it('shows a readable provider timeout without a canned answer and allows a retry', async () => {
    const user = userEvent.setup();
    askLLM.mockRejectedValueOnce(new DOMException('Provider timed out', 'AbortError'));
    view();
    await submit(user, '¿Qué es NASA POWER?');
    expect(await screen.findByText('La IA tardó demasiado en responder. Puedes volver a intentarlo.')).toBeTruthy();
    expect(screen.queryByText('Guía local')).toBeNull();
    expect(screen.queryByText(/HTTP|502|Respondí con reglas/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Reintentar última pregunta' }));
    expect(await screen.findByText('Esta es la explicación del modelo.')).toBeTruthy();
    expect(askLLM).toHaveBeenCalledTimes(2);
    expect(askLLM.mock.lastCall[1].history.some(message => message.source === 'error')).toBe(false);
    expect(askLLM.mock.lastCall[1].history.at(-1)?.text).not.toBe('¿Qué es NASA POWER?');
  });

  it('cancels work, ignores a late response and accepts a new question immediately', async () => {
    const user = userEvent.setup(); let oldResolve;
    askLLM.mockImplementationOnce(() => new Promise(resolve => oldResolve = resolve));
    view();
    await submit(user, 'Primera consulta');
    const signal = askLLM.mock.calls[0][1].signal;
    await user.click(screen.getByRole('button', { name: 'Detener' }));
    expect(signal.aborted).toBe(true);
    await submit(user, 'Nueva consulta');
    await screen.findByText('Esta es la explicación del modelo.');
    await act(async () => oldResolve('Respuesta antigua que no debe aparecer'));
    expect(screen.queryByText('Respuesta antigua que no debe aparecer')).toBeNull();
    expect(askLLM.mock.calls[1][1].history.some(message => message.source === 'note')).toBe(false);
    expect(screen.queryByRole('button', { name: 'Detener' })).toBeNull();
  });

  it('starts a new chat without losing the previous draft and conversation recovery', async () => {
    const user = userEvent.setup(); let resolve;
    askLLM.mockImplementationOnce(() => new Promise(done => resolve = done));
    view();
    await submit(user, 'Pregunta pendiente');
    await user.type(question(), 'Borrador para después');
    const signal = askLLM.mock.calls[0][1].signal;
    await user.click(screen.getByRole('button', { name: 'Nueva conversación' }));
    expect(signal.aborted).toBe(true);
    expect(screen.getByRole('heading', { name: '¿Qué te gustaría entender hoy?' })).toBeTruthy();
    await act(async () => resolve('Respuesta fuera de contexto'));
    expect(screen.queryByText('Respuesta fuera de contexto')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Recuperar conversación anterior' }));
    expect(screen.getByText('Pregunta pendiente')).toBeTruthy();
    expect(question().value).toBe('Borrador para después');
    expect(screen.getByRole('button', { name: 'Reintentar última pregunta' })).toBeTruthy();
  });

  it('retains history and drafts across section remounts and isolates pending work by language', async () => {
    const user = userEvent.setup();
    const first = view();
    await submit(user, 'Mi consulta en español');
    await screen.findByText('Esta es la explicación del modelo.');
    await user.type(question(), 'Mi borrador');
    first.unmount(); view();
    expect(screen.getByText('Esta es la explicación del modelo.')).toBeTruthy();
    expect(question().value).toBe('Mi borrador');
    act(() => useStore.setState({ lang: 'en' }));
    expect(screen.queryByText('Esta es la explicación del modelo.')).toBeNull();
    let resolve;
    askLLM.mockImplementationOnce(() => new Promise(done => resolve = done));
    await user.type(screen.getByRole('textbox', { name: 'Your question' }), 'English question');
    await user.click(screen.getByRole('button', { name: 'Send', exact: true }));
    const signal = askLLM.mock.lastCall[1].signal;
    act(() => useStore.setState({ lang: 'es' }));
    expect(signal.aborted).toBe(true);
    expect(question().value).toBe('Mi borrador');
    await act(async () => resolve('Late English answer'));
    expect(screen.queryByText('Late English answer')).toBeNull();
    act(() => useStore.setState({ lang: 'en' }));
    expect(screen.getByText('English question')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry last question' })).toBeTruthy();
  });

  it('saves mode settings explicitly and turns sidebar topics into usable local questions', async () => {
    const user = userEvent.setup();
    view();
    await user.click(screen.getByRole('button', { name: 'Ajustes de la IA' }));
    await user.click(screen.getByRole('radio', { name: 'Reglas', exact: true }));
    expect(setCfg).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Guardar ajustes' }));
    expect(setCfg).toHaveBeenCalledWith(expect.objectContaining({ mode: 'rules' }));
    await user.click(screen.getByRole('button', { name: 'Usar TerraScope' }));
    await user.click(within(screen.getByRole('complementary', { name: 'Ayudas para conversar' })).getByRole('button', { name: '¿Cómo funciona Centinela?' }));
    expect(question().value).toBe('¿Cómo funciona Centinela?');
    await user.click(screen.getByRole('button', { name: 'Enviar', exact: true }));
    expect(await screen.findByText(/Centinela revisa los lagos del inventario/)).toBeTruthy();
    expect(askLLM).not.toHaveBeenCalled();
    expect(screen.queryByText(/El modelo no respondió/)).toBeNull();
    expect(screen.getByText('Guía local')).toBeTruthy();
  });

  it('does not submit composing text or overlong questions', async () => {
    const user = userEvent.setup();
    view();
    await user.type(question(), 'Texto en composición');
    fireEvent.keyDown(question(), { key: 'Enter', isComposing: true, keyCode: 229 });
    expect(askLLM).not.toHaveBeenCalled();
    fireEvent.change(question(), { target: { value: 'a'.repeat(2001) } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar', exact: true }));
    expect(screen.getByText('Acorta la pregunta a 2000 caracteres.')).toBeTruthy();
    expect(askLLM).not.toHaveBeenCalled();
  });

  it('keeps the reader’s scroll position when a reply arrives and offers a jump to the latest message', async () => {
    const user = userEvent.setup(); let resolve;
    askLLM.mockImplementationOnce(() => new Promise(done => resolve = done));
    view();
    const log = screen.getByRole('log');
    Object.defineProperties(log, { scrollHeight: { configurable: true, value: 1200 }, clientHeight: { configurable: true, value: 250 } });
    log.scrollTo = vi.fn();
    await submit(user, 'Una pregunta mientras leo');
    log.scrollTo.mockClear(); log.scrollTop = 100; fireEvent.scroll(log);
    await act(async () => resolve('Respuesta que llegó mientras leías.'));
    expect(log.scrollTo).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Ver el último mensaje' }));
    expect(log.scrollTo).toHaveBeenCalledWith({ top: 1200, behavior: 'auto' });
    expect(screen.queryByRole('button', { name: 'Ver el último mensaje' })).toBeNull();
    expect(screen.queryByText('Moquegua, Perú')).toBeNull();
    expect(screen.getByRole('button', { name: 'Probar una pregunta general' })).toBeTruthy();
  });
});

it('provides local guidance for every published topic and exports the source of each answer', () => {
  for (const topic of TOPICS.filter(item => item.id !== 'general')) for (const prompt of topic.prompts) for (const [index, lang] of [[0, 'es'], [1, 'en']]) expect(localAnswer(prompt[index], lang).view).toBeTruthy();
  expect(localAnswer('¿Cómo funciona Centinela?', 'es').text).not.toContain('pendiente de Sen');
  expect(localAnswer('¿Cómo sé si una tendencia es significativa?', 'es').text).toContain('No es la probabilidad');
  expect(KNOWLEDGE.length).toBeLessThan(8500);
  const text = conversationText([{ me: true, text: 'Pregunta' }, { me: false, source: 'online', text: 'Respuesta' }, { me: false, source: 'local', text: 'Guía' }], 'es');
  expect(text).toContain('Killa · Groq');
  expect(text).toContain('Killa · Guía local');
});
