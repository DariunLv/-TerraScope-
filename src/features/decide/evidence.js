const label = (key) => `${Math.floor(key / 12)}-${String(key % 12 + 1).padStart(2, '0')}`;
// Quantitative decision statements carry their metric, unit, period and provenance together.
export function decisionStatements(A, clim, lang) {
  const L = (es, en) => lang === 'es' ? es : en, end = A.w.end.year * 12 + A.w.end.month;
  const recent = `${label(end - 11)}–${label(end)}`, first = clim.coverage?.first, full = first ? `${label(first.year * 12 + first.month)}–${label(end)}` : recent;
  const source = clim.live ? L('modelo NASA POWER', 'NASA POWER model') : L('simulación de práctica', 'practice simulation');
  const origin = `${source}; ${L('consulta', 'retrieved')} ${clim.when?.slice(0, 10) || L('no aplica', 'not applicable')}`;
  const year = clim.ann.at(-1).year + 1, forecast = `${year}-01–${year}-12`;
  return [
    L(`Balance climático en ${recent}: ${Math.round(A.w.last)} mm (${origin})`, `Climate balance in ${recent}: ${Math.round(A.w.last)} mm (${origin})`),
    L(`Balance normal de referencia para ${recent}: ${Math.round(A.w.normal)} mm (${source}; histórico ${full})`, `Normal reference balance for ${recent}: ${Math.round(A.w.normal)} mm (${source}; history ${full})`),
    L(`Temperatura media en ${recent}: ${A.t.last.toFixed(1)} °C (${origin})`, `Mean temperature in ${recent}: ${A.t.last.toFixed(1)} °C (${origin})`),
    L(`Tendencia del balance en ${full}: ${Math.round(A.perDec)} mm por década (${source})`, `Balance trend in ${full}: ${Math.round(A.perDec)} mm per decade (${source})`),
    L(`Índice de riesgo del análisis de ${recent}: ${A.risk} % (cálculo TerraScope; no es una probabilidad)`, `Risk index for the ${recent} analysis: ${A.risk} % (TerraScope calculation; not a probability)`),
    L(`Índice de confianza del análisis de ${recent}: ${A.conf} % (cálculo TerraScope; no es una probabilidad)`, `Confidence index for the ${recent} analysis: ${A.conf} % (TerraScope calculation; not a probability)`),
    L(`Probabilidad simulada de año seco en ${forecast}: ${Math.round(A.pDry * 100)} % (simulación TerraScope con ${source})`, `Simulated dry-year probability in ${forecast}: ${Math.round(A.pDry * 100)} % (TerraScope simulation using ${source})`),
    ...A.scen.map((scenario) => {
      const names = { bad: L('peligroso', 'dangerous'), same: L('sin novedad', 'business as usual'), calm: L('tranquilo', 'calm'), good: L('tranquilo', 'calm') }, name = names[scenario.id] || scenario.id;
      return L(`Balance simulado del escenario ${name} en ${forecast}: ${Math.round(scenario.r.val)} mm (rango ${Math.round(scenario.r.lo)} a ${Math.round(scenario.r.hi)} mm; simulación TerraScope con ${source})`, `Simulated ${name} scenario balance in ${forecast}: ${Math.round(scenario.r.val)} mm (range ${Math.round(scenario.r.lo)} to ${Math.round(scenario.r.hi)} mm; TerraScope simulation using ${source})`);
    }),
  ];
}
export function unverifiedStatements(answer, statements) {
  let remaining = String(answer).normalize('NFC');
  for (const statement of [...statements].sort((a, b) => b.length - a.length)) remaining = remaining.split(statement.normalize('NFC')).join('');
  // A different metric, unit, date or sign cannot reuse a number from another fact.
  return /\d/.test(remaining.replace(/^\s*\d+[.)]\s+/gm, ''));
}
