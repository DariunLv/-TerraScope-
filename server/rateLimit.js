import { createHash } from 'node:crypto';
const WINDOW = 60000, MAX_CLIENTS = 5000, clients = new Map();
let globalBucket = { start: 0, count: 0 };
const LUA = `local a=redis.call('INCR',KEYS[1]); if a==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; local b=redis.call('INCR',KEYS[2]); if b==1 then redis.call('PEXPIRE',KEYS[2],ARGV[1]) end; return {a,b}`;
export function resetRateLimit() { clients.clear(); globalBucket = { start: 0, count: 0 }; }
export async function consumeQuota(ip, { signal, now = Date.now(), fetcher = fetch, env = process.env } = {}) {
  const perClient = Math.max(1, Math.min(100, Number(env.CHAT_REQUESTS_PER_MINUTE) || 20));
  const globalLimit = Math.max(perClient, Math.min(1000, Number(env.CHAT_GLOBAL_REQUESTS_PER_MINUTE) || 100));
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL, token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (url && token) {
    if (!url.startsWith('https://')) throw new Error('QUOTA_UNAVAILABLE');
    const hash = createHash('sha256').update(String(ip)).digest('hex');
    const response = await fetcher(url.replace(/\/$/, ''), { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(['EVAL', LUA, 2, `{terrascope-chat}:ip:${hash}`, '{terrascope-chat}:global', WINDOW]), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(2500)]) : AbortSignal.timeout(2500) });
    if (!response.ok) throw new Error('QUOTA_UNAVAILABLE');
    const body = await response.json();
    if (!Array.isArray(body.result) || body.result.length !== 2 || !body.result.every((value) => Number.isInteger(value) && value > 0)) throw new Error('QUOTA_UNAVAILABLE');
    return { allowed: +body.result[0] <= perClient && +body.result[1] <= globalLimit, shared: true, retryAfter: 60 };
  }
  if (env.CHAT_REQUIRE_SHARED_LIMIT === 'true') throw new Error('QUOTA_UNAVAILABLE');
  // Bounded local fallback: active limits are never cleared to admit a new IP.
  for (const [key, bucket] of clients) if (now - bucket.start >= WINDOW) clients.delete(key);
  if (now - globalBucket.start >= WINDOW) globalBucket = { start: now, count: 0 };
  let bucket = clients.get(ip);
  if (!bucket) { if (clients.size >= MAX_CLIENTS) return { allowed: false, shared: false, retryAfter: 60 }; bucket = { start: now, count: 0 }; clients.set(ip, bucket); }
  bucket.count++; globalBucket.count++;
  return { allowed: bucket.count <= perClient && globalBucket.count <= globalLimit, shared: false, retryAfter: Math.max(1, Math.ceil((WINDOW - (now - bucket.start)) / 1000)) };
}
