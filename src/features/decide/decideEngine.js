/* Motor de decisión (todo en el navegador): convierte series de la NASA en un semáforo, tres futuros posibles,
   alertas con su evidencia, nivel de confianza y la siguiente observación que más reduciría la duda.
   Método: normalidad contextual (z robusto de 12 meses), pronóstico por simulación (tendencia + estación + AR(1)),
   escenarios condicionales de lluvia y temperatura, y señales de alerta temprana (varianza y autocorrelación).
   No es un sistema operativo de emergencias: es apoyo para priorizar y decidir con evidencia. */
import * as I from '../../lib/analysis/intel';
import { mannKendall, senSlope, ols, mean } from '../../lib/analysis/stats';
import { last12 } from '../lakes/lakeclim';
import { km, SAMPLE_POINTS } from '../lakes/lakesData';

export const LV = [{ es: 'Tranquilo', en: 'Calm', c: '#0c7a5b' }, { es: 'Vigilar', en: 'Watch', c: '#d97706' }, { es: 'Alerta', en: 'Alert', c: '#b91c1c' }];
const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const quant = (s, q) => { const p = (s.length - 1) * q, i = Math.floor(p), f = p - i; return s[i + 1] !== undefined ? s[i] * (1 - f) + s[i + 1] * f : s[i]; };
export const SC = [
  { id: 'bad', es: 'Sequía y calor', en: 'Drought and heat', sub: ['Si ocurre algo peligroso: sequía y calor extremos', 'If something dangerous happens: severe drought and heat'], p: { dT: 2.5, dP: -0.15 }, c: '#b91c1c' },
  { id: 'same', es: 'Clima reciente', en: 'Recent climate', sub: ['Si no ocurre nada nuevo: se repite el clima de los últimos años', 'If nothing new happens: the climate of recent years repeats'], p: { dT: 0, dP: 0 }, c: '#1e3a8a' },
  { id: 'good', es: 'Año húmedo', en: 'Wet year', sub: ['Si todo está tranquilo: más lluvia que lo normal', 'If all stays calm: more rain than normal'], p: { dT: 0, dP: 0.12 }, c: '#0c7a5b' },
];

