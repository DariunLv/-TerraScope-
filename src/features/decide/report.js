/* Informe de una página del caso, descarga CSV y enlace compartible. Todo se arma con los números ya calculados por la app. */
import { LV, scenText } from './decideEngine';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtP = (p, es) => (p < 0.001 ? 'p < 0' + (es ? ',' : '.') + '001' : 'p = ' + p.toFixed(3).replace('.', es ? ',' : '.'));
export function caseLink(sel) { try { return `${location.origin}${location.pathname}?caso=${encodeURIComponent(sel)}&vista=decidir`; } catch { return ''; } }
export function seriesCsv(ann, tgt, clim) {
  const head = [`# TerraScope · ${tgt.name} · balance anual lluvia - evaporación (mm por año)`, `# Fuente: ${clim?.live ? 'NASA POWER (MERRA-2)' : 'datos de práctica simulados, no son mediciones'}`, 'anio,lluvia_mm,evaporacion_mm,balance_mm'];
  return [...head, ...ann.map((a) => [a.year, Math.round(a.p), Math.round(a.e), Math.round(a.wb)].join(','))].join('\n');
}
export function caseReportHtml({ A, tgt, ann, pass, coh, lang, L, link }) {
  const es = lang === 'es', date = new Date().toLocaleDateString(es ? 'es-PE' : 'en-GB'), y0 = ann[0].year, y1 = ann[ann.length - 1].year;
  const sc = A.scen.map((s) => { const x = scenText(s, A, L); return `<tr><td>${esc(L(s.es, s.en))}</td><td>${x.v} mm</td><td>${esc(x.rel)}</td><td>${x.pDry} %</td></tr>`; }).join('');
  const lims = (pass?.limitaciones || []).map((x) => `<li>${esc(x)}</li>`).join('');
  const cohh = (coh || []).map((c) => `<li><b>${esc(c.t)}.</b> ${esc(c.b)}</li>`).join('');
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(tgt.name)} · TerraScope</title><style>
  body{font:14px/1.5 system-ui,Segoe UI,Arial,sans-serif;color:#14213d;max-width:780px;margin:24px auto;padding:0 20px}
  h1{font-size:22px;margin:0 0 2px;color:#0f3d2e}h2{font-size:15px;margin:18px 0 6px;color:#0f3d2e;border-bottom:1px solid #d5e2dc;padding-bottom:3px}
  .k{display:flex;gap:10px;margin:10px 0}.k div{flex:1;border:1px solid #d5e2dc;border-radius:10px;padding:8px 10px}.k b{display:block;font-size:20px}.k span{font-size:12px;color:#5b6b8c}
  table{border-collapse:collapse;width:100%}td,th{border:1px solid #d5e2dc;padding:5px 8px;text-align:left;font-size:13px}th{background:#e6f1ec}
  small{color:#5b6b8c}@media print{body{margin:0}}</style></head><body>
  <h1>${esc(tgt.name)}</h1><small>TerraScope · ${es ? 'Informe del caso' : 'Case report'} · ${date} · ${es ? 'Equipo The Innovators (Puno)' : 'Team The Innovators (Puno)'}</small>
  <h2>${es ? 'Resultado' : 'Result'}</h2>
  <p><b>${esc(LV[A.level][lang])}</b> · ${es ? 'riesgo' : 'risk'} ${A.risk}/100 · ${es ? 'confianza' : 'confidence'} ${A.conf}/100.<br>${es ? 'Es un balance climático (lluvia − evaporación) de una celda de unos 50 km, no el nivel medido del lago o embalse.' : 'It is a climate balance (rain − evaporation) over a ~50 km cell, not the measured lake or reservoir level.'}</p>
  <div class="k"><div><b>${Math.round(A.w.last)} mm</b><span>${es ? 'Balance de 12 meses' : '12-month balance'} (${es ? 'normal' : 'normal'} ${Math.round(A.w.normal)} mm)</span></div><div><b>${Math.round(A.pDry * 100)} %</b><span>${es ? 'Prob. simulada de año seco (lo esperado es 10 %)' : 'Simulated dry-year probability (expected 10 %)'}</span></div><div><b>${A.bt ? Math.round(A.bt.coverage * 100) + ' %' : '—'}</b><span>${es ? 'Cobertura real del intervalo del 90 % (5 años)' : 'Real coverage of the 90 % interval (5 years)'}</span></div></div>
  <h2>${es ? 'Tendencia' : 'Trend'}</h2>
  <p>${A.perDec >= 0 ? '+' : '−'}${Math.abs(A.perDec).toFixed(1)} mm ${es ? 'por década' : 'per decade'} · ${es ? 'pendiente de Sen sobre el balance anual de años completos' : 'Sen slope on the annual balance of full years'} ${y0}–${y1} · Mann-Kendall ${fmtP(A.mk.p, es)}.<br><small>${es ? 'Un valor p pequeño indica que un resultado tan extremo como el observado sería poco frecuente bajo el supuesto de que no hay tendencia.' : 'A small p-value indicates that a result as extreme as the one observed would be rare under the assumption that there is no trend.'}</small></p>
  <h2>${es ? 'Tres futuros' : 'Three futures'}</h2>
  <table><tr><th>${es ? 'Escenario' : 'Scenario'}</th><th>${es ? 'Balance anual' : 'Annual balance'}</th><th>${es ? 'Frente a ahora' : 'Versus now'}</th><th>${es ? 'Año seco' : 'Dry year'}</th></tr>${sc}</table>
  ${cohh ? `<h2>${es ? 'Diferencias entre vistas' : 'Differences between views'}</h2><ul>${cohh}</ul>` : ''}
  <h2>${es ? 'Limitaciones' : 'Limitations'}</h2><ul>${lims}</ul>
  <h2>${es ? 'Fuente y reproducibilidad' : 'Source and reproducibility'}</h2>
  <p>${esc(pass?.fuentes?.[0] || '')} · ${es ? 'Pasaporte' : 'Passport'} <code>${esc(pass?.id || '')}</code>${link ? `<br><small>${esc(link)}</small>` : ''}</p>
  <small>${es ? 'Esta herramienta apoya la decisión con evidencia; no reemplaza a la autoridad competente ni a la medición de campo.' : 'This tool supports decisions with evidence; it does not replace the competent authority or field measurement.'}</small>
  </body></html>`;
}
