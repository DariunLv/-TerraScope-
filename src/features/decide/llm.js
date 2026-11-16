/* Asistente con modelo de lenguaje REAL, opcional y bajo control del usuario.
   Modos: 'online' (función /api/chat de Vercel con modelo gratuito) · 'rules' (reglas locales, sin red) · 'ollama' (modelo en tu propio computador, gratis y sin internet) · 'claude' (API de Anthropic con tu clave).
   El modelo solo recibe un resumen numérico del análisis (CONTEXTO) y tiene prohibido inventar datos. Si falla, se responde con reglas. */
import { decisionStatements, unverifiedStatements } from './evidence';
const KEY = 'ts_llm_v1', DEF = { mode: 'online', ollamaUrl: 'http://localhost:11434', ollamaModel: 'llama3.2', apiKey: '', claudeModel: 'claude-sonnet-5-5' };
export const getCfg = () => {
  try { const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (saved.apiKey) { sessionStorage.setItem(KEY + ':key', saved.apiKey); delete saved.apiKey; localStorage.setItem(KEY, JSON.stringify(saved)); }
    return { ...DEF, ...saved, apiKey: sessionStorage.getItem(KEY + ':key') || '' };
  } catch { return { ...DEF }; }
};
export const setCfg = (configuration) => { try { const { apiKey, ...settings } = configuration; localStorage.setItem(KEY, JSON.stringify(settings)); if (apiKey) sessionStorage.setItem(KEY + ':key', apiKey); else sessionStorage.removeItem(KEY + ':key'); } catch { /* sin espacio */ } };

export function systemPrompt(lang) {
  return lang === 'es'
    ? 'Eres Killa, la mascota satélite y asistente de decisiones de la app “Detectives de Tendencias” (equipo The Innovators YF). Ayudas a autoridades, agricultores y estudiantes a entender el estado del agua de un lago o lugar y a decidir qué hacer.\nReglas: 1) Responde SOLO con base en el CONTEXTO JSON y en el CÁLCULO DEL SISTEMA si lo hay; cita cifras exactas y, con cada una, di qué es y su periodo o fuente (por ejemplo “balance de 12 meses, NASA POWER”). Nunca digas “agua suficiente”: es un balance climático de lluvia menos evaporación, no el nivel del cuerpo de agua. Si el estado reciente es normal pero la simulación da riesgo alto para el próximo año, di las dos cosas juntas. 2) Si algo no está en el contexto, di que no lo sabes y qué dato faltaría; nunca inventes cifras, causas ni fechas. 3) Distingue asociación de causa. 4) Recuerda que el balance lluvia menos evaporación es un índice climático, no el nivel medido del lago, y que si los datos son de práctica no describen el lugar real. 5) No reemplazas a la autoridad ni a la medición de campo. 6) Responde SOLO en español claro, máximo 110 palabras, sin jerga ni emojis; texto plano SIN markdown (no uses ** ni # ni tablas ni barras |; para comparar futuros usa una línea por futuro empezando con “- ”); 1 o 2 párrafos cortos, y si das acciones, una por línea empezando con “- ”; si recomiendas acciones, da como máximo 3.'
    : 'You are Killa, the satellite mascot and decision assistant of the “Trend Detectives” app (team The Innovators YF). You help authorities, farmers and students understand the water state of a lake or place and decide what to do.\nRules: 1) Answer ONLY from the JSON CONTEXT and from the SYSTEM CALCULATION if present; quote exact figures and, with each one, say what it is and its period or source (for example “12-month balance, NASA POWER”). Never say “enough water”: it is a climate balance of rain minus evaporation, not the water body level. If the recent state is normal but the simulation gives high risk for next year, state both together. 2) If something is not in the context, say you do not know and which data would be missing; never invent figures, causes or dates. 3) Distinguish association from cause. 4) Remember that rain minus evaporation is a climate index, not the measured lake level, and that practice data do not describe the real place. 5) You do not replace the authority or field measurement. 6) Reply ONLY in English (the JSON keys and some labels are in Spanish: translate them, never copy Spanish words), in plain English, at most 110 words, no jargon or emojis; plain text WITHOUT markdown (no ** or # or tables or | bars; to compare futures use one line per future starting with “- ”); 1 or 2 short paragraphs, and if you give actions put one per line starting with “- ”; give at most 3 recommended actions.';
}