/* Evaluación completa de un punto o lago. `clim` viene de lakeClimate(). */
export function assess(clim, tgt, L, points = SAMPLE_POINTS) {
  const wbp = clim.wb, ann = clim.ann, w = last12(wbp, 'sum'), t = last12(clim.d.T2M, 'mean');
  if (!w || !t || ann.length < 12) return null;
  const awb = ann.map((a) => a.wb), mk = mannKendall(awb), yrs = ann.map((a) => a.year), sen = senSlope(yrs, awb, mk.varS), ol = ols(yrs, awb), perDec = sen.slope * 10;
  const sim = I.simulate(wbp, { years: 1, B: 500 }), a0 = sim.ann[0], mu = a0.q50 * 12, sg = Math.max(1e-6, ((a0.q95 - a0.q05) * 12) / 3.29);
  const sorted = [...awb].sort((x, y) => x - y), p10 = quant(sorted, 0.1), pDry = I.phi((p10 - mu) / sg);
  const bt = I.backtest(wbp, 5), ew = I.earlyWarning(wbp, { surr: 120 });
  const trendDry = mk.p < 0.1 && perDec < 0, trendWet = mk.p < 0.1 && perDec > 0;
  const wet = w.z >= 2;
  const risk = Math.round(100 * (0.4 * cl(-w.z / 3) + 0.15 * cl(t.z / 3) + 0.25 * cl((pDry - 0.1) / 0.5) + 0.2 * cl(-mk.tau * 2) * (trendDry ? 1 : 0.35)));
  let level = risk >= 50 ? 2 : risk >= 25 ? 1 : 0; if (wet) level = Math.max(level, w.z >= 3 ? 2 : 1);
  const kind = wet ? 'wet' : level > 0 ? 'dry' : 'ok';
  const near = points.length ? Math.min(...points.map((p) => km(tgt, p))) : 999;
  const years = ann.length, live = !!clim.live;
  const cd = live ? 1 : 0.25, cs = cl(years / 40), cc = cl(1 - near / 160), cm = bt ? 0.6 * cl(bt.coverage / 0.9) + 0.4 * cl(0.4 + bt.skill) : 0.4;
  const conf = Math.round(100 * (0.3 * cd + 0.15 * cs + 0.25 * cc + 0.3 * cm));
  const small = (tgt.area ?? 100) < 60, agree = (mk.p < 0.1) === (ol.p < 0.1) && Math.sign(sen.slope) === Math.sign(ol.slope);
  const unc = [
    { k: 'data', v: Math.round(100 * (1 - cd)), n: L('Incertidumbre de los datos', 'Data uncertainty'), why: live ? L('Datos reales de NASA POWER.', 'Real NASA POWER data.') : L('Datos de práctica simulados: no son mediciones.', 'Simulated practice data: not measurements.') },
    { k: 'obs', v: Math.round(100 * (1 - cc)), n: L('Falta de observaciones', 'Lack of observations'), why: L(`El punto de monitoreo más cercano está a ${Math.round(near)} km.`, `The nearest monitoring point is ${Math.round(near)} km away.`) },
    { k: 'model', v: Math.round(100 * (1 - cm)), n: L('Incertidumbre del modelo', 'Model uncertainty'), why: bt ? L(`Validado con los últimos 5 años: el rango acertó el ${Math.round(bt.coverage * 100)} % de los meses (ideal 90 %).`, `Validated on the last 5 years: the range was right ${Math.round(bt.coverage * 100)} % of months (ideal 90 %).`) : L('Serie corta: no se pudo validar.', 'Short series: could not be validated.') },
    { k: 'extra', v: small ? 70 : 25, n: L('Extrapolación geográfica', 'Geographic extrapolation'), why: small ? L('El lago es pequeño frente a la celda del modelo climático (unos 50 km).', 'The lake is small compared with the climate-model cell (about 50 km).') : L('El lago es grande frente a la celda del modelo (unos 50 km).', 'The lake is large compared with the model cell (about 50 km).') },
    { k: 'dis', v: agree ? 15 : 60, n: L('Desacuerdo entre métodos', 'Disagreement between methods'), why: agree ? L('Mann-Kendall y regresión coinciden sobre la tendencia.', 'Mann-Kendall and regression agree on the trend.') : L('Mann-Kendall y regresión no coinciden: la tendencia es dudosa.', 'Mann-Kendall and regression disagree: the trend is doubtful.') },
  ];
  const scen = SC.map((s) => ({ ...s, r: I.scenario(ann, s.p) }));
  const alerts = [];
  if (w.z <= -1.5) alerts.push({ lv: w.z <= -2.5 ? 2 : 1, t: L('Balance de agua por debajo de lo normal', 'Water balance below normal'), why: L(`Los últimos 12 meses dieron ${Math.round(w.last)} mm de balance (lluvia menos evaporación); lo normal para este lugar sería ${Math.round(w.normal)} mm (${w.z.toFixed(1)} σ).`, `The last 12 months gave ${Math.round(w.last)} mm of balance (rain minus evaporation); normal here would be ${Math.round(w.normal)} mm (${w.z.toFixed(1)} σ).`), act: L('Priorizar el ahorro de agua y revisar reservas antes de la próxima época seca.', 'Prioritise saving water and check reserves before the next dry season.') });
  if (wet) alerts.push({ lv: w.z >= 3 ? 2 : 1, t: L('Exceso de agua respecto a lo normal', 'Excess water compared with normal'), why: L(`El balance de 12 meses fue ${Math.round(w.last)} mm, muy por encima de lo normal (${Math.round(w.normal)} mm; ${w.z.toFixed(1)} σ).`, `The 12-month balance was ${Math.round(w.last)} mm, far above normal (${Math.round(w.normal)} mm; ${w.z.toFixed(1)} σ).`), act: L('Revisar cauces, drenaje y zonas bajas; coordinar con Defensa Civil.', 'Check channels, drainage and low areas; coordinate with civil protection.') });
  if (t.z >= 1.5) alerts.push({ lv: t.z >= 2.5 ? 2 : 1, t: L('Temperatura por encima de lo normal', 'Temperature above normal'), why: L(`Los últimos 12 meses promediaron ${t.last.toFixed(1)} °C; lo esperable era ${t.normal.toFixed(1)} °C (${t.z.toFixed(1)} σ). Más calor aumenta la evaporación.`, `The last 12 months averaged ${t.last.toFixed(1)} °C; expected ${t.normal.toFixed(1)} °C (${t.z.toFixed(1)} σ). More heat raises evaporation.`), act: L('Vigilar la evaporación y la demanda de agua para riego.', 'Watch evaporation and irrigation water demand.') });
  if (trendDry) alerts.push({ lv: 1, t: L('Tendencia de secado en el largo plazo', 'Long-term drying trend'), why: L(`El balance anual cambia ${Math.round(perDec)} mm por década (p = ${mk.p < 0.001 ? '< 0.001' : mk.p.toFixed(3)}).`, `The annual balance changes ${Math.round(perDec)} mm per decade (p = ${mk.p < 0.001 ? '< 0.001' : mk.p.toFixed(3)}).`), act: L('Planificar a 10 años: almacenamiento, eficiencia y cultivos tolerantes.', 'Plan 10 years ahead: storage, efficiency and tolerant crops.') });
  if (pDry >= 0.2) alerts.push({ lv: pDry >= 0.4 ? 2 : 1, t: L('Riesgo de un año seco', 'Risk of a dry year'), why: L(`La simulación da ${Math.round(pDry * 100)} % de probabilidad de que el próximo año sea de los más secos de la historia (lo normal es 10 %).`, `The simulation gives a ${Math.round(pDry * 100)} % chance that next year is among the driest on record (normal is 10 %).`), act: L('Preparar un plan de contingencia y avisar a los usuarios del agua.', 'Prepare a contingency plan and warn water users.') });
  if (ew && (ew.pVar < 0.05 || ew.pAc < 0.05)) alerts.push({ lv: 1, t: L('Señales de pérdida de estabilidad', 'Signs of lost stability'), why: L(`La variabilidad o la memoria del balance están subiendo de forma poco común (p = ${Math.min(ew.pVar, ew.pAc).toFixed(3)}). No prueba un colapso, pero pide vigilancia.`, `The variability or memory of the balance is rising unusually (p = ${Math.min(ew.pVar, ew.pAc).toFixed(3)}). It does not prove a collapse, but calls for monitoring.`), act: L('Aumentar la frecuencia de observación y confirmar en campo.', 'Increase observation frequency and confirm in the field.') });
  if (near > 100) alerts.push({ lv: 1, t: L('Poca evidencia terrestre cerca', 'Little ground evidence nearby'), why: L(`No hay un punto de monitoreo a menos de ${Math.round(near)} km: la conclusión depende casi solo del satélite.`, `There is no monitoring point within ${Math.round(near)} km: the conclusion depends almost only on satellites.`), act: L('Buscar una estación cercana o programar una medición de campo.', 'Find a nearby station or schedule a field measurement.') });
  if (!live) alerts.push({ lv: 1, t: L('Estás viendo datos de práctica', 'You are viewing practice data'), why: L('El modo práctica simula series para probar sin internet. Las cifras no describen el lugar real.', 'Practice mode simulates series to test offline. The figures do not describe the real place.'), act: L('Apaga “Práctica” en la barra superior para usar NASA POWER.', 'Turn off “Practice” in the top bar to use NASA POWER.') });
  if (tgt.type === 'glaciar') alerts.push({ lv: 0, t: L('Lago de origen glaciar', 'Glacial lake'), why: L('Estos lagos pueden cambiar de golpe por desprendimientos de hielo; el clima mensual no lo detecta.', 'These lakes can change suddenly from ice avalanches; monthly climate cannot detect it.'), act: L('Complementar con radar (Sentinel-1) e imágenes de alta resolución.', 'Complement with radar (Sentinel-1) and high-resolution imagery.') });
  alerts.sort((a, b) => b.lv - a.lv);
  const worst = [...unc].sort((a, b) => b.v - a.v)[0];
  const obs = nextObs(worst.k, { near, small, live, tgt }, L);
  return { w, t, mk, perDec, mu, sg, p10, pDry, bt, ew, risk, level, kind, near, years, live, conf, unc, scen, alerts, worst, obs, sim, trendDry, trendWet };
}

