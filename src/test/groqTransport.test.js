import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import handler from '../../server/chatHandler';
import { resetRateLimit } from '../../server/rateLimit';
import { askLLM, llmErrorMessage } from '../features/decide/llm';

beforeEach(() => {
  resetRateLimit();
  for (const key of ['GROQ_MODEL', 'GEMINI_API_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'CHAT_REQUIRE_SHARED_LIMIT']) vi.stubEnv(key, '');
  vi.stubEnv('GROQ_API_KEY', 'server-only-key');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it.each([
  ['es', 'Ayúdame a redactar un correo.', 'Claro, empecemos por el destinatario y el propósito.'],
  ['en', 'Explain a Python loop.', 'A loop repeats a block of code.'],
])('carries a general %s question from the client through the API to Groq', async (lang, question, answer) => {
  const fetch = vi.fn(async (url, init) => {
    if (url === '/api/chat') {
      const res = { statusCode: 200, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
      await handler({ method: 'POST', headers: {}, body: JSON.parse(init.body) }, res);
      return { ok: res.statusCode === 200, status: res.statusCode, json: async () => res.body };
    }
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    const payload = JSON.parse(init.body);
    expect(payload.messages.at(-1).content).toBe(question);
    expect(payload.messages[0].content).toContain(lang === 'es' ? 'Spanish' : 'English');
    expect(payload.reasoning_format).toBe('hidden');
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: answer } }] }) };
  });
  vi.stubGlobal('fetch', fetch);
  expect(await askLLM({ mode: 'online' }, { question, history: [], lang, raw: true, noVerify: true, sys: 'General assistant. Reply in ' + (lang === 'es' ? 'Spanish' : 'English') })).toBe(answer);
  expect(JSON.parse(fetch.mock.calls[0][1].body).provider).toBe('groq');
  expect(fetch.mock.calls[0][1].body).not.toContain('server-only-key');
});
it('shows translated errors instead of HTTP status and provider JSON', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ code: 'AI_AUTH', error: 'raw provider body that must stay hidden' }) }));
  let error;
  try { await askLLM({ mode: 'online' }, { question: 'Hi', history: [], lang: 'en', raw: true, noVerify: true }); } catch (caught) { error = caught; }
  expect(error).toMatchObject({ status: 503, code: 'AI_AUTH' });
  expect(llmErrorMessage(error, 'es')).toContain('clave'); expect(llmErrorMessage(error, 'en')).toContain('key');
  expect(llmErrorMessage(error, 'es')).not.toMatch(/HTTP|503|raw provider/);
  expect(llmErrorMessage(error, 'en')).not.toMatch(/HTTP|503|raw provider/);
});
