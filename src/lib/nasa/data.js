/* Catálogo, acceso a NASA POWER y datos simulados (ESM). */
import { useStore } from '../../core/store';

import { VARIABLES, KEYS, PLACES } from './catalog.js';
import { readCsv, csvNumber, normalizeHeader, MAX_MONTHS } from '../data/csv.js';
const V = Object.fromEntries(Object.entries(VARIABLES).map(([key, variable]) => [key, { ...variable }]));

  function cacheGet(k) { try { const entry = JSON.parse(sessionStorage.getItem(k)); return entry?.version === 2 && Date.now() - entry.t < 3600000 ? entry.value : null; } catch { return null; } }
  function cacheSet(k, value) { try { sessionStorage.setItem(k, JSON.stringify({ version: 2, t: Date.now(), value })); } catch { /* sin caché */ } }

  function parsePower(json, keys, year0 = 1, year1 = 9999) {
    var par = json && json.properties && json.properties.parameter, out = {};
    if (!par) return out;
    keys.forEach(function (k) {
      var o = par[k]; if (!o) return; var pts = [];
      Object.keys(o).sort().forEach(function (ym) {
        if (!/^\d{6}$/.test(ym)) return; var m = +ym.slice(4), y = +ym.slice(0, 4), v = o[ym];
        if (y < year0 || y > year1 || m < 1 || m > 12 || !Number.isFinite(v) || v <= -990) return;
        pts.push({ year: y, month: m - 1, x: y + (m - 1) / 12, v: v });
      });
      if (pts.length) out[k] = pts;
    });
    return out;
  }

  function powerUrl(lat, lon, keys, y0, y1) {
    return 'https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=' + keys.join(',') +
      '&community=AG&longitude=' + lon.toFixed(4) + '&latitude=' + lat.toFixed(4) + '&start=' + y0 + '&end=' + y1 + '&format=JSON';
  }

  async function fetchJson(url, { signal, refresh = false } = {}) {
    signal?.throwIfAborted();
    var c = !refresh && cacheGet(url); if (c) return c;
    var ctl = new AbortController(), to = setTimeout(function () { ctl.abort(); }, 45000);
    const abort = () => ctl.abort(signal.reason); signal?.addEventListener('abort', abort, { once: true });
    try {
      var r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) { var e = new Error('http'); e.status = r.status; throw e; }
      var j = await r.json(); cacheSet(url, j); return j;
    } finally { clearTimeout(to); signal?.removeEventListener('abort', abort); }
  }

  /* Pide todas las variables en una sola consulta; si falla, intenta una por una. */
  async function power(lat, lon, keys, y0, y1, onProgress, options = {}) {
    if (onProgress && typeof onProgress === 'object') { options = onProgress; onProgress = null; }
    if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lon) || Math.abs(lon) > 180 || !Number.isInteger(y0) || !Number.isInteger(y1) || y1 < y0) throw new Error('invalid query');
    keys = [...new Set(keys)].filter((key) => KEYS.includes(key));
    if (!keys.length) return {};
    let out = {};
    try {
      out = parsePower(await fetchJson(powerUrl(lat, lon, keys, y0, y1), options), keys, y0, y1);
    } catch (e) { if (e.name === 'AbortError' || keys.length === 1 || !e.status) throw e; }
    const missing = keys.filter((key) => !out[key]);
    if (keys.length === 1) return out;
    for (let i = 0; i < missing.length; i++) {
      options.signal?.throwIfAborted();
      onProgress?.(i + 1, missing.length);
      try { const one = parsePower(await fetchJson(powerUrl(lat, lon, [missing[i]], y0, y1), options), [missing[i]], y0, y1); if (one[missing[i]]) out[missing[i]] = one[missing[i]]; }
      catch (e) { if (e.name === 'AbortError' || options.signal?.aborted) throw e; }
    }
    return out;
  }
  function netError(e) { var n = new Error('net'); n.cause = e; return n; }

  /* Datos simulados (para probar sin conexión). Reproducibles según lugar y variable. */
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var BASE = { T2M: [28, 0.55, 0.9, 0.25], T2M_MAX: [34, 0.55, 1, 0.25], T2M_MIN: [22, 0.55, 0.9, 0.25], T2MDEW: [18, 0.6, 0.8, 0.2], TS: [29, 0.55, 1, 0.25], RH2M: [65, 0, 0.1, 0.01], QV2M: [10, 0.1, 0.1, 0.02], PRECTOTCORR: [3, 0, 0.3, 0.03], EVLAND: [2, 0, 0.3, 0.03], PS: [96, 0, 0.1, 0.002], WS10M: [4, 0.02, 0.15, 0.01], ALLSKY_SFC_SW_DWN: [5, -0.02, 0.4, 0.02], CLOUD_AMT: [55, 0, 3, 0.05], GWETTOP: [0.4, 0, 0.1, 0.02], GWETROOT: [0.45, 0, 0.1, 0.02], GWETPROF: [0.5, 0, 0.08, 0.02] };
  function demo(lat, lon, keys, y0, y1) {
    var out = {};
    keys.forEach(function (k) {
      var b = BASE[k], r = rng(hash(k + '|' + Math.round(lat / 5) + '|' + Math.round(lon / 5))), pts = [], prev = 0;
      var rate = (r() - 0.45) * 2 * b[3] * (V[k].rel || k === 'PS' ? Math.abs(b[0]) : 1) + (k.indexOf('T') === 0 || k === 'TS' ? 0.18 + Math.abs(lat) / 400 : 0);
      var mean = b[0] - b[1] * Math.abs(lat) * 0.4 * (V[k].rel ? 0 : 1);
      var amp = b[2] * (V[k].rel ? Math.abs(mean) * 0.15 : 1) * (1 + Math.abs(lat) / 30), sgn = lat >= 0 ? 1 : -1;
      var noise = Math.abs(mean) * (V[k].rel ? 0.04 : 0.02) + (V[k].rel ? 0 : 0.4);
      for (var y = y0; y <= y1; y++) for (var m = 0; m < 12; m++) {
        var u1 = Math.max(r(), 1e-9), g = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * r());
        prev = 0.4 * prev + g * noise;
        var x = y + m / 12;
        pts.push({ year: y, month: m, x: x, v: mean + sgn * amp * Math.cos(2 * Math.PI * (m - 6.5) / 12) + rate / 10 * (x - 2005) + prev });
      }
      out[k] = pts;
    });
    return out;
  }