/* ¿Qué observación nueva reduciría más la incertidumbre? */
function nextObs(k, c, L) {
  const m = {
    data: [L('Conectar a internet y usar NASA POWER real', 'Go online and use real NASA POWER'), L('Sin datos reales no hay conclusión: es la mejora más grande.', 'Without real data there is no conclusion: this is the biggest improvement.')],
    obs: [L('Consultar una estación meteorológica cercana', 'Consult a nearby weather station'), L('Una estación a menos de 60 km o una medición de nivel en campo reduce más la duda que otro satélite.', 'A station within 60 km or a field level reading cuts the doubt more than another satellite.')],
    model: [L('Contrastar con una segunda fuente (IMERG para lluvia)', 'Cross-check with a second source (IMERG for rain)'), L('Si dos fuentes independientes coinciden, la confianza sube.', 'If two independent sources agree, confidence rises.')],
    extra: [L('Medir la superficie del lago con radar Sentinel-1 u OPERA DSWx (30 m)', 'Measure the lake surface with Sentinel-1 radar or OPERA DSWx (30 m)'), L('Mide el lago mismo, no solo el clima de la zona, y atraviesa las nubes.', 'It measures the lake itself, not only the area climate, and sees through clouds.')],
    dis: [L('Ampliar la serie o validar con otro método', 'Extend the series or validate with another method'), L('Los métodos no coinciden: hace falta más historia.', 'The methods disagree: more history is needed.')],
  };
  return { k, t: m[k][0], why: m[k][1] };
}

