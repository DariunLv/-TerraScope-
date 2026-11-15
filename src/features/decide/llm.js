/* Asistente con modelo de lenguaje REAL, opcional y bajo control del usuario.
   Modos: 'online' (función /api/chat de Vercel con modelo gratuito) · 'rules' (reglas locales, sin red) · 'ollama' (modelo en tu propio computador, gratis y sin internet) · 'claude' (API de Anthropic con tu clave).
   El modelo solo recibe un resumen numérico del análisis (CONTEXTO) y tiene prohibido inventar datos. Si falla, se responde con reglas. */
const KEY = 'ts_llm_v1', DEF = { mode: 'online', ollamaUrl: 'http://localhost:11434', ollamaModel: 'llama3.2', apiKey: '', claudeModel: 'claude-sonnet-5-5' };
export const getCfg = () => { try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEF }; } };
export const setCfg = (c) => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* sin espacio */ } };

export function systemPrompt(lang) {
  return lang === 'es'
    ? 'Eres el asistente de decisiones de la app “Detectives de Tendencias” (NASA Space Apps 2026, equipo The Innovators). Ayudas a autoridades, agricultores y estudiantes a entender el estado del agua de un lago o lugar y a decidir qué hacer.\nReglas: 1) Responde SOLO con base en el CONTEXTO JSON y en el CÁLCULO DEL SISTEMA si lo hay; cita cifras exactas. 2) Si algo no está en el contexto, di que no lo sabes y qué dato faltaría; nunca inventes cifras, causas ni fechas. 3) Distingue asociación de causa. 4) Recuerda que el balance lluvia menos evaporación es un índice climático, no el nivel medido del lago, y que si los datos son de práctica no describen el lugar real. 5) No reemplazas a la autoridad ni a la medición de campo. 6) Responde en español claro, máximo 120 palabras, sin jerga ni emojis; si recomiendas acciones, da como máximo 3.'
    : 'You are the decision assistant of the “Trend Detectives” app (NASA Space Apps 2026, team The Innovators). You help authorities, farmers and students understand the water state of a lake or place and decide what to do.\nRules: 1) Answer ONLY from the JSON CONTEXT and from the SYSTEM CALCULATION if present; quote exact figures. 2) If something is not in the context, say you do not know and which data would be missing; never invent figures, causes or dates. 3) Distinguish association from cause. 4) Remember that rain minus evaporation is a climate index, not the measured lake level, and that practice data do not describe the real place. 5) You do not replace the authority or field measurement. 6) Answer in plain English, at most 120 words, no jargon or emojis; give at most 3 recommended actions.';
}

export function buildContext(A, tgt, clim, agent, lang) {
  const lv = ['tranquilo', 'vigilar', 'alerta'];
  return { lugar: { nombre: tgt.name, altitud_m: tgt.alt ?? null, area_km2: tgt.area ?? null, tipo: tgt.type ?? null }, datos: { reales: !!A.live, origen: clim.src, descargado: clim.when },
    semaforo: { nivel: lv[A.level], riesgo_0_100: A.risk, confianza_0_100: A.conf }, balance_12_meses_mm: Math.round(A.w.last), normal_mm: Math.round(A.w.normal), z_balance: +A.w.z.toFixed(2), z_temperatura: +A.t.z.toFixed(2), prob_anio_seco: +A.pDry.toFixed(2),
    tendencia: { mm_por_decada: Math.round(A.perDec), p_mann_kendall: +A.mk.p.toFixed(4) },
    futuros: A.scen.map((s) => ({ nombre: s.id === 'bad' ? 'peligroso (-15 % lluvia, +2.5 C)' : s.id === 'same' ? 'sin novedad' : 'tranquilo (+12 % lluvia)', balance_anual_mm: Math.round(s.r.val), rango_mm: [Math.round(s.r.lo), Math.round(s.r.hi)], prob_anio_seco: +s.r.dry.toFixed(2) })),
    alertas: A.alerts.map((a) => ({ nivel: lv[a.lv], titulo: a.t, porque: a.why, accion: a.act })), incertidumbre: A.unc.map((u) => ({ tipo: u.n, valor: u.v, detalle: u.why })), siguiente_observacion: A.obs.t,
    validacion_pronostico: A.bt ? { cobertura_90: +A.bt.coverage.toFixed(2), habilidad: +A.bt.skill.toFixed(2) } : null,
    centinela: agent?.rows ? { lagos_por_nivel: { tranquilo: agent.rows.filter((r) => r.level === 0).length, vigilar: agent.rows.filter((r) => r.level === 1).length, alerta: agent.rows.filter((r) => r.level === 2).length }, cambios_recientes: (agent.log || []).slice(0, 3) } : null };
}

