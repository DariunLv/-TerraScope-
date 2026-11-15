/* Función de Vercel: reenvía la pregunta a un modelo gratuito en línea (Groq o Gemini) sin exponer la clave.
   Variables de entorno en Vercel: GROQ_API_KEY  (o)  GEMINI_API_KEY.  Opcionales: GROQ_MODEL, GEMINI_MODEL. */
const hits = new Map();
const limited = (ip) => { const now = Date.now(), a = (hits.get(ip) || []).filter((t) => now - t < 60000); a.push(now); hits.set(ip, a); if (hits.size > 5000) hits.clear(); return a.length > 20; };
let good = null;
const cut = (s, n) => String(s ?? '').slice(0, n);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ ok: true, provider: process.env.GROQ_API_KEY ? 'groq' : process.env.GEMINI_API_KEY ? 'gemini' : null });
  if (req.method !== 'POST') return res.status(405).json({ error: 'método no permitido' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0] || 'x';
  if (limited(ip)) return res.status(429).json({ error: 'demasiadas preguntas seguidas, espera un minuto' });
  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  const system = cut(b?.system, 4000), msgs = (Array.isArray(b?.messages) ? b.messages : []).slice(-8).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: cut(m.content, 9000) })).filter((m) => m.content);
  if (!msgs.length) return res.status(400).json({ error: 'sin mensajes' });
  try {
    if (process.env.GROQ_API_KEY) {
      const key = process.env.GROQ_API_KEY, H = { 'content-type': 'application/json', authorization: `Bearer ${key}` };
      const ask = async (model) => {
        const body = { model, temperature: 0.2, max_tokens: /gpt-oss/.test(model) ? 1200 : 500, messages: [{ role: 'system', content: system }, ...msgs] };
        if (/gpt-oss/.test(model)) body.reasoning_effort = 'low';
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: H, body: JSON.stringify(body) });
        const j = await r.json().catch(() => ({})); return { ok: r.ok, status: r.status, j };
      };
      let list = [good, process.env.GROQ_MODEL, 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'llama-3.1-8b-instant'].filter(Boolean);
      let last = null, tried = new Set();
      for (let pass = 0; pass < 2; pass++) {
        for (const m of list) {
          if (tried.has(m)) continue; tried.add(m);
          const o = await ask(m); last = o;
          if (o.ok) { const t = o.j.choices?.[0]?.message?.content?.trim(); if (t) { good = m; return res.status(200).json({ text: t, model: m }); } continue; }
          if (o.status === 401) return res.status(502).json({ error: 'la clave de Groq no es válida' });
          if (o.status === 429) return res.status(502).json({ error: 'límite gratuito de Groq alcanzado, espera un momento' });
        }
        if (pass === 0) { // descubrir los modelos de chat que sí tiene esta cuenta
          const mr = await fetch('https://api.groq.com/openai/v1/models', { headers: H }).then((x) => x.json()).catch(() => ({}));
          list = (mr.data || []).map((x) => x.id).filter((id) => !/whisper|guard|tts|playai|orpheus|distil|embed|safeguard|compound/i.test(id)).sort((x, y) => (/70b|120b|gpt-oss|llama-4/i.test(y) ? 1 : 0) - (/70b|120b|gpt-oss|llama-4/i.test(x) ? 1 : 0));
        }
      }
      return res.status(502).json({ error: cut(last?.j?.error?.message || 'ningún modelo de Groq respondió', 200) });
    }
    if (process.env.GEMINI_API_KEY) {
      const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: msgs.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })), generationConfig: { temperature: 0.2, maxOutputTokens: 500, thinkingConfig: { thinkingBudget: 0 } } }) });
      const j = await r.json(); if (!r.ok) return res.status(502).json({ error: cut(j?.error?.message || 'error del proveedor', 200) });
      return res.status(200).json({ text: (j.candidates?.[0]?.content?.parts || []).map((p) => p.text).join('').trim() });
    }
    return res.status(501).json({ error: 'falta GROQ_API_KEY o GEMINI_API_KEY en Vercel' });
  } catch (e) { return res.status(502).json({ error: cut(e.message, 200) }); }
}