/* ¿Qué hacer? según nivel y tipo de problema y según quién decide. */
export function actions(A, L) {
  const dry = A.kind === 'dry', wet = A.kind === 'wet', lv = A.level;
  if (lv === 0) return {
    auth: [L('Mantener el monitoreo mensual y registrar esta línea base.', 'Keep monthly monitoring and record this baseline.'), L('Revisar la cobertura de puntos de medición del territorio.', 'Review the measurement-point coverage of the territory.'), L('Usar este periodo tranquilo para actualizar el inventario oficial.', 'Use this calm period to update the official inventory.')],
    farm: [L('Seguir el calendario habitual de siembra y riego.', 'Follow the usual sowing and irrigation calendar.'), L('Guardar registros de lluvia y nivel: sirven para detectar cambios.', 'Keep rain and level records: they help detect change.'), L('Aprovechar para reparar canales y reservorios.', 'Use the time to repair channels and reservoirs.')],
    sci: [L('Ampliar la serie con una segunda fuente y validar en campo.', 'Extend the series with a second source and validate in the field.'), L('Registrar el pasaporte de evidencia de este resultado.', 'Record the evidence passport of this result.')],
  };
  if (wet) return {
    auth: [L('Activar vigilancia de cauces y zonas bajas.', 'Activate monitoring of channels and low-lying areas.'), L('Coordinar con Defensa Civil y emitir aviso preventivo.', 'Coordinate with civil protection and issue a preventive notice.'), L('Revisar la capacidad de embalses y compuertas.', 'Check reservoir and gate capacity.')],
    farm: [L('Proteger cultivos y ganado en zonas inundables.', 'Protect crops and livestock in flood-prone areas.'), L('Limpiar zanjas y drenajes antes de la próxima lluvia.', 'Clean ditches and drains before the next rain.')],
    sci: [L('Contrastar con IMERG y nivel en campo para confirmar.', 'Cross-check with IMERG and field level to confirm.'), L('Medir el área de agua con radar Sentinel-1.', 'Measure the water area with Sentinel-1 radar.')],
  };
  return {
    auth: [lv === 2 ? L('Declarar alerta interna y reunir a los usuarios del agua.', 'Declare an internal alert and gather the water users.') : L('Reunir al comité de agua y revisar reservas.', 'Gather the water committee and review reserves.'), L('Definir turnos o reducción de caudal antes de que falte.', 'Define rotations or a flow reduction before shortage hits.'), L('Pedir una medición de campo para confirmar la señal.', 'Request a field measurement to confirm the signal.'), L('Informar a la comunidad en lenguaje claro y con fechas.', 'Inform the community in clear language and with dates.')],
    farm: [L('Priorizar cultivos tolerantes y riego por turnos.', 'Prioritise tolerant crops and rotational irrigation.'), L('Guardar agua y pasto para la época seca.', 'Store water and fodder for the dry season.'), L('Avisar a la junta de regantes de esta alerta.', 'Notify the irrigation board about this alert.')],
    sci: [L('Confirmar con radar Sentinel-1 u OPERA DSWx (superficie real del lago).', 'Confirm with Sentinel-1 radar or OPERA DSWx (actual lake surface).'), dry ? L('Descartar errores: nubes, estaciones o cambios de sensor.', 'Rule out errors: clouds, stations or sensor changes.') : L('Revisar si hubo evento puntual (tormenta, represa).', 'Check for a one-off event (storm, dam).'), L('Repetir el análisis cuando haya 3 meses más de datos.', 'Repeat the analysis when 3 more months of data are available.')],
  };
}

