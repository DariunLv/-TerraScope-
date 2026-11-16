/* Catálogo, acceso a NASA POWER y datos simulados (ESM). */
import { useStore } from '../../core/store';

  var V = {
    T2M: { u: '°C', d: 2, rel: false, es: ['Temperatura del aire (2 m)', 'Qué tan cálido está el aire cerca del suelo.'], en: ['Air temperature (2 m)', 'How warm the air is near the ground.'] },
    T2M_MAX: { u: '°C', d: 2, rel: false, es: ['Temperatura máxima diaria', 'Promedio mensual de la temperatura más alta de cada día.'], en: ['Daily maximum temperature', 'Monthly average of each day’s highest temperature.'] },
    T2M_MIN: { u: '°C', d: 2, rel: false, es: ['Temperatura mínima diaria', 'Promedio mensual de la temperatura más baja de cada día.'], en: ['Daily minimum temperature', 'Monthly average of each day’s lowest temperature.'] },
    T2MDEW: { u: '°C', d: 2, rel: false, es: ['Punto de rocío', 'Temperatura a la que el aire se satura de vapor. Refleja cuánta humedad hay.'], en: ['Dew point', 'Temperature at which the air saturates. It reflects how much moisture there is.'] },
    TS: { u: '°C', d: 2, rel: false, es: ['Temperatura de la superficie', 'Temperatura del suelo, el hielo o el mar en la superficie.'], en: ['Surface skin temperature', 'Temperature of the ground, ice or sea surface.'] },
    RH2M: { u: '%', d: 1, rel: true, es: ['Humedad relativa', 'Porcentaje de vapor de agua del aire respecto al máximo posible.'], en: ['Relative humidity', 'Share of the water vapor the air could hold.'] },
    QV2M: { u: 'g/kg', d: 2, rel: true, es: ['Humedad específica', 'Gramos de vapor de agua por kilogramo de aire.'], en: ['Specific humidity', 'Grams of water vapor per kilogram of air.'] },
    PRECTOTCORR: { u: 'mm/día', d: 2, rel: true, es: ['Precipitación', 'Lluvia o nieve caída, expresada en milímetros por día.'], en: ['Precipitation', 'Rain or snow, in millimeters per day.'] },
    EVLAND: { u: 'mm/día', d: 2, rel: true, es: ['Evaporación', 'Agua que pasa del suelo y las plantas al aire. Si sube y la lluvia no, el lugar se seca.'], en: ['Evaporation', 'Water moving from soil and plants to the air. If it rises and rain does not, the place dries.'] },
    PS: { u: 'kPa', d: 2, rel: false, es: ['Presión en superficie', 'Peso del aire sobre el lugar.'], en: ['Surface pressure', 'Weight of the air above the place.'] },
    WS10M: { u: 'm/s', d: 2, rel: true, es: ['Velocidad del viento (10 m)', 'Qué tan rápido sopla el viento a 10 metros de altura.'], en: ['Wind speed (10 m)', 'How fast the wind blows at 10 meters.'] },
    ALLSKY_SFC_SW_DWN: { u: 'kW·h/m²/día', d: 2, rel: true, es: ['Radiación solar en superficie', 'Energía solar que llega al suelo, con las nubes reales.'], en: ['Surface solar radiation', 'Solar energy reaching the ground, with real clouds.'] },
    CLOUD_AMT: { u: '%', d: 1, rel: true, es: ['Nubosidad', 'Porcentaje del cielo cubierto por nubes.'], en: ['Cloud amount', 'Share of the sky covered by clouds.'] },
    GWETTOP: { u: '', d: 3, rel: true, es: ['Humedad del suelo (superficie)', 'Qué tan mojada está la capa superior del suelo. 0 es seco y 1 saturado.'], en: ['Surface soil wetness', 'How wet the top soil layer is. 0 is dry, 1 is saturated.'] },
    GWETROOT: { u: '', d: 3, rel: true, es: ['Humedad de la zona de raíces', 'Agua disponible para las plantas en la zona de raíces.'], en: ['Root zone soil wetness', 'Water available to plants in the root zone.'] },
    GWETPROF: { u: '', d: 3, rel: true, es: ['Humedad del perfil del suelo', 'Humedad del suelo en toda su profundidad.'], en: ['Soil profile wetness', 'Wetness of the soil through its full depth.'] }
  };
  V.CSV = { u: '', d: 3, rel: true, es: ['Serie subida (CSV)', 'Tu propia serie de Giovanni, AppEEARS, CDO o KNMI.'], en: ['Uploaded series (CSV)', 'Your own series from Giovanni, AppEEARS, CDO or KNMI.'] };
  var KEYS = Object.keys(V).filter(function (k) { return k !== 'CSV'; });

  var PLACES = [
    { id: 'moq', es: 'Moquegua, Perú', en: 'Moquegua, Peru', lat: -17.19, lon: -70.93, b: 'mountain' },
    { id: 'ama', es: 'Amazonía peruana', en: 'Peruvian Amazon', lat: -3.75, lon: -73.25, b: 'forest' },
    { id: 'ata', es: 'Desierto de Atacama', en: 'Atacama Desert', lat: -24.5, lon: -69.25, b: 'desert' },
    { id: 'art', es: 'Ártico (Svalbard)', en: 'Arctic (Svalbard)', lat: 78.2, lon: 15.6, b: 'polar' },
    { id: 'sah', es: 'Sahel (Níger)', en: 'Sahel (Niger)', lat: 14.0, lon: 2.0, b: 'desert' },
    { id: 'him', es: 'Himalaya (Nepal)', en: 'Himalaya (Nepal)', lat: 28.0, lon: 84.0, b: 'mountain' },
    { id: 'mex', es: 'Ciudad de México', en: 'Mexico City', lat: 19.43, lon: -99.13, b: 'city' },
    { id: 'med', es: 'Mar Mediterráneo', en: 'Mediterranean Sea', lat: 35.0, lon: 18.0, b: 'coast' },
    { id: 'lim', es: 'Lima, Perú', en: 'Lima, Peru', lat: -12.05, lon: -77.04, b: 'city' },
    { id: 'tit', es: 'Lago Titicaca', en: 'Lake Titicaca', lat: -15.8, lon: -69.4, b: 'mountain' },
    { id: 'cus', es: 'Cusco, Perú', en: 'Cusco, Peru', lat: -13.53, lon: -71.97, b: 'mountain' },
    { id: 'piu', es: 'Piura, Perú', en: 'Piura, Peru', lat: -5.19, lon: -80.63, b: 'coast' },
    { id: 'nyc', es: 'Nueva York', en: 'New York', lat: 40.71, lon: -74.0, b: 'city' },
    { id: 'cal', es: 'California (Valle Central)', en: 'California (Central Valley)', lat: 36.7, lon: -119.8, b: 'desert' },
    { id: 'gro', es: 'Groenlandia', en: 'Greenland', lat: 72.0, lon: -40.0, b: 'polar' },
    { id: 'sib', es: 'Siberia (Yakutsk)', en: 'Siberia (Yakutsk)', lat: 62.03, lon: 129.73, b: 'polar' },
    { id: 'del', es: 'Delhi, India', en: 'Delhi, India', lat: 28.61, lon: 77.21, b: 'city' },
    { id: 'gan', es: 'Delta del Ganges', en: 'Ganges Delta', lat: 22.5, lon: 89.5, b: 'coast' },
    { id: 'cer', es: 'Cerrado (Brasil)', en: 'Cerrado (Brazil)', lat: -15.8, lon: -47.9, b: 'forest' },
    { id: 'con', es: 'Cuenca del Congo', en: 'Congo Basin', lat: 0.0, lon: 22.0, b: 'forest' },
    { id: 'cap', es: 'Ciudad del Cabo', en: 'Cape Town', lat: -33.92, lon: 18.42, b: 'coast' },
    { id: 'aus', es: 'Australia (Murray-Darling)', en: 'Australia (Murray-Darling)', lat: -34.0, lon: 144.0, b: 'desert' },
    { id: 'ant', es: 'Península Antártica', en: 'Antarctic Peninsula', lat: -64.8, lon: -62.9, b: 'polar' },
    { id: 'mad', es: 'Madrid, España', en: 'Madrid, Spain', lat: 40.42, lon: -3.7, b: 'city' },
    { id: 'nil', es: 'Delta del Nilo', en: 'Nile Delta', lat: 31.0, lon: 31.0, b: 'coast' },
    { id: 'mek', es: 'Delta del Mekong', en: 'Mekong Delta', lat: 10.5, lon: 105.5, b: 'coast' },
    { id: 'tok', es: 'Tokio, Japón', en: 'Tokyo, Japan', lat: 35.68, lon: 139.69, b: 'city' },
    { id: 'yel', es: 'Canadá (Yellowknife)', en: 'Canada (Yellowknife)', lat: 62.45, lon: -114.37, b: 'polar' },
    { id: 'alp', es: 'Alpes', en: 'Alps', lat: 46.5, lon: 9.8, b: 'mountain' },
    { id: 'bor', es: 'Borneo', en: 'Borneo', lat: 0.5, lon: 114.0, b: 'forest' }
  ];

  function cacheGet(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } }
  function cacheSet(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin caché */ } }

  function parsePower(json, keys) {
    var par = json && json.properties && json.properties.parameter, out = {};
    if (!par) return out;
    keys.forEach(function (k) {
      var o = par[k]; if (!o) return; var pts = [];
      Object.keys(o).sort().forEach(function (ym) {
        if (ym.length !== 6) return; var m = +ym.slice(4), y = +ym.slice(0, 4), v = o[ym];
        if (m < 1 || m > 12 || v == null || v <= -990) return;
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

  async function fetchJson(url) {
    var c = cacheGet(url); if (c) return c;
    var ctl = new AbortController(), to = setTimeout(function () { ctl.abort(); }, 45000);
    try {
      var r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) { var e = new Error('http'); e.status = r.status; throw e; }
      var j = await r.json(); cacheSet(url, j); return j;
    } finally { clearTimeout(to); }
  }

  /* Pide todas las variables en una sola consulta; si falla, intenta una por una. */
  async function power(lat, lon, keys, y0, y1, onProgress) {
    try {
      var out = parsePower(await fetchJson(powerUrl(lat, lon, keys, y0, y1)), keys);
      if (Object.keys(out).length) return out;
    } catch (e) { if (keys.length === 1 || !e.status) throw netError(e); }
    var res = {};
    for (var i = 0; i < keys.length; i++) {
      if (onProgress) onProgress(i + 1, keys.length);
      try { var one = parsePower(await fetchJson(powerUrl(lat, lon, [keys[i]], y0, y1)), [keys[i]]); if (one[keys[i]]) res[keys[i]] = one[keys[i]]; }
      catch (e) { if (!e.status) throw netError(e); }
    }
    return res;
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
function parseCsv(text) {
  var acc = {};
  text.split(/\r?\n/).forEach(function (ln) {
    if (!ln.trim() || /^\s*#/.test(ln)) return;
    var c = ln.split(/[,;\t]/).map(function (x) { return x.trim().replace(/^"|"$/g, ''); });
    var w = ln.trim().split(/\s+/);
    if (/^\d{4}$/.test(w[0]) && w.length >= 13 && !isNaN(parseFloat(w[12]))) { for (var q = 1; q <= 12; q++) { var z = parseFloat(w[q]); if (!isNaN(z) && z > -990) (acc[+w[0] * 12 + q - 1] = acc[+w[0] * 12 + q - 1] || []).push(z); } return; }
    if (/^\d{4}$/.test(w[0]) && w.length === 3 && +w[1] >= 1 && +w[1] <= 12) { var z2 = parseFloat(w[2]); if (!isNaN(z2) && z2 > -990) (acc[+w[0] * 12 + (+w[1]) - 1] = acc[+w[0] * 12 + (+w[1]) - 1] || []).push(z2); return; }
    var m = c[0].match(/^(\d{4})[-\/]?(\d{2})/);
    if (!m) return;
    var y = +m[1], mo = +m[2]; if (mo < 1 || mo > 12) return;
    var v = NaN; for (var i = 1; i < c.length; i++) { var n = parseFloat(c[i]); if (!isNaN(n) && !/^\d{4}-/.test(c[i])) { v = n; break; } }
    if (isNaN(v) || v <= -990) return;
    var k = y * 12 + (mo - 1); (acc[k] = acc[k] || []).push(v);
  });
  return Object.keys(acc).map(Number).sort(function (a, b) { return a - b; }).map(function (k) {
    var a = acc[k], y = Math.floor(k / 12), mo = k % 12; return { year: y, month: mo, x: y + mo / 12, v: a.reduce(function (s, z) { return s + z; }, 0) / a.length };
  });
}
/* Datos diarios de NASA POWER (para la vista de alto rendimiento) */
async function powerDaily(lat, lon, key, y0, y1) {
  var url = 'https://power.larc.nasa.gov/api/temporal/daily/point?parameters=' + key + '&community=AG&longitude=' + lon.toFixed(4) + '&latitude=' + lat.toFixed(4) + '&start=' + y0 + '0101&end=' + y1 + '1231&format=JSON';
  var j = await fetchJson(url), o = j && j.properties && j.properties.parameter && j.properties.parameter[key], out = [];
  if (!o) return out;
  Object.keys(o).sort().forEach(function (d) { var v = o[d]; if (d.length !== 8 || v == null || v <= -990) return; out.push({ t: Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8)) / 1000, v: v }); });
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