/* Lee CSV de Giovanni/AppEEARS/CDO/KNMI: primera columna fecha, primera columna numérica = valor. Agrega a mensual. */
function parseCsv(text, { valueColumn } = {}) {
  const rows = readCsv(text), acc = {};
  const add = (year, month, value) => { if (!Number.isInteger(year) || year < 1 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isFinite(value) || value <= -990) return; const key = year * 12 + month - 1; (acc[key] ||= []).push(value); };
  const header = (rows[0] || []).map(normalizeHeader), yearIndex = header.findIndex((h) => /^(year|anio|ano)$/.test(h)), monthIndex = header.findIndex((h) => /^(month|mes)$/.test(h));
  const dateIndex = Math.max(0, header.findIndex((h) => /^(date|fecha|time|datetime)$/.test(h)));
  let valueIndex = valueColumn != null ? header.indexOf(normalizeHeader(valueColumn)) : header.findIndex((h) => /^(value|valor|measurement|medicion)$/.test(h));
  const hasHeader = yearIndex >= 0 || header.some((h) => /^(date|fecha|time|value|valor|datetime)$/.test(h));
  if (valueIndex < 0) {
    const candidates = (rows[hasHeader ? 1 : 0] || []).map((field, index) => ({ index, value: csvNumber(field) })).filter(({ index, value }) => index !== dateIndex && index !== yearIndex && index !== monthIndex && Number.isFinite(value));
    if (candidates.length > 1) throw new Error('CSV_AMBIGUOUS_VALUE');
    valueIndex = candidates[0]?.index ?? -1;
  }
  for (const row of rows.slice(hasHeader ? 1 : 0)) {
    if (row.length === 1) {
      const columns = row[0].split(/\s+/), year = +columns[0];
      if (/^\d{4}$/.test(columns[0]) && columns.length >= 13) { for (let month = 1; month <= 12; month++) add(year, month, csvNumber(columns[month])); continue; }
      if (columns.length === 3) { add(year, +columns[1], csvNumber(columns[2])); continue; }
    }
    if (yearIndex >= 0 && monthIndex >= 0) add(+row[yearIndex], +row[monthIndex], csvNumber(row[valueIndex]));
    else { const match = row[dateIndex]?.match(/^(\d{4})[-/]?(\d{2})(?:\D|\d{2}|$)/); if (match) add(+match[1], +match[2], csvNumber(row[valueIndex])); }
  }
  if (Object.keys(acc).length > MAX_MONTHS) throw new Error('CSV_TOO_MANY_MONTHS');
  return Object.keys(acc).map(Number).sort(function (a, b) { return a - b; }).map(function (k) {
    var a = acc[k], y = Math.floor(k / 12), mo = k % 12; return { year: y, month: mo, x: y + mo / 12, v: a.reduce(function (s, z) { return s + z; }, 0) / a.length };
  });
}
/* Datos diarios de NASA POWER (para la vista de alto rendimiento) */
async function powerDaily(lat, lon, key, y0, y1, options = {}) {
  if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lon) || Math.abs(lon) > 180 || !KEYS.includes(key) || !Number.isInteger(y0) || !Number.isInteger(y1) || y1 < y0) throw new Error('invalid query');
  var url = 'https://power.larc.nasa.gov/api/temporal/daily/point?parameters=' + key + '&community=AG&longitude=' + lon.toFixed(4) + '&latitude=' + lat.toFixed(4) + '&start=' + y0 + '0101&end=' + y1 + '1231&format=JSON';
  var j = await fetchJson(url, options), o = j && j.properties && j.properties.parameter && j.properties.parameter[key], out = [];
  if (!o) return out;
  Object.keys(o).sort().forEach(function (d) { var v = o[d]; if (!/^\d{8}$/.test(d) || !Number.isFinite(v) || v <= -990) return; const year = +d.slice(0, 4), month = +d.slice(4, 6), day = +d.slice(6, 8), date = new Date(Date.UTC(year, month - 1, day)); if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return; out.push({ t: date.getTime() / 1000, v }); });
  return out;
}
function demoDaily(lat, lon, key, y0, y1) {
  var mo = demo(lat, lon, [key], y0, y1)[key], r = rng(hash('d' + key + lat + lon)), out = [], prev = 0, sdv = Math.abs(mo[0].v) * 0.03 + 0.6;
  mo.forEach(function (p, i) { var nx = mo[Math.min(i + 1, mo.length - 1)].v, days = new Date(Date.UTC(p.year, p.month + 1, 0)).getUTCDate();
    for (var d = 0; d < days; d++) { var g = Math.sqrt(-2 * Math.log(Math.max(r(), 1e-9))) * Math.cos(2 * Math.PI * r()); prev = 0.7 * prev + g * sdv; out.push({ t: Date.UTC(p.year, p.month, d + 1) / 1000, v: p.v + (nx - p.v) * d / days + prev }); } });
  return out;
}
var SRC = { ALLSKY_SFC_SW_DWN: 'CERES', CLOUD_AMT: 'CERES' };
function sourceOf(k) { return k === 'CSV' ? 'CSV' : (SRC[k] || 'MERRA-2'); }
/* Unidades según el idioma activo: 'día' en español, 'day' en inglés */
for (const k of Object.keys(V)) { const u0 = V[k].u; if (/día/.test(u0)) Object.defineProperty(V[k], 'u', { get: () => (useStore.getState().lang === 'es' ? u0 : u0.replace('día', 'day')), enumerable: true }); }
export { powerDaily, demoDaily, sourceOf, parseCsv, V, KEYS, PLACES, power, demo, powerUrl, parsePower };