/* Texto de cada futuro según su resultado. */
export function scenText(s, A, L) {
  const r = s.r, d = Math.round(r.delta), v = Math.round(r.val), dryNow = A.p10;
  const bad = r.val < dryNow, rel = d === 0 ? L('casi igual que ahora', 'almost the same as now') : d < 0 ? L(`${Math.abs(d)} mm menos al año que ahora`, `${Math.abs(d)} mm less per year than now`) : L(`${d} mm más al año que ahora`, `${d} mm more per year than now`);
  const pDry = Math.round(r.dry * 100);
  return { v, rel, pDry, bad, head: bad ? L('Quedaría por debajo de los años más secos de la historia.', 'It would fall below the driest years on record.') : r.delta < 0 ? L('Menos agua que ahora, pero dentro de lo ya visto.', 'Less water than now, but within what has been seen.') : L('Agua suficiente: dentro o por encima de lo normal.', 'Enough water: within or above normal.') };
}

/* ---------- Lenguaje ambiental (EEL): un vector comparable por territorio ---------- */
export const EEL_DIMS = [['alt', 'Altitud', 'Altitude'], ['area', 'Tamaño', 'Size'], ['bal', 'Agua disponible', 'Water available'], ['balT', 'Tendencia del agua', 'Water trend'], ['temp', 'Temperatura', 'Temperature'], ['tempT', 'Calentamiento', 'Warming'], ['seas', 'Estacionalidad', 'Seasonality'], ['vari', 'Variabilidad', 'Variability']];
export function eelRaw(clim, tgt) {
  const ann = clim.ann; if (ann.length < 12) return null;
  const awb = ann.map((a) => a.wb), yrs = ann.map((a) => a.year), mk = mannKendall(awb), sen = senSlope(yrs, awb, mk.varS).slope * 10;
  const T = clim.d.T2M, tt = ols(T.map((p) => p.x), T.map((p) => p.v)).slope * 10, B = I.baseline(clim.wb, true), seas = Math.max(...B.S) - Math.min(...B.S);
  return [Math.log10(Math.max(50, tgt.alt ?? 1000)), Math.log10(Math.max(0.05, tgt.area ?? 1)), mean(awb), sen, mean(T.map((p) => p.v)), tt, seas, B.pool];
}
export function eelSpace(rows) { // rows: [{ id, raw }]
  const n = rows.length, d = EEL_DIMS.length; if (n < 4) return null;
  const mu = Array.from({ length: d }, (_, j) => mean(rows.map((r) => r.raw[j]))), sd = Array.from({ length: d }, (_, j) => Math.sqrt(rows.reduce((s, r) => s + (r.raw[j] - mu[j]) ** 2, 0) / (n - 1)) || 1);
  const Z = rows.map((r) => r.raw.map((v, j) => cl((v - mu[j]) / sd[j], -3, 3))), C = Array.from({ length: d }, (_, a) => Array.from({ length: d }, (_, b) => Z.reduce((s, z) => s + z[a] * z[b], 0) / (n - 1)));
  const pc = []; let M = C.map((r) => [...r]);
  for (let k = 0; k < 2; k++) { let v = Array.from({ length: d }, (_, i) => (i === k ? 1 : 0.3)); let lam = 0; for (let it = 0; it < 80; it++) { const w = M.map((r) => r.reduce((s, x, j) => s + x * v[j], 0)); lam = Math.hypot(...w) || 1; v = w.map((x) => x / lam); } pc.push({ v, lam }); M = M.map((r, a) => r.map((x, b) => x - lam * v[a] * v[b])); }
  const xy = Z.map((z) => pc.map((p) => z.reduce((s, x, j) => s + x * p.v[j], 0))), tot = C.reduce((s, r, i) => s + r[i], 0);
  const cos = (a, b) => { let s = 0, na = 0, nb = 0; for (let j = 0; j < d; j++) { s += a[j] * b[j]; na += a[j] ** 2; nb += b[j] ** 2; } return s / (Math.sqrt(na * nb) || 1); };
  return { Z, xy, mu, sd, expl: pc.map((p) => p.lam / tot), cos, dist: (a, b) => Math.sqrt(a.reduce((s, x, j) => s + (x - b[j]) ** 2, 0)) };
}
export function similar(space, rows, i, k = 5) { return rows.map((r, j) => ({ r, j, s: space.cos(space.Z[i], space.Z[j]) })).filter((o) => o.j !== i).sort((a, b) => b.s - a.s).slice(0, k); }
export const eelCode = (z) => 'EEL·v1 [' + z.map((v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1)).join(' ') + ']';