export function buildContext(A, tgt, clim, agent, lang, coh) {
  const en = lang !== 'es', lv = en ? ['calm', 'watch', 'alert'] : ['tranquilo', 'vigilar', 'alerta'];
  return { cifras_verificadas: decisionStatements(A, clim, lang), idioma_de_respuesta: en ? 'English' : 'español', lugar: { nombre: tgt.name, altitud_m: tgt.alt ?? null, area_km2: tgt.area ?? null, tipo: tgt.type ?? null }, datos: { reales: !!A.live, origen: clim.src, descargado: clim.when, periodo: clim.coverage, desactualizados: !!clim.stale },
    semaforo: { nivel: lv[A.level], riesgo_0_100: A.risk, confianza_0_100: A.conf }, balance_12_meses_mm: Math.round(A.w.last), normal_mm: Math.round(A.w.normal), z_balance: +A.w.z.toFixed(2), z_temperatura: +A.t.z.toFixed(2), prob_anio_seco: +A.pDry.toFixed(2),
    tendencia: { mm_por_decada: Math.round(A.perDec), p_mann_kendall: +A.mk.p.toFixed(4) },
    futuros: A.scen.map((s) => ({ nombre: en ? (s.id === 'bad' ? 'dangerous (-15 % rain, +2.5 C)' : s.id === 'same' ? 'business as usual' : 'calm (+12 % rain)') : (s.id === 'bad' ? 'peligroso (-15 % lluvia, +2.5 C)' : s.id === 'same' ? 'sin novedad' : 'tranquilo (+12 % lluvia)'), balance_anual_mm: Math.round(s.r.val), rango_mm: [Math.round(s.r.lo), Math.round(s.r.hi)], prob_anio_seco: +s.r.dry.toFixed(2) })),
    alertas: A.alerts.map((a) => ({ nivel: lv[a.lv], titulo: a.t, porque: a.why, accion: a.act })), incertidumbre: A.unc.map((u) => ({ tipo: u.n, valor: u.v, detalle: u.why })), siguiente_observacion: A.obs.t,
    validacion_pronostico: A.bt ? { cobertura_90: +A.bt.coverage.toFixed(2), habilidad: +A.bt.skill.toFixed(2) } : null,
    contradicciones_entre_vistas: (coh || []).map((c) => c.t),
    centinela: agent?.rows ? { lagos_por_nivel: { tranquilo: agent.rows.filter((r) => r.level === 0).length, vigilar: agent.rows.filter((r) => r.level === 1).length, alerta: agent.rows.filter((r) => r.level === 2).length }, cambios_recientes: (agent.log || []).slice(0, 3) } : null };
}


/* Verificador de cifras: la IA solo puede citar números que la app calculó. Si cita uno que no está en el contexto, se descarta su respuesta. */
const NUM = /(?<![\w.])[-+−–]?\d+(?:[.,]\d+)?/g, NUMS = /(?<![\w.])[-+−–]?\d+(?:\.\d+)?/g; // en las fuentes la coma separa elementos (JSON), no decimales
const toN = (x) => parseFloat(String(x).replace(/[−–]/g, '-').replace(',', '.'));
const COMMON = [0.05, 0.01, 0.1, 0.9, 10, 90, 95, 99, 100, 1.5, 2.5, 12, 24, 50, 500, 30, 60];
export function unverifiedNumbers(answer, sources, arith = false) {
  const allowed = new Set(COMMON), base = []; (String(sources).match(NUMS) || []).forEach((m) => { const v = toN(m); if (Number.isFinite(v)) { allowed.add(v); allowed.add(v * 100); allowed.add(v / 100); base.push(v); } });
  if (arith) { const b = [...new Set(base)].slice(0, 60); b.forEach((x, i) => b.slice(i + 1).forEach((y) => { allowed.add(Math.abs(x - y)); allowed.add((x + y) / 2); if (x && y) { allowed.add(x / y); allowed.add(y / x); allowed.add(Math.abs(x - y) / Math.max(x, y) * 100); } })); }
  const A = [...allowed], bad = [];
  (String(answer).replace(/(\d)[\s,](?=\d{3}\b)/g, '$1').match(NUM) || []).forEach((m) => {
    const raw = m.replace(/^[+]/, ''), v = toN(m); if (!Number.isFinite(v)) return;
    const dec = (raw.split(/[.,]/)[1] || '').length;
    if (dec === 0 && ((v >= 0 && v <= 10) || (v >= 1900 && v <= 2100))) return; // conteos, listas y años positivos
    const f = 10 ** dec; if (A.some((a) => Math.abs(Math.round(a * f) / f - v) < 1e-9 || Math.abs(a - v) < 1e-9 || (dec > 0 && Math.abs(a - v) <= 1.0001 / f))) return;
    bad.push(m);
  });
  return [...new Set(bad)];
}

