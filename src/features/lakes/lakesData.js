/* Inventario de referencia de lagos, lagunas y embalses del Perú.
   Coordenadas, altitud y área son APROXIMADAS (referencia para el prototipo).
   Para análisis oficial, reemplazar por el inventario de la ANA / INAIGEM. */
const L = (id, name, lat, lon, alt, area, dep, type, vert) => ({ id, name, lat, lon, alt, area, dep, type, vert });
export const LAKES = [
  L('titicaca', 'Lago Titicaca', -15.8, -69.4, 3812, 8372, 'Puno', 'tectonico', 'Titicaca'),
  L('junin', 'Lago Junín (Chinchaycocha)', -11.02, -76.12, 4082, 530, 'Junín', 'altoandino', 'Atlántico'),
  L('arapa', 'Laguna Arapa', -15.15, -70.1, 3810, 132, 'Puno', 'altoandino', 'Titicaca'),
  L('umayo', 'Laguna Umayo', -15.73, -70.17, 3845, 28, 'Puno', 'altoandino', 'Titicaca'),
  L('lagunillas', 'Laguna Lagunillas', -15.72, -70.73, 4174, 66, 'Puno', 'altoandino', 'Titicaca'),
  L('loriscota', 'Laguna Loriscota', -16.87, -70.03, 4560, 35, 'Puno', 'altoandino', 'Titicaca'),
  L('parinacochas', 'Laguna Parinacochas', -15.3, -73.7, 3273, 67, 'Ayacucho', 'altoandino', 'Pacífico'),
  L('salinas', 'Laguna de Salinas', -16.37, -71.13, 4300, 60, 'Arequipa', 'altoandino', 'Pacífico'),
  L('pastogrande', 'Embalse Pasto Grande', -16.72, -70.22, 4530, 40, 'Moquegua', 'embalse', 'Pacífico'),
  L('suches', 'Laguna Suches', -16.93, -70.4, 4450, 20, 'Tacna', 'altoandino', 'Pacífico'),
  L('aricota', 'Laguna Aricota', -17.35, -70.28, 2800, 14, 'Tacna', 'altoandino', 'Pacífico'),
  L('condoroma', 'Embalse Condoroma', -15.4, -71.28, 4150, 18, 'Arequipa', 'embalse', 'Pacífico'),
  L('elfraile', 'Embalse El Fraile', -16.15, -71.19, 4000, 10, 'Arequipa', 'embalse', 'Pacífico'),
  L('aguadablanca', 'Embalse Aguada Blanca', -16.24, -71.35, 3670, 3, 'Arequipa', 'embalse', 'Pacífico'),
  L('palcacocha', 'Laguna Palcacocha', -9.397, -77.38, 4562, 0.5, 'Áncash', 'glaciar', 'Pacífico'),
  L('paron', 'Laguna Parón', -8.997, -77.683, 4185, 1.5, 'Áncash', 'glaciar', 'Pacífico'),
  L('llanganuco', 'Lagunas de Llanganuco', -9.075, -77.648, 3850, 0.6, 'Áncash', 'glaciar', 'Pacífico'),
  L('laguna69', 'Laguna 69', -9.01, -77.61, 4600, 0.1, 'Áncash', 'glaciar', 'Pacífico'),
  L('rajucolta', 'Laguna Rajucolta', -9.52, -77.34, 4270, 0.5, 'Áncash', 'glaciar', 'Pacífico'),
  L('querococha', 'Laguna Querococha', -9.722, -77.33, 3980, 1.4, 'Áncash', 'glaciar', 'Pacífico'),
  L('conococha', 'Laguna Conococha', -10.123, -77.283, 4050, 1.8, 'Áncash', 'altoandino', 'Pacífico'),
  L('lauricocha', 'Laguna Lauricocha', -10.32, -76.67, 3845, 6, 'Huánuco', 'glaciar', 'Atlántico'),
  L('punrun', 'Laguna Punrún', -10.83, -76.47, 4300, 8, 'Pasco', 'altoandino', 'Atlántico'),
  L('marcapomacocha', 'Laguna Marcapomacocha', -11.4, -76.33, 4415, 4.5, 'Junín', 'embalse', 'Atlántico'),
  L('paca', 'Laguna de Paca', -11.72, -75.5, 3418, 21, 'Junín', 'altoandino', 'Atlántico'),
  L('choclococha', 'Laguna Choclococha', -13.15, -75.07, 4605, 16, 'Huancavelica', 'altoandino', 'Pacífico'),
  L('pacucha', 'Laguna Pacucha', -13.61, -73.33, 3125, 7.5, 'Apurímac', 'altoandino', 'Atlántico'),
  L('piuray', 'Laguna Piuray', -13.42, -72.03, 3700, 3, 'Cusco', 'altoandino', 'Atlántico'),
  L('pomacanchi', 'Laguna Pomacanchi', -14.03, -71.52, 3660, 20, 'Cusco', 'altoandino', 'Atlántico'),
  L('languilayo', 'Laguna Langui-Layo', -14.45, -71.22, 3969, 55, 'Cusco', 'altoandino', 'Atlántico'),
  L('sibinacocha', 'Laguna Sibinacocha', -13.85, -71.03, 4873, 28, 'Cusco', 'glaciar', 'Atlántico'),
  L('condores', 'Laguna de los Cóndores', -6.85, -77.7, 2600, 0.5, 'Amazonas', 'altoandino', 'Atlántico'),
  L('sauce', 'Laguna Sauce (Laguna Azul)', -6.72, -76.22, 600, 4.3, 'San Martín', 'amazonico', 'Atlántico'),
  L('yarinacocha', 'Laguna Yarinacocha', -8.35, -74.58, 150, 12, 'Ucayali', 'amazonico', 'Atlántico'),
  L('rimachi', 'Lago Rimachi', -4.42, -76.67, 150, 80, 'Loreto', 'amazonico', 'Atlántico'),
  L('poechos', 'Embalse Poechos', -4.67, -80.5, 100, 60, 'Piura', 'embalse', 'Pacífico'),
  L('tinajones', 'Embalse Tinajones', -6.65, -79.42, 215, 20, 'Lambayeque', 'embalse', 'Pacífico'),
  L('gallito', 'Embalse Gallito Ciego', -7.22, -79.17, 400, 14, 'Cajamarca', 'embalse', 'Pacífico'),
  L('huacachina', 'Laguna Huacachina', -14.087, -75.763, 400, 0.01, 'Ica', 'costero', 'Pacífico'),
];
export const TYPES = { tectonico: ['Tectónico', 'Tectonic', '#1e3a8a'], altoandino: ['Altoandino', 'High-Andean', '#0c7a5b'], glaciar: ['Glaciar', 'Glacial', '#0891b2'], embalse: ['Embalse', 'Reservoir', '#c2410c'], amazonico: ['Amazónico', 'Amazonian', '#65a30d'], costero: ['Costero', 'Coastal', '#d97706'] };
export const band = (alt) => (alt < 2000 ? 0 : alt < 4000 ? 1 : 2);
export const BANDS = { es: ['Menos de 2000 m', '2000 a 4000 m', 'Más de 4000 m'], en: ['Below 2000 m', '2000 to 4000 m', 'Above 4000 m'] };
/* Puntos de ejemplo (capitales regionales). NO son la red oficial de la ANA: sirven para probar la herramienta. */
export const SAMPLE_POINTS = [['Puno', -15.84, -70.02], ['Juliaca', -15.5, -70.13], ['Cusco', -13.53, -71.97], ['Huaraz', -9.53, -77.53], ['Arequipa', -16.4, -71.54], ['Moquegua', -17.19, -70.93], ['Tacna', -18.01, -70.25], ['Huancayo', -12.07, -75.21], ['Cerro de Pasco', -10.68, -76.26], ['Ayacucho', -13.16, -74.22], ['Pucallpa', -8.38, -74.55], ['Tarapoto', -6.49, -76.36], ['Piura', -5.19, -80.63], ['Chiclayo', -6.77, -79.84], ['Huancavelica', -12.79, -74.97], ['Abancay', -13.63, -72.88]].map(([name, lat, lon]) => ({ name, lat, lon }));
export function km(a, b) { const R = 6371, r = Math.PI / 180, dl = (b.lat - a.lat) * r, dn = (b.lon - a.lon) * r, h = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
/* Lee CSV de puntos: columnas lat y lon (o latitud/longitud); nombre opcional */
export function parsePoints(text) {
  const rows = text.split(/\r?\n/).filter((l) => l.trim()), sep = rows[0].includes(';') ? ';' : ',';
  const head = rows[0].split(sep).map((h) => h.trim().toLowerCase()), ia = head.findIndex((h) => /^lat/.test(h)), io = head.findIndex((h) => /^(lon|lng)/.test(h)), inm = head.findIndex((h) => /nom|name|cod/.test(h));
  if (ia < 0 || io < 0) return [];
  return rows.slice(1).map((r, i) => { const c = r.split(sep); return { name: inm >= 0 ? c[inm] : `P${i + 1}`, lat: parseFloat(c[ia]), lon: parseFloat(c[io]) }; }).filter((p) => !isNaN(p.lat) && !isNaN(p.lon));
}

/* Lee un inventario oficial en CSV. Columnas reconocidas (en cualquier orden): nombre, lat, lon, altitud, area, region/departamento, tipo, vertiente/cuenca */
export function parseLakes(text) {
  const rows = text.split(/\r?\n/).filter((l) => l.trim()); if (rows.length < 2) return [];
  const sep = rows[0].includes(';') ? ';' : rows[0].includes('\t') ? '\t' : ',', norm = (h) => h.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^"|"$/g, '');
  const head = rows[0].split(sep).map(norm), col = (re) => head.findIndex((h) => re.test(h));
  const ix = { name: col(/^(nom|name|lagun|lago)/), lat: col(/^lat/), lon: col(/^(lon|lng)/), alt: col(/^(alt|elev|cota)/), area: col(/^(area|superf)/), dep: col(/^(dep|reg|prov)/), type: col(/^(tipo|type|clase)/), vert: col(/^(vert|cuenc|basin|aaa)/) };
  if (ix.lat < 0 || ix.lon < 0) return [];
  const numf = (v) => parseFloat(String(v ?? '').replace(/"/g, '').replace(',', sep === ',' ? ',' : '.'));
  const tkeys = Object.keys(TYPES), guess = (t, alt) => { const n = norm(String(t || '')); const k = tkeys.find((q) => n.startsWith(q.slice(0, 5))); return k || (alt >= 4400 ? 'glaciar' : alt >= 3000 ? 'altoandino' : alt >= 800 ? 'embalse' : 'amazonico'); };
  return rows.slice(1).map((r, i) => { const c = r.split(sep), lat = numf(c[ix.lat]), lon = numf(c[ix.lon]), alt = ix.alt >= 0 ? numf(c[ix.alt]) || 0 : 0, area = ix.area >= 0 ? numf(c[ix.area]) || 0.1 : 0.1;
    return { id: 'u' + i, name: ix.name >= 0 ? String(c[ix.name]).replace(/"/g, '').trim() : `Lago ${i + 1}`, lat, lon, alt, area, dep: ix.dep >= 0 ? String(c[ix.dep]).replace(/"/g, '').trim() : '—', type: guess(ix.type >= 0 ? c[ix.type] : '', alt), vert: ix.vert >= 0 ? String(c[ix.vert]).replace(/"/g, '').trim() : '—' }; }).filter((l) => !isNaN(l.lat) && !isNaN(l.lon) && Math.abs(l.lat) <= 90 && Math.abs(l.lon) <= 180);
}

export const vertName = (v, lang) => (lang === 'es' ? v : ({ Atlántico: 'Atlantic', Pacífico: 'Pacific' }[v] || v));