/* ---------- Descubrimiento: hipótesis que nadie pidió buscar ---------- */
export function discover(rows, space, L) { // rows: [{ id, name, vert, alt, level, zw, zt, near, raw }]
  const out = [];
  if (space) {
    const nn = rows.map((r, i) => ({ r, d: Math.min(...rows.map((q, j) => (j === i ? 1e9 : space.dist(space.Z[i], space.Z[j])))) })).sort((a, b) => b.d - a.d).slice(0, 3);
    if (nn.length) out.push({ kind: 'odd', icon: 'odd', t: L('Lagos que no se parecen a ningún otro', 'Lakes unlike any other'), b: L(`${nn.map((o) => o.r.name).join(', ')} tienen un perfil ambiental que ningún otro lago del inventario comparte.`, `${nn.map((o) => o.r.name).join(', ')} have an environmental profile that no other lake in the inventory shares.`), next: L('Hipótesis: hay una causa local (glaciar, represa, minería). Revisar imágenes y consultar a la autoridad local.', 'Hypothesis: there is a local cause (glacier, dam, mining). Review imagery and consult the local authority.'), lakes: nn.map((o) => o.r.id) });
  }
  const by = {}; rows.forEach((r) => { (by[r.vert] ||= []).push(r); });
  Object.entries(by).forEach(([v, a]) => {
    const dry = a.filter((r) => r.zw <= -1.5), wet = a.filter((r) => r.zw >= 1.5);
    [[dry, L('más secos', 'drier'), -1], [wet, L('más húmedos', 'wetter'), 1]].forEach(([g, w]) => { if (g.length >= 3) out.push({ kind: 'region', t: L(`Un mismo patrón en ${g.length} lagos de la vertiente ${v}`, `One pattern across ${g.length} lakes of the ${v} basin`), b: L(`${g.slice(0, 4).map((r) => r.name).join(', ')}${g.length > 4 ? '…' : ''} están ${w} de lo normal al mismo tiempo.`, `${g.slice(0, 4).map((r) => r.name).join(', ')}${g.length > 4 ? '…' : ''} are ${w} than normal at the same time.`), next: L('Hipótesis: un factor climático regional (por ejemplo El Niño o La Niña). Comparar con el índice ONI y con lluvia IMERG antes de buscar causas locales.', 'Hypothesis: a regional climate driver (for example El Niño or La Niña). Compare with the ONI index and IMERG rain before looking for local causes.'), lakes: g.map((r) => r.id) }); });
  });
  const gap = rows.filter((r) => r.level >= 1 && r.near > 100).sort((a, b) => b.near - a.near);
  if (gap.length) out.push({ kind: 'gap', t: L('Señal fuerte con poca evidencia en tierra', 'Strong signal with little ground evidence'), b: L(`${gap.length} lagos con señal de vigilancia o alerta no tienen un punto de monitoreo a menos de 100 km (${gap.slice(0, 3).map((r) => r.name).join(', ')}).`, `${gap.length} lakes with a watch or alert signal have no monitoring point within 100 km (${gap.slice(0, 3).map((r) => r.name).join(', ')}).`), next: L('Observación sugerida: radar Sentinel-1 u OPERA DSWx para medir el lago mismo, y una medición de campo en el de mayor señal.', 'Suggested observation: Sentinel-1 radar or OPERA DSWx to measure the lake itself, and a field reading at the strongest one.'), lakes: gap.slice(0, 6).map((r) => r.id) });
  const x = rows.map((r) => r.alt), y = rows.map((r) => r.raw[3]), mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0; x.forEach((a, i) => { sxy += (a - mx) * (y[i] - my); sxx += (a - mx) ** 2; syy += (y[i] - my) ** 2; });
  const r = sxy / Math.sqrt(sxx * syy || 1), n = rows.length, tt = r * Math.sqrt((n - 2) / Math.max(1e-9, 1 - r * r)), p = 2 * (1 - I.phi(Math.abs(tt)));
  if (p < 0.05) out.push({ kind: 'alt', t: L(r < 0 ? 'Los lagos más altos pierden agua más rápido' : 'Los lagos más altos ganan agua más rápido', r < 0 ? 'Higher lakes lose water faster' : 'Higher lakes gain water faster'), b: L(`La tendencia del balance se relaciona con la altitud (r = ${r.toFixed(2)}, p = ${p < 0.001 ? '< 0.001' : p.toFixed(3)}, ${n} lagos).`, `The balance trend is related to altitude (r = ${r.toFixed(2)}, p = ${p < 0.001 ? '< 0.001' : p.toFixed(3)}, ${n} lakes).`), next: L('Es una asociación, no una causa. Hipótesis: el calentamiento afecta más a la alta montaña. Probar con temperatura por franja de altitud y con la variable glaciar.', 'This is an association, not a cause. Hypothesis: warming affects high mountains more. Test with temperature by altitude band and the glacier variable.'), lakes: [] });
  else out.push({ kind: 'alt', t: L('No se encontró relación entre altitud y tendencia', 'No relationship between altitude and trend'), b: L(`Con ${n} lagos, la relación no es significativa (r = ${r.toFixed(2)}, p = ${p.toFixed(2)}). Es un resultado útil: descarta una hipótesis.`, `With ${n} lakes the relationship is not significant (r = ${r.toFixed(2)}, p = ${p.toFixed(2)}). A useful result: it rules out a hypothesis.`), next: L('Probar otras variables: vertiente, tipo de lago o cercanía a glaciares.', 'Try other variables: basin, lake type or glacier proximity.'), lakes: [] });
  return out;
}