async function post(url, init, ms = 60000) {
  init.signal?.throwIfAborted();
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), ms);
  const abort = () => ctl.abort(init.signal.reason); init.signal?.addEventListener('abort', abort, { once: true });
  try {
    const response = await fetch(url, { ...init, signal: ctl.signal });
    const data = await response.json().catch(() => null);
    if (!response.ok) { const error = new Error('AI request failed'); error.status = response.status; error.code = data?.code; throw error; }
    if (!data) { const error = new Error('Invalid AI response'); error.code = 'AI_UNAVAILABLE'; throw error; }
    return data;
  } finally { clearTimeout(to); init.signal?.removeEventListener('abort', abort); }
}
export function llmErrorMessage(error, lang) {
  const L = (es, en) => lang === 'es' ? es : en;
  if (error?.code === 'AI_AUTH') return L('La conexión de Groq necesita revisar su clave en Vercel.', 'The Groq connection needs its key checked in Vercel.');
  if (error?.code === 'AI_CONFIG' || error?.status === 501) return L('Falta configurar Groq en el servidor. Revisa GROQ_API_KEY en Vercel.', 'Groq has not been configured on the server. Check GROQ_API_KEY in Vercel.');
  if (error?.status === 429) return L('Se alcanzó el límite de consultas. Espera un momento y vuelve a intentarlo.', 'The request limit was reached. Wait a moment and try again.');
  if (error?.code === 'AI_UNVERIFIED') return L('La explicación no conservó correctamente las cifras del análisis y se descartó.', 'The explanation did not preserve the analysis figures correctly and was discarded.');
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError' || error?.status === 504) return L('La IA tardó demasiado en responder. Puedes volver a intentarlo.', 'The AI took too long to respond. You can try again.');
  return L('No se pudo conectar con la IA en este momento. Vuelve a intentarlo.', 'Could not reach the AI right now. Please try again.');
}
async function askRaw(cfg, { question, history, ctx, calc, lang, sys: sysIn, raw, signal }) {
  const evidenceRule = ctx?.cifras_verificadas ? (lang === 'es' ? '\nCada afirmación que contenga cifras debe copiar literalmente una entrada completa de cifras_verificadas, con su variable, unidad, periodo y fuente. No añadas otras cifras ni cambies las etiquetas. Puedes explicar y recomendar sin cifras. Si el cálculo solicitado no está en esa lista, explica que se necesita consultar el cálculo local.' : '\nEvery quantitative statement must copy one complete entry from cifras_verificadas verbatim, including metric, unit, period and source. Add no other numbers and do not change labels. You may explain and recommend without numbers. If a requested calculation is absent from this list, explain that the local calculation is needed.') : '';
  const sys = (sysIn || systemPrompt(lang)) + evidenceRule, user = raw ? question : `CONTEXTO:\n${JSON.stringify(ctx)}\n${calc ? `\n${lang === 'es' ? 'CÁLCULO DEL SISTEMA (úsalo tal cual)' : 'SYSTEM CALCULATION (use as is)'}: ${calc}\n` : ''}\n${lang === 'es' ? 'PREGUNTA' : 'QUESTION'}: ${question}`;
  const hist = history.slice(-6).map((m) => ({ role: m.me ? 'user' : 'assistant', content: m.text }));
  if (cfg.mode === 'online') {
    const j = await post('/api/chat', { signal, method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ provider: 'groq', system: sys, messages: [...hist, { role: 'user', content: user }] }) }, 45000);
    if (!j?.text) throw new Error(j?.error || 'respuesta vacía'); return j.text;
  }
  if (cfg.mode === 'ollama') {
    const j = await post(`${cfg.ollamaUrl.replace(/\/$/, '')}/api/chat`, { signal, method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: cfg.ollamaModel, stream: false, options: { temperature: 0.2 }, messages: [{ role: 'system', content: sys }, ...hist, { role: 'user', content: user }] }) }, 120000);
    const t = j?.message?.content; if (!t) throw new Error('respuesta vacía'); return t.trim();
  }
  if (cfg.mode === 'claude') {
    if (!cfg.apiKey) throw new Error('falta la clave de la API');
    const j = await post('https://api.anthropic.com/v1/messages', { signal, method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: cfg.claudeModel, max_tokens: 700, temperature: 0.2, system: sys, messages: [...hist, { role: 'user', content: user }] }) });
    const t = j?.content?.map((c) => c.text).join('').trim(); if (!t) throw new Error('respuesta vacía'); return t;
  }
  throw new Error('modo sin modelo');
}

