/* Función de Vercel: reenvía la pregunta a un modelo gratuito en línea (Groq o Gemini) sin exponer la clave.
   Variables de entorno en Vercel: GROQ_API_KEY  (o)  GEMINI_API_KEY.  Opcionales: GROQ_MODEL, GEMINI_MODEL. */
const hits = new Map();
const limited = (ip) => { const now = Date.now(), a = (hits.get(ip) || []).filter((t) => now - t < 60000); a.push(now); hits.set(ip, a); if (hits.size > 5000) hits.clear(); return a.length > 20; };
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
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: JSON.stringify({ model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', temperature: 0.2, max_tokens: 500, messages: [{ role: 'system', content: system }, ...msgs] }) });
      const j = await r.json(); if (!r.ok) return res.status(502).json({ error: cut(j?.error?.message || 'error del proveedor', 200) });
      return res.status(200).json({ text: j.choices?.[0]?.message?.content?.trim() || '' });
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
