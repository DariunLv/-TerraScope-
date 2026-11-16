import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAKES, parseLakes } from '../src/features/lakes/lakesData.js';
import { PLACES } from '../src/lib/nasa/catalog.js';
import { DATA_VERSION, monthlyArray } from '../src/lib/data/monthly.js';
const KS = ['PRECTOTCORR', 'EVLAND', 'T2M'], Y0 = 1981, Y1 = new Date().getUTCFullYear() - 1;
const BASE = process.env.POWER_BASE || 'https://power.larc.nasa.gov/api/temporal/monthly/point';
const args = process.argv.slice(2), outputIndex = args.indexOf('--output');
if (outputIndex >= 0 && !args[outputIndex + 1]) throw new Error('Falta la ruta de --output');
const output = outputIndex >= 0 ? resolve(args[outputIndex + 1]) : fileURLToPath(new URL('../public/datos/clima-lagos.json', import.meta.url));
const inventory = args.find((arg, index) => !arg.startsWith('--') && (outputIndex < 0 || index !== outputIndex + 1));
const lakes = inventory ? parseLakes(readFileSync(inventory, 'utf8')) : LAKES;
const key = (point) => `${point.lat.toFixed(2)},${point.lon.toFixed(2)}`;
const points = [...new Map([...lakes, ...PLACES].map((point) => [key(point), point])).values()];
async function one(point) {
  const url = `${BASE}?parameters=${KS.join(',')}&community=AG&longitude=${point.lon.toFixed(4)}&latitude=${point.lat.toFixed(4)}&start=${Y0}&end=${Y1}&format=JSON`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parameters = (await response.json()).properties?.parameter;
      const result = Object.fromEntries(KS.map((variable) => [variable, monthlyArray(parameters?.[variable], Y0, Y1)]));
      if (KS.every((variable) => result[variable].filter(Number.isFinite).length < 120)) throw new Error('sin series suficientes');
      return result;
    } catch (error) {
      if (attempt === 3) { console.error(`Falló ${key(point)}: ${error.message}`); return null; }
      await new Promise((done) => setTimeout(done, 1000 * attempt));
    }
  }
}
let previous = null;
try { previous = JSON.parse(readFileSync(output, 'utf8')); } catch { /* primera descarga */ }
const compatible = previous?.schemaVersion === DATA_VERSION && previous.y0 === Y0 && previous.y1 === Y1;
const series = compatible ? { ...previous.series } : {}, downloaded = [], failures = [];
let completed = 0;
const queue = [...points];
console.log(`Descargando ${points.length} puntos de NASA POWER (${Y0}–${Y1})…`);
await Promise.all(Array.from({ length: 3 }, async () => {
  while (queue.length) {
    const point = queue.shift(), result = await one(point);
    if (result) { series[key(point)] = result; downloaded.push(key(point)); } else failures.push(key(point));
    process.stdout.write(`\r${++completed}/${points.length}`);
  }
}));
if (!downloaded.length) { console.error('\nNo se reemplazó el archivo: ninguna descarga válida.'); process.exitCode = 1; }
else {
  mkdirSync(dirname(output), { recursive: true });
  const generated = new Date().toISOString();
  const retrieved = Object.fromEntries(Object.keys(series).map((point) => [point, downloaded.includes(point) ? generated : previous.retrieved?.[point] || previous.generado]));
  const snapshot = { schemaVersion: DATA_VERSION, generado: generated, fuente: 'NASA POWER (MERRA-2 / CERES), mensual, comunidad AG', y0: Y0, y1: Y1, variables: KS, retrieved, series };
  writeFileSync(output + '.new', JSON.stringify(snapshot));
  renameSync(output + '.new', output);
  console.log(`\nGuardados ${downloaded.length} puntos nuevos; ${failures.length} fallidos. Archivo: ${output}`);
  if (failures.length) process.exitCode = 1;
}
