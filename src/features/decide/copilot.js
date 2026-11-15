/* Asistente local: entiende preguntas frecuentes y responde SOLO con las cifras ya calculadas en el navegador.
   No inventa datos ni usa un servidor. Para preguntas de “¿y si…?” recalcula el escenario al momento. */
import * as I from '../../lib/analysis/intel';
import { LV, SC, actions, scenText, similar } from './decideEngine';

const num = (s) => parseFloat(String(s).replace(',', '.'));
const has = (q, re) => re.test(q);
export function chips(L) { return [L('¿Por qué este nivel?', 'Why this level?'), L('¿Qué hago ahora?', 'What do I do now?'), L('¿Y si llueve 20 % menos?', 'What if rain drops 20 %?'), L('¿Y si sube 2 grados?', 'What if it warms 2 degrees?'), L('¿Qué tan confiable es?', 'How reliable is it?'), L('¿Qué medir después?', 'What to measure next?')]; }

export function reply(raw, ctx, L, lang) {
  const q = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''), { A, name, ann, sweep } = ctx; if (!A) return { text: L('Primero elige un lugar y espera el análisis.', 'First choose a place and wait for the analysis.') };
  const lv = LV[A.level][lang], who = name;
  // ¿y si…? con cifras
  const mp = q.match(/(\d+(?:[.,]\d+)?)\s*%/), mt = q.match(/(\d+(?:[.,]\d+)?)\s*(?:°|grados|degrees|c\b)/);
  if ((mp && has(q, /llov|lluvia|precip|rain/)) || (mt && has(q, /temp|calor|grado|caliente|warm|heat|sube|aument|rise/)) || (mp && has(q, /sec|seco|dry/))) {
    const sgnP = has(q, /menos|baja|disminu|cae|reduc|less|drop|fall|decre/) ? -1 : 1, sgnT = has(q, /baja|enfri|menos|cool|drop/) ? -1 : 1;
    const dP = mp ? sgnP * num(mp[1]) / 100 : 0, dT = mt ? sgnT * num(mt[1]) : 0, r = I.scenario(ann, { dP, dT }), d = Math.round(r.delta), bad = r.val < A.p10;
    return { text: L(`Si ${mp ? `la lluvia cambia ${dP > 0 ? '+' : ''}${Math.round(dP * 100)} %` : ''}${mp && mt ? ' y ' : ''}${mt ? `la temperatura cambia ${dT > 0 ? '+' : ''}${dT} °C` : ''}, el balance de agua anual de ${who} pasaría de ${Math.round(r.now)} a ${Math.round(r.val)} mm (${d >= 0 ? '+' : ''}${d} mm; rango probable ${Math.round(r.lo)} a ${Math.round(r.hi)} mm). ${bad ? 'Eso es peor que los años más secos de la historia.' : r.delta < 0 ? 'Sería menos agua, pero dentro de lo ya visto.' : 'No empeora el balance.'} En ${Math.round(r.dry * 100)} % de los años de la historia, con ese cambio, el balance caería a nivel de año seco.`, `If ${mp ? `rain changes ${dP > 0 ? '+' : ''}${Math.round(dP * 100)} %` : ''}${mp && mt ? ' and ' : ''}${mt ? `temperature changes ${dT > 0 ? '+' : ''}${dT} °C` : ''}, the annual water balance of ${who} would go from ${Math.round(r.now)} to ${Math.round(r.val)} mm (${d >= 0 ? '+' : ''}${d} mm; likely range ${Math.round(r.lo)} to ${Math.round(r.hi)} mm). ${bad ? 'That is worse than the driest years on record.' : r.delta < 0 ? 'Less water, but within what has been seen.' : 'The balance does not get worse.'} In ${Math.round(r.dry * 100)} % of historical years, with that change, the balance would fall to a dry-year level.`), note: L('Es un escenario condicional, no un pronóstico: supone que la evaporación sube 4 % por cada °C.', 'It is a conditional scenario, not a forecast: it assumes evaporation rises 4 % per °C.') };
  }
  if (has(q, /por que|motivo|razon|explica|why|reason|semaforo|nivel/)) {
    const top = A.alerts.filter((a) => a.lv > 0).slice(0, 3);
    return { text: L(`${who} está en nivel ${lv} (riesgo ${A.risk} de 100). ${top.length ? 'Pesan estas señales: ' + top.map((a) => a.t.toLowerCase() + ' (' + a.why.split('.')[0] + ')').join('; ') + '.' : 'Ninguna señal supera los umbrales: el balance de 12 meses está dentro de lo normal.'} La confianza del resultado es ${A.conf} de 100.`, `${who} is at level ${lv} (risk ${A.risk} of 100). ${top.length ? 'These signals weigh in: ' + top.map((a) => a.t.toLowerCase() + ' (' + a.why.split('.')[0] + ')').join('; ') + '.' : 'No signal exceeds the thresholds: the 12-month balance is within normal.'} Confidence in the result is ${A.conf} of 100.`) };
  }
  if (has(q, /que hago|que hacer|recomiend|accion|decid|aconsej|what do i|what should|recommend|action|do now/)) {
    const a = actions(A, L); return { text: L(`Para nivel ${lv}, lo primero: ${a.auth[0]} Después: ${a.auth[1]}`, `For level ${lv}, first: ${a.auth[0]} Then: ${a.auth[1]}`), note: L('Abajo tienes la lista completa según seas autoridad, agricultor o investigador.', 'Below is the full list depending on whether you are an authority, farmer or researcher.') };
  }
  if (has(q, /confi|segur|incert|fiable|trust|reliab|sure|uncertain/)) {
    const u = [...A.unc].sort((a, b) => b.v - a.v);
    return { text: L(`La confianza es ${A.conf} de 100. Lo que más la reduce: ${u[0].n.toLowerCase()} (${u[0].why}) y ${u[1].n.toLowerCase()} (${u[1].why})`, `Confidence is ${A.conf} of 100. What lowers it most: ${u[0].n.toLowerCase()} (${u[0].why}) and ${u[1].n.toLowerCase()} (${u[1].why})`) };
  }
  if (has(q, /medir|observ|falta|siguiente|despues|dato nuevo|measure|next|missing|observe/)) {
    return { text: L(`La observación que más reduciría la duda: ${A.obs.t}. ${A.obs.why}`, `The observation that would cut the doubt most: ${A.obs.t}. ${A.obs.why}`) };
  }
  const sc = (id) => A.scen.find((s) => s.id === id), say = (s) => { const t = scenText(s, A, L); return L(`${s.es}: el balance anual quedaría en ${t.v} mm (${t.rel}). ${t.head} Probabilidad de año seco bajo ese futuro: ${t.pDry} %.`, `${s.en}: the annual balance would be ${t.v} mm (${t.rel}). ${t.head} Dry-year probability under that future: ${t.pDry} %.`); };
  if (has(q, /peligro|extrem|peor|cataslt|worst|danger|extreme|bad/)) return { text: say(sc('bad')) };
  if (has(q, /nada|igual|sin cambio|continu|nothing|same|no change/)) return { text: say(sc('same')) };
  if (has(q, /tranquil|favorabl|mejor|calm|good|wet year/)) return { text: say(sc('good')) };
  if (has(q, /futuro|escenario|pasar|ocurr|prediccion|pronostic|future|scenario|happen|forecast|predict/)) return { text: [sc('bad'), sc('same'), sc('good')].map(say).join(' ') };
  if (has(q, /similar|parecid|otros lagos|comparable|like this|similar/)) {
    if (!sweep?.space) return { text: L('Para compararlo necesito analizar todos los lagos. Usa el botón “Analizar todos los lagos” en la sección Lenguaje de la Tierra.', 'To compare I need to analyse all lakes. Use the “Analyse all lakes” button in the Earth Language section.') };
    const i = sweep.rows.findIndex((r) => r.id === ctx.id); if (i < 0) return { text: L('Este lugar no está en el inventario de lagos.', 'This place is not in the lake inventory.') };
    const s = similar(sweep.space, sweep.rows, i, 3); return { text: L(`Los lagos más parecidos a ${who} en su perfil ambiental son ${s.map((o) => `${o.r.name} (${Math.round(o.s * 100)} % de similitud)`).join(', ')}.`, `The lakes most similar to ${who} in environmental profile are ${s.map((o) => `${o.r.name} (${Math.round(o.s * 100)} % similarity)`).join(', ')}.`) };
  }
  if (has(q, /dato|fuente|origen|de donde|source|data|where from/)) return { text: A.live ? L('Uso NASA POWER (MERRA-2 y CERES): lluvia, evaporación de superficie y temperatura mensuales desde 1981, para el punto exacto. Todo se calcula en tu navegador.', 'I use NASA POWER (MERRA-2 and CERES): monthly rain, land evaporation and temperature since 1981 for the exact point. Everything is computed in your browser.') : L('Ahora mismo uso datos de práctica simulados, no mediciones. Apaga “Práctica” en la barra superior para usar NASA POWER.', 'Right now I use simulated practice data, not measurements. Turn off “Practice” in the top bar to use NASA POWER.') };
  if (has(q, /anomal/)) return { text: L('Una anomalía es un valor inusual para este lugar y esta época del año, no simplemente alto o bajo. Se mide en σ: cuántas desviaciones se aleja de lo normal.', 'An anomaly is a value unusual for this place and time of year, not just high or low. It is measured in σ: how many deviations from normal.') };
  if (has(q, /balance|evapora/)) return { text: L('El balance de agua es lluvia menos evaporación en un periodo. Si es negativo, sale más agua de la que entra. Es un índice climático: no mide el nivel del lago.', 'Water balance is rain minus evaporation over a period. If negative, more water leaves than arrives. It is a climate index: it does not measure the lake level.') };
  if (has(q, /valor p|p valor|p-valor|p value|significativ/)) return { text: L('Un valor p pequeño indica que un resultado tan extremo como el observado sería poco frecuente bajo el supuesto de que no hay tendencia. No mide la probabilidad de que la hipótesis sea cierta ni la importancia práctica del cambio.', 'A small p-value indicates that a result as extreme as the one observed would be rare under the assumption that there is no trend. It is not the probability that the hypothesis is true, nor the practical importance of the change.') };
  if (has(q, /^(hola|buenas|hi|hello|ayuda|help)/)) return { text: L(`Hola. Puedo explicarte el nivel de ${who}, comparar tres futuros, calcular un “¿y si…?” con tus cifras (por ejemplo “si llueve 25 % menos”) y decirte qué hacer y qué medir después.`, `Hi. I can explain the level of ${who}, compare three futures, compute a “what if…?” with your numbers (for example “if rain drops 25 %”) and tell you what to do and what to measure next.`) };
  return { text: L('No entendí esa pregunta. Puedo responder sobre el nivel, los tres futuros, qué hacer, la confianza, qué medir después, los datos, lagos parecidos, o un “¿y si…?” con cifras (por ejemplo “si llueve 30 % menos”).', 'I did not understand that question. I can answer about the level, the three futures, what to do, confidence, what to measure next, the data, similar lakes, or a “what if…?” with numbers (for example “if rain drops 30 %”).'), miss: true };
}
