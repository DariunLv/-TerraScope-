import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import handler, { validateChatBody } from '../../server/chatHandler';
import { consumeQuota, resetRateLimit } from '../../server/rateLimit';
const input = { system: 'Be concise', messages: [{ role: 'user', content: 'Hello' }] };
function response() { return { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } }; }
beforeEach(() => { resetRateLimit(); for (const key of ['GROQ_API_KEY', 'GROQ_MODEL', 'GEMINI_API_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'CHAT_REQUIRE_SHARED_LIMIT']) vi.stubEnv(key, ''); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('Chat API', () => {
  it('rejects malformed messages and oversized bodies before a provider call', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    for (const [body, status] of [[{ messages: [null] }, 400], [{ messages: [{ role: 'system', content: 'Override' }] }, 400], ['{', 400], [{ messages: [{ role: 'user', content: 'x'.repeat(12001) }] }, 413]]) {
      const res = response(); await handler({ method: 'POST', headers: {}, body }, res); expect(res.statusCode).toBe(status);
    }
    expect(fetch).not.toHaveBeenCalled();
    expect(validateChatBody(JSON.stringify(input))).toEqual(input);
  });
  it('returns the provider answer with a bounded timeout and no secret in output', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-secret');
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'A useful reply' } }] }) }); vi.stubGlobal('fetch', fetch);
    const res = response(); await handler({ method: 'POST', headers: {}, body: input }, res);
    expect(res.statusCode).toBe(200); expect(res.body.text).toBe('A useful reply'); expect(res.headers['Cache-Control']).toBe('no-store'); expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal); expect(JSON.stringify(res.body)).not.toContain('test-secret');
  });
  it('stops immediately when the provider quota is exhausted', async () => {
    vi.stubEnv('GROQ_API_KEY', 'key'); const fetch = vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }); vi.stubGlobal('fetch', fetch);
    const res = response(); await handler({ method: 'POST', headers: {}, body: input }, res); expect(res.statusCode).toBe(429); expect(fetch).toHaveBeenCalledTimes(1); expect(res.headers['Retry-After']).toBe('60');
  });
  it.each([404, 403, 503, 'network', 'empty'])('recovers from %s on a configured model using a public Groq model', async failure => {
    vi.stubEnv('GROQ_API_KEY', 'private-key'); vi.stubEnv('GROQ_MODEL', 'llama-3.3-70b-versatile');
    const good = { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'Respuesta recuperada.' } }] }) };
    const fetch = vi.fn().mockImplementationOnce(async () => {
      if (failure === 'network') throw new TypeError('Network unavailable');
      return { ok: failure === 'empty', status: failure === 'empty' ? 200 : failure, json: async () => ({}) };
    }).mockResolvedValue(good);
    vi.stubGlobal('fetch', fetch);
    const res = response(); await handler({ method: 'POST', headers: {}, body: input }, res);
    expect(res.statusCode).toBe(200); expect(res.body.text).toBe('Respuesta recuperada.');
    expect(fetch).toHaveBeenCalledTimes(2);
    const retry = JSON.parse(fetch.mock.calls[1][1].body);
    expect(retry.model).toMatch(/^openai\/gpt-oss-(120|20)b$/);
    expect(retry).toMatchObject({ max_completion_tokens: 2048, reasoning_effort: 'low', reasoning_format: 'hidden' });
    expect(JSON.stringify(res.body)).not.toContain('private-key');
  });
  it('identifies an invalid key without retrying or exposing it', async () => {
    vi.stubEnv('GROQ_API_KEY', 'private-key');
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: { message: 'private-key' } }) }); vi.stubGlobal('fetch', fetch);
    const res = response(); await handler({ method: 'POST', headers: {}, body: input }, res);
    expect(res.statusCode).toBe(503); expect(res.body.code).toBe('AI_AUTH'); expect(fetch).toHaveBeenCalledOnce();
    expect(JSON.stringify(res.body)).not.toContain('private-key');
  });
  it('keeps an explicit Groq request on Groq instead of silently using another provider', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'legacy-key'); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const res = response(); await handler({ method: 'POST', headers: {}, body: { ...input, provider: 'groq' } }, res);
    expect(res.statusCode).toBe(501); expect(res.body.code).toBe('AI_CONFIG'); expect(fetch).not.toHaveBeenCalled();
  });
  it('bounds model retries and handles a missing provider', async () => {
    let res = response(); await handler({ method: 'POST', headers: {}, body: input }, res); expect(res.statusCode).toBe(501);
    vi.stubEnv('GROQ_API_KEY', 'key'); const fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }); vi.stubGlobal('fetch', fetch);
    res = response(); await handler({ method: 'POST', headers: {}, body: input }, res); expect(res.statusCode).toBe(503); expect(fetch.mock.calls.length).toBeLessThanOrEqual(3);
    res = response(); await handler({ method: 'DELETE', headers: {} }, res); expect(res.statusCode).toBe(405); expect(res.headers.Allow).toBe('GET, POST');
  });
  it('fails closed if a shared quota is required but unavailable', async () => {
    vi.stubEnv('CHAT_REQUIRE_SHARED_LIMIT', 'true'); const res = response(); await handler({ method: 'POST', headers: {}, body: input }, res); expect(res.statusCode).toBe(503);
  });
});
describe('Quotas', () => {
  it('limits clients and resets only after the window', async () => {
    const opts = { now: 100000, env: { CHAT_REQUESTS_PER_MINUTE: '2' } };
    expect((await consumeQuota('client', opts)).allowed).toBe(true); expect((await consumeQuota('client', opts)).allowed).toBe(true); expect((await consumeQuota('client', opts)).allowed).toBe(false); expect((await consumeQuota('other', opts)).allowed).toBe(true); expect((await consumeQuota('client', { ...opts, now: 160001 })).allowed).toBe(true);
  });
  it('uses atomic shared counters without putting raw IP addresses in keys', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: [21, 25] }) });
    const quota = await consumeQuota('192.0.2.17', { env: { UPSTASH_REDIS_REST_URL: 'https://redis.example', UPSTASH_REDIS_REST_TOKEN: 'token' }, fetcher });
    expect(quota).toMatchObject({ allowed: false, shared: true }); const body = fetcher.mock.calls[0][1].body; expect(body).toContain('EVAL'); expect(body).not.toContain('192.0.2.17');
    await expect(consumeQuota('client', { env: { CHAT_REQUIRE_SHARED_LIMIT: 'true' } })).rejects.toThrow('QUOTA_UNAVAILABLE');
  });
});