/* ---------- Pasaporte de evidencia: cómo se obtuvo el resultado ---------- */
export async function passport(tgt, A, extra = {}) {
  const body = { territorio: { nombre: tgt.name, lat: tgt.lat, lon: tgt.lon, altitud_m: tgt.alt ?? null }, periodo: '1981-2025', fuentes: [A.live ? 'NASA POWER (MERRA-2 / CERES), mensual' + (extra.datos?.descargado ? ', obtenido el ' + String(extra.datos.descargado).slice(0, 10) + ' (' + ({ snapshot: 'instantánea local', cache: 'caché del navegador', live: 'descarga directa' }[extra.datos.origen] || extra.datos.origen) + ')' : '') : 'Datos de práctica simulados (no son mediciones)'], variables: ['PRECTOTCORR', 'EVLAND', 'T2M'],
    metodos: [{ nombre: 'Normalidad contextual (z robusto de 12 meses)', parametros: { detrend: true } }, { nombre: 'Pronóstico por simulación (tendencia + estación + AR(1))', parametros: { B: 500, horizonte_anios: 1, ar1: +A.sim.ar.toFixed(3) } }, { nombre: 'Escenarios condicionales', parametros: Object.fromEntries(A.scen.map((s) => [s.id, s.p])) }, { nombre: 'Alerta temprana (varianza y autocorrelación, sustitutos AR(1))', parametros: { sustitutos: 120 } }],
    resultado: { nivel: ['tranquilo', 'vigilar', 'alerta'][A.level], riesgo_0_100: A.risk, confianza_0_100: A.conf, z_balance_12m: +A.w.z.toFixed(2), z_temp_12m: +A.t.z.toFixed(2), prob_anio_seco: +A.pDry.toFixed(3), tendencia_mm_por_decada: +A.perDec.toFixed(1), p_tendencia: +A.mk.p.toFixed(4) },
    validacion: A.bt ? { retrospectiva_anios: A.bt.hold, cobertura_90: +A.bt.coverage.toFixed(3), habilidad_vs_climatologia: +A.bt.skill.toFixed(3) } : null,
    incertidumbre: A.unc.map((u) => ({ tipo: u.k, valor_0_100: u.v })),
    limitaciones: ['El balance lluvia − evaporación es un índice climático, no el nivel medido del lago.', 'La celda del modelo climático mide cerca de 50 km: lagos pequeños quedan promediados.', 'Las alertas priorizan y no reemplazan la decisión de la autoridad competente.', ...(String(tgt.id).startsWith('u') || tgt.alt == null ? [] : ['Coordenadas, altitud y área del lago vienen de un inventario de referencia aproximado, no oficial.']), ...(A.live ? [] : ['Estos datos son simulados.'])],
    reproducir: { app: 'Detectives de Tendencias (The Innovators)', version: 'v8', semillas: { simulacion: 11, retrospectiva: 5, alerta_temprana: 3 } }, ...extra };
  const txt = JSON.stringify(body); let h = '';
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)); h = [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 12); } catch { let x = 2166136261; for (let i = 0; i < txt.length; i++) { x ^= txt.charCodeAt(i); x = Math.imul(x, 16777619); } h = (x >>> 0).toString(16).padStart(8, '0'); }
  return { id: 'AI-' + h.toUpperCase(), generado: new Date().toISOString(), ...body };
}