export async function askLLM(cfg, args) {
  const text = await askRaw(cfg, args);
  if (args.noVerify) return text;
  if (args.ctx?.cifras_verificadas && unverifiedStatements(text, args.ctx.cifras_verificadas)) throw Object.assign(new Error(args.lang === 'es' ? 'La respuesta no conservó la variable, unidad o periodo de las cifras; se descartó' : 'The answer did not preserve the figures’ metric, unit or period; it was discarded'), { code: 'AI_UNVERIFIED' });
  const src = `${args.sys || systemPrompt(args.lang)} ${JSON.stringify(args.ctx || '')} ${args.calc || ''} ${args.question || ''}`;
  const bad = unverifiedNumbers(text, src, !!args.raw);
  if (bad.length) throw Object.assign(new Error(args.lang === 'es' ? `Killa citó cifras que la app no calculó (${bad.slice(0, 4).join(', ')}); se descartó esa respuesta` : `Killa quoted figures the app did not compute (${bad.slice(0, 4).join(', ')}); that answer was discarded`), { code: 'AI_UNVERIFIED' });
  return text;
}

const AUDP = { auth: ['una autoridad que decide políticas o alertas', 'an authority who decides policies or alerts'], farm: ['un agricultor o criador que decide siembra, riego o pastoreo', 'a farmer or herder who decides sowing, irrigation or grazing'], sci: ['una persona estudiante o investigadora que quiere saber qué probar después', 'a student or researcher who wants to know what to test next'] };
export function chartPrompt(lang, aud) {
  const au = AUDP[aud];
  return lang === 'es'
    ? `Eres Killa, la guía de la app TerraScope. Explicas gráficos a cualquier persona, aunque nunca haya visto uno. Hablas como a alguien de 12 años: palabras simples, ejemplos cotidianos.${au ? ` Quien lee es ${au[0]}: adapta el ejemplo y la utilidad a esa persona.` : ''}\nResponde SOLO en español y SOLO con los DATOS que te paso. Usa estos 5 rótulos, uno por párrafo corto: “Qué es:” (de qué trata el gráfico en una frase), “Cómo se lee:” (qué hay en cada eje, qué significan las líneas, barras, puntos o colores, y dónde mirar primero), “Qué dice aquí:” (la conclusión con las cifras exactas, comparando con algo conocido), “Por qué importa:” (qué cambia para una persona o decisión real) y “Ojo:” (qué NO se puede concluir). Si usas un término técnico (p, tendencia significativa, z, anomalía) explícalo en una frase. Máximo 170 palabras, texto plano sin markdown (sin ** ni #), sin emojis, sin inventar cifras: cita solo números de los DATOS.`
    : `You are Killa, the guide of the TerraScope app. You explain charts to anyone, even someone who has never read one. You talk as to a 12-year-old: simple words, everyday examples.${au ? ` The reader is ${au[1]}: adapt the example and usefulness to that person.` : ''}\nReply ONLY in English. Answer ONLY from the DATA given. Use these 5 labels, one short paragraph each: “What it is:” (what the chart is about in one sentence), “How to read it:” (what each axis shows, what the lines, bars, dots or colours mean, and where to look first), “What it says here:” (the conclusion with exact figures, compared with something familiar), “Why it matters:” (what changes for a real person or decision) and “Careful:” (what can NOT be concluded). If you use a technical term (p, significant trend, z, anomaly) explain it in one sentence. At most 170 words, plain text without markdown, no emojis, no invented figures: quote only numbers from the DATA.`;
}
export async function explainChart({ title, facts, lang, aud, kind = 'chart', signal }) {
  const cfg = getCfg(); if (cfg.mode === 'rules') throw new Error('modo reglas');
  const label = kind === 'table' ? (lang === 'es' ? 'TABLA' : 'TABLE') : kind === 'result' ? (lang === 'es' ? 'RESULTADO' : 'RESULT') : (lang === 'es' ? 'GRÁFICO' : 'CHART');
  const instruction = kind === 'table' ? (lang === 'es' ? '\nExplica filas, columnas, unidades y periodo de esta tabla. No inventes ejes, líneas ni registros no incluidos.' : '\nExplain rows, columns, units and period in this table. Do not invent axes, lines or omitted records.') : '';
  return askLLM(cfg, { signal, question: `${label}: ${title}\n${lang === 'es' ? 'DATOS' : 'DATA'}: ${facts}`, history: [], ctx: null, calc: null, lang, sys: chartPrompt(lang, aud) + instruction, raw: true });
}
