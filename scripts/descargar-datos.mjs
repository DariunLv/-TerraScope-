/* Descarga el clima mensual de NASA POWER (lluvia, evaporación y temperatura, desde 1981) para todos los lagos
   y lugares, y lo guarda en public/datos/clima-lagos.json. La app lo usa primero, así la demo funciona sin internet
   con datos REALES. Ejecutar una vez, con internet:   npm run datos
   Opcional: inventario oficial propio:   npm run datos -- ruta/inventario.csv
   Para pruebas se puede cambiar el servidor con la variable POWER_BASE. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { LAKES, parseLakes } from '../src/features/lakes/lakesData.js';
import { PLACES } from '../src/lib/nasa/data.js';
const KS = ['PRECTOTCORR', 'EVLAND', 'T2M'], Y0 = 1981, Y1 = new Date().getFullYear() - 1;
const BASE = process.env.POWER_BASE || 'https://power.larc.nasa.gov/api/temporal/monthly/point';
const csv = process.argv[2], lakes = csv ? parseLakes(readFileSync(csv, 'utf8')) : LAKES;
const pts = [...lakes.map((l) => ({ lat: l.lat, lon: l.lon })), ...PLACES.map((p) => ({ lat: p.lat, lon: p.lon }))];
const key = (p) => `${(+p.lat).toFixed(2)},${(+p.lon).toFixed(2)}`, uniq = [...new Map(pts.map((p) => [key(p), p])).values()];
async function one(p) {
  const url = `${BASE}?parameters=${KS.join(',')}&community=AG&longitude=${(+p.lon).toFixed(4)}&latitude=${(+p.lat).toFixed(4)}&start=${Y0}&end=${Y1}&format=JSON`;
  for (let t = 1; t <= 4; t++) {
    try { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); const par = (await r.json()).properties.parameter, out = {};
      for (const k of KS) { const a = Array((Y1 - Y0 + 1) * 12).fill(null); for (const [ym, v] of Object.entries(par[k] || {})) { if (ym.length !== 6 || v <= -990) continue; a[(+ym.slice(0, 4) - Y0) * 12 + (+ym.slice(4) - 1)] = +(+v).toFixed(3); } out[k] = a; }
      return out; } catch (e) { if (t === 4) { console.error('  falló', key(p), e.message); return null; } await new Promise((r) => setTimeout(r, 1500 * t)); }
  }
}
const series = {}; let done = 0; const q = [...uniq];
console.log(`Descargando ${uniq.length} puntos de NASA POWER (${Y0}-${Y1})…`);
await Promise.all(Array.from({ length: 3 }, async () => { while (q.length) { const p = q.shift(), r = await one(p); if (r) series[key(p)] = r; process.stdout.write(`\r  ${++done}/${uniq.length}`); } }));
mkdirSync(new URL('../public/datos/', import.meta.url), { recursive: true });
writeFileSync(new URL('../public/datos/clima-lagos.json', import.meta.url), JSON.stringify({ generado: new Date().toISOString(), fuente: 'NASA POWER (MERRA-2 / CERES), mensual, comunidad AG', y0: Y0, y1: Y1, variables: KS, series }));
console.log(`\nListo: ${Object.keys(series).length} puntos guardados en public/datos/clima-lagos.json`);