/* ---------- Validación retrospectiva: ¿habría avisado el semáforo? ---------- */
/* Recalcula el semáforo mes a mes usando SOLO los datos que existían hasta ese mes (sin mirar el futuro).
   Versión simplificada: balance de agua y temperatura de los últimos 12 meses frente a lo normal. */
export function timeline(clim, fromYear) {
  const wb = clim.wb, T = clim.d.T2M, key = (p) => p.year * 12 + p.month, kT = T.map(key), rows = [];
  for (let i = 0; i < wb.length; i++) {
    if (wb[i].year < fromYear) continue; const k = key(wb[i]), w = last12(wb.slice(0, i + 1), 'sum'); let j = kT.length - 1; while (j >= 0 && kT[j] > k) j--;
    const t = j > 24 ? last12(T.slice(0, j + 1), 'mean') : null; if (!w) continue;
    const risk = Math.round(100 * (0.7 * cl(-w.z / 3) + 0.3 * cl((t?.z ?? 0) / 3)));
    rows.push({ i, year: wb[i].year, month: wb[i].month, x: wb[i].x, risk, level: risk >= 50 ? 2 : risk >= 25 ? 1 : 0, wz: w.z, roll: w.last });
  }
  return rows;
}
export function validate(clim, rows) {
  const wb = clim.wb, roll = []; for (let i = 11; i < wb.length; i++) { let s = 0; for (let j = i - 11; j <= i; j++) s += wb[j].v; roll[i] = s; }
  const all = roll.filter((v) => v != null).sort((a, b) => a - b), dryT = quant(all, 0.15); if (rows.length < 24) return null;
  let minR = rows[0]; rows.forEach((r) => { if (roll[r.i] < roll[minR.i]) minR = r; });
  const first = (lv) => { for (let q = 0; q < rows.length; q++) { if (rows[q].i > minR.i) return null; if (rows[q].i < minR.i - 24) continue; /* solo cuenta un aviso dado hasta 24 meses antes */ if (rows[q].level >= lv && (rows[q + 1]?.level ?? 0) >= lv) return rows[q]; } return null; };
  const w1 = first(1), w2 = first(2), lead = (r) => (r ? minR.i - r.i : null);
  // episodios de vigilancia y si fueron seguidos por un periodo seco en los 12 meses siguientes
  const eps = []; let cur = null; rows.forEach((r) => { if (r.level >= 1) { if (!cur) cur = { a: r.i, b: r.i }; cur.b = r.i; } else if (cur) { eps.push(cur); cur = null; } }); if (cur) eps.push(cur);
  const real = eps.filter((e) => { for (let q = e.a; q <= Math.min(wb.length - 1, e.b + 12); q++) if (roll[q] != null && roll[q] <= dryT) return true; return false; });
  const unresolved = eps.filter((e) => e.b + 12 > wb.length - 1 && !real.includes(e)).length;
  return { minR, minVal: roll[minR.i], dryT, w1, w2, lead1: lead(w1), lead2: lead(w2), eps: eps.length, hit: real.length, unresolved, months: rows.filter((r) => r.level >= 1).length, total: rows.length, roll: (i) => roll[i] };
}