async function post(url, init, ms = 60000) {
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { ...init, signal: ctl.signal }); if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`HTTP ${r.status} ${t.slice(0, 120)}`); } return await r.json(); } finally { clearTimeout(to); }
}
export async function askLLM(cfg, { question, history, ctx, calc, lang, sys: sysIn, raw }) {
  const sys = sysIn || systemPrompt(lang), user = raw ? question : `CONTEXTO:\n${JSON.stringify(ctx)}\n${calc ? `\n${lang === 'es' ? 'CÁLCULO DEL SISTEMA (úsalo tal cual)' : 'SYSTEM CALCULATION (use as is)'}: ${calc}\n` : ''}\n${lang === 'es' ? 'PREGUNTA' : 'QUESTION'}: ${question}`;
  const hist = history.slice(-6).map((m) => ({ role: m.me ? 'user' : 'assistant', content: m.text }));
  if (cfg.mode === 'online') {
    const j = await post('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ system: sys, messages: [...hist, { role: 'user', content: user }] }) }, 45000);
    if (!j?.text) throw new Error(j?.error || 'respuesta vacía'); return j.text;
  }
  if (cfg.mode === 'ollama') {
    const j = await post(`${cfg.ollamaUrl.replace(/\/$/, '')}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: cfg.ollamaModel, stream: false, options: { temperature: 0.2 }, messages: [{ role: 'system', content: sys }, ...hist, { role: 'user', content: user }] }) }, 120000);
    const t = j?.message?.content; if (!t) throw new Error('respuesta vacía'); return t.trim();
  }
  if (cfg.mode === 'claude') {
    if (!cfg.apiKey) throw new Error('falta la clave de la API');
    const j = await post('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: cfg.claudeModel, max_tokens: 700, temperature: 0.2, system: sys, messages: [...hist, { role: 'user', content: user }] }) });
    const t = j?.content?.map((c) => c.text).join('').trim(); if (!t) throw new Error('respuesta vacía'); return t;
  }
  throw new Error('modo sin modelo');
}

export function chartPrompt(lang) {
  return lang === 'es'
    ? 'Eres Killa, la guía de la app “Detectives de Tendencias”. Explicas gráficos a personas que no saben interpretarlos.\nResponde SOLO con los DATOS que te paso. Estructura en 3 frases cortas con estos rótulos: “Cómo se lee:” (qué hay en los ejes, qué significan las barras, líneas o colores), “Qué dice aquí:” (la conclusión con las cifras exactas) y “Ojo:” (qué NO se puede concluir o qué incertidumbre hay). Sin jerga: si usas un término técnico (p, tendencia significativa, z), explícalo en una frase. Máximo 120 palabras, sin emojis, sin inventar cifras.'
    : 'You are Killa, the guide of the “Trend Detectives” app. You explain charts to people who cannot read them.\nAnswer ONLY from the DATA given. Use 3 short sentences with these labels: “How to read it:” (axes, bars, lines or colours), “What it says here:” (the conclusion with exact figures) and “Careful:” (what can NOT be concluded or the uncertainty). No jargon: if you use a technical term (p, significant trend, z) explain it in one sentence. At most 120 words, no emojis, no invented figures.';
}
export async function explainChart({ title, facts, lang }) {
  const cfg = getCfg(); if (cfg.mode === 'rules') throw new Error('modo reglas');
  return askLLM(cfg, { question: `${lang === 'es' ? 'GRÁFICO' : 'CHART'}: ${title}\n${lang === 'es' ? 'DATOS' : 'DATA'}: ${facts}`, history: [], ctx: null, calc: null, lang, sys: chartPrompt(lang), raw: true });
}
