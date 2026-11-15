/* Fuentes abiertas de la NASA usadas por la app (todas sin clave y con CORS):
   GIBS (imágenes), EONET (eventos naturales), CMR / Earthdata Search (catálogo y escenas),
   NASA Image Library (fotos) y EPIC/DSCOVR (la Tierra completa de hoy). */

export const GIBS_WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
export const GIBS_WMTS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/';

/* Capas satelitales. lvl = nivel de teselas WMTS (rápido); sin lvl se pide por WMS (más lento, pero admite cualquier capa).
   lag = días de retraso habituales del producto. over = capa transparente que se dibuja encima del relieve. */
export const LAYERS = [
  { id: 'base', layer: 'BlueMarble_ShadedRelief_Bathymetry', lvl: 8, ext: 'jpeg', fixed: true, es: ['Relieve natural', 'Mosaico Blue Marble de la NASA: la Tierra sin nubes.'], en: ['Natural relief', 'NASA Blue Marble mosaic: a cloud-free Earth.'] },
  { id: 'tc', layer: 'MODIS_Terra_CorrectedReflectance_TrueColor', lvl: 9, ext: 'jpg', lag: 1, from: 2000, es: ['Color real del día', 'Lo que vio el satélite Terra (MODIS) ese día, con nubes y todo.'], en: ['True color of the day', 'What the Terra satellite (MODIS) saw that day, clouds included.'] },
  { id: 'fc', layer: 'MODIS_Terra_CorrectedReflectance_Bands721', lvl: 9, ext: 'jpg', lag: 1, from: 2000, es: ['Falso color: agua en negro', 'El agua se ve negra o azul oscuro, la vegetación verde y el suelo desnudo rosado. Ideal para ver lagos.'], en: ['False color: water in black', 'Water looks black or dark blue, vegetation green and bare soil pink. Ideal for lakes.'] },
  { id: 'hls', layer: 'HLS_S30_Nadir_BRDF_Adjusted_Reflectance', lag: 4, from: 2023, es: ['Detalle de 30 m (Sentinel-2)', 'Producto HLS de la NASA. Cada pasada cubre solo una franja: si sale vacío, prueba otra fecha.'], en: ['30 m detail (Sentinel-2)', 'NASA HLS product. Each pass covers a strip only: if empty, try another date.'] },
  { id: 'lst', layer: 'MODIS_Terra_Land_Surface_Temp_Day', lvl: 7, ext: 'png', lag: 2, from: 2000, over: true, es: ['Temperatura de la superficie', 'Temperatura del suelo de día. Azul es frío, rojo y amarillo es caliente.'], en: ['Land surface temperature', 'Daytime ground temperature. Blue is cold, red and yellow hot.'] },
  { id: 'gpm', layer: 'IMERG_Precipitation_Rate', lag: 2, from: 2000, over: true, es: ['Lluvia (GPM IMERG)', 'Dónde llovía. Verde es lluvia débil; amarillo y rojo, lluvia fuerte.'], en: ['Rainfall (GPM IMERG)', 'Where it was raining. Green is light rain; yellow and red, heavy rain.'] },
  { id: 'ndvi', layer: 'MODIS_Terra_NDVI_8Day', lag: 12, from: 2000, over: true, es: ['Vegetación (NDVI)', 'Qué tan verde está la vegetación. Más verde significa más vegetación activa.'], en: ['Vegetation (NDVI)', 'How green vegetation is. Greener means more active vegetation.'] },
  { id: 'snow', layer: 'MODIS_Terra_NDSI_Snow_Cover', lvl: 8, ext: 'png', lag: 2, from: 2000, over: true, es: ['Nieve', 'Cobertura de nieve vista por MODIS.'], en: ['Snow cover', 'Snow cover seen by MODIS.'] },
  { id: 'sm', layer: 'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture', lag: 5, from: 2015, over: true, es: ['Humedad del suelo (SMAP)', 'Agua en la zona de raíces según la misión SMAP.'], en: ['Soil moisture (SMAP)', 'Root-zone water from the SMAP mission.'] },
  { id: 'aod', layer: 'MODIS_Terra_Aerosol', lvl: 6, ext: 'png', lag: 2, from: 2000, over: true, es: ['Aerosoles: polvo y humo', 'Partículas en el aire. Los tonos oscuros indican aire más cargado.'], en: ['Aerosols: dust and smoke', 'Particles in the air. Darker tones mean more loaded air.'] },
  { id: 'fire', layer: 'MODIS_Terra_Thermal_Anomalies_All', lag: 1, from: 2000, over: true, es: ['Focos de calor e incendios', 'Puntos calientes detectados por MODIS (los mismos datos que usa FIRMS).'], en: ['Hot spots and fires', 'Hot spots detected by MODIS (the data FIRMS uses).'] },
  { id: 'night', layer: 'VIIRS_CityLights_2012', lvl: 8, ext: 'jpg', fixed: true, es: ['Luces nocturnas', 'La Tierra de noche: muestra dónde vive la gente.'], en: ['Night lights', 'Earth at night: it shows where people live.'] },
];
export const layerById = (id) => LAYERS.find((l) => l.id === id) || LAYERS[0];
export const isoDaysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
export const tileUrl = (def, date) => `${GIBS_WMTS}${def.layer}/default/${def.fixed ? '' : date + '/'}GoogleMapsCompatible_Level${def.lvl}/{z}/{y}/{x}.${def.ext}`;

async function get(url, ms = 15000) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { signal: c.signal }); if (!r.ok) throw new Error('http ' + r.status); return await r.json(); } finally { clearTimeout(t); }
}

/* ---------- EONET: eventos naturales abiertos ---------- */
export const EVENT_CATS = {
  wildfires: ['Incendios', 'Wildfires', '#ea580c'], severeStorms: ['Tormentas', 'Severe storms', '#1d4ed8'], volcanoes: ['Volcanes', 'Volcanoes', '#b91c1c'],
  seaLakeIce: ['Hielo marino', 'Sea and lake ice', '#0891b2'], floods: ['Inundaciones', 'Floods', '#0e7490'], drought: ['Sequías', 'Drought', '#a16207'],
  dustHaze: ['Polvo y bruma', 'Dust and haze', '#92400e'], landslides: ['Deslizamientos', 'Landslides', '#7c2d12'], other: ['Otros', 'Other', '#475569'],
};
export async function eonetEvents(days = 30) {
  const j = await get(`https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=${days}&limit=250`, 20000);
  return (j.events || []).map((e) => {
    const g = (e.geometry || []).filter((x) => x.type === 'Point').pop(); if (!g) return null;
    const cat = e.categories?.[0]?.id; return { id: e.id, title: e.title, cat: EVENT_CATS[cat] ? cat : 'other', date: String(g.date || '').slice(0, 10), lon: g.coordinates[0], lat: g.coordinates[1], link: e.sources?.[0]?.url || e.link };
  }).filter(Boolean);
}

/* ---------- CMR (motor de Earthdata Search): catálogo y escenas ---------- */
const CMR = 'https://cmr.earthdata.nasa.gov/search/';
export async function cmrCollections(q) {
  const base = `${CMR}collections.json?keyword=${encodeURIComponent(q)}&page_size=12`;
  let j; try { j = await get(base + '&sort_key%5B%5D=-usage_score'); } catch { j = await get(base); }
  return (j.feed?.entry || []).map((e) => ({ id: e.id, title: e.title, short: e.short_name, version: e.version_id, center: e.data_center, start: (e.time_start || '').slice(0, 4), end: (e.time_end || '').slice(0, 4), summary: e.summary || '' }));
}
/* Misiones útiles para vigilar un lago: “constelación virtual”. pat = patrón de nombre corto en CMR. */
export const MISSIONS = [
  { id: 'hlsl', pat: 'HLSL30', res: '30 m', es: ['Landsat 8 y 9 (HLS)', 'Imagen óptica: superficie del agua y vegetación.'], en: ['Landsat 8 and 9 (HLS)', 'Optical image: water surface and vegetation.'] },
  { id: 'hlss', pat: 'HLSS30', res: '30 m', es: ['Sentinel-2 (HLS)', 'Imagen óptica con revisita frecuente.'], en: ['Sentinel-2 (HLS)', 'Optical image with frequent revisit.'] },
  { id: 'dswx', pat: 'OPERA_L3_DSWX-HLS*', res: '30 m', es: ['OPERA: extensión de agua', 'Mapa de agua superficial ya clasificado por la NASA (producto óptico: necesita cielo despejado).'], en: ['OPERA: surface water extent', 'Surface water map already classified by NASA (optical product: needs clear sky).'] },
  { id: 'rtc', pat: 'OPERA_L2_RTC-S1*', res: '30 m', es: ['Radar Sentinel-1 (OPERA)', 'Radar: ve el agua aunque haya nubes.'], en: ['Sentinel-1 radar (OPERA)', 'Radar: sees water through clouds.'] },
  { id: 'swot', pat: 'SWOT_L2_HR_LakeSP*', res: '≥ 250 m', es: ['SWOT: nivel y área de lagos', 'Altura y superficie del agua de cada lago.'], en: ['SWOT: lake level and area', 'Water height and surface of each lake.'] },
  { id: 'mod13', pat: 'MOD13Q1', res: '250 m', es: ['MODIS: vegetación', 'Índice de vegetación cada 16 días desde 2000.'], en: ['MODIS: vegetation', '16-day vegetation index since 2000.'] },
  { id: 'mod11', pat: 'MOD11A2', res: '1 km', es: ['MODIS: temperatura de superficie', 'Temperatura del suelo y del agua cada 8 días.'], en: ['MODIS: surface temperature', '8-day land and water temperature.'] },
];
export async function cmrCoverage(m, box, y0, y1) {
  const cj = await get(`${CMR}collections.json?short_name=${encodeURIComponent(m.pat)}&options%5Bshort_name%5D%5Bpattern%5D=true&page_size=20&sort_key%5B%5D=-revision_date`);
  const col = (cj.feed?.entry || [])[0]; if (!col) return { hits: null };
  const g = await get(`${CMR}granules.umm_json?collection_concept_id=${col.id}&bounding_box=${box.join(',')}&temporal=${y0}-01-01T00:00:00Z,${y1}-12-31T23:59:59Z&page_size=1`, 25000);
  return { hits: g.hits ?? null, id: col.id, short: col.short_name, version: col.version_id, start: (col.time_start || '').slice(0, 4), link: `https://search.earthdata.nasa.gov/search/granules?p=${col.id}&sb%5B0%5D=${encodeURIComponent(box.join(','))}` };
}

/* ---------- Fototeca de la NASA ---------- */
export async function nasaImages(q, n = 8) {
  const j = await get(`https://images-api.nasa.gov/search?q=${encodeURIComponent(q)}&media_type=image&page_size=${n}`);
  return (j.collection?.items || []).map((it) => { const d = it.data?.[0] || {}; return { id: d.nasa_id, title: d.title, date: String(d.date_created || '').slice(0, 10), thumb: it.links?.[0]?.href, page: `https://images.nasa.gov/details/${encodeURIComponent(d.nasa_id)}` }; }).filter((x) => x.thumb);
}

/* ---------- EPIC (DSCOVR): la Tierra completa, vista desde 1,5 millones de km ---------- */
export async function epicLatest() {
  let j; try { j = await get('https://epic.gsfc.nasa.gov/api/natural'); } catch { j = await get('https://api.nasa.gov/EPIC/api/natural?api_key=DEMO_KEY'); }
  return (j || []).map((e) => { const [d] = String(e.date).split(' '), [y, m, dd] = d.split('-'); return { date: e.date, caption: e.caption, lat: e.centroid_coordinates?.lat, lon: e.centroid_coordinates?.lon, img: `https://epic.gsfc.nasa.gov/archive/natural/${y}/${m}/${dd}/jpg/${e.image}.jpg`, thumb: `https://epic.gsfc.nasa.gov/archive/natural/${y}/${m}/${dd}/thumbs/${e.image}.jpg` }; });
}

/* ---------- Diagnóstico: ¿responde cada fuente en vivo? ---------- */
const img = (url, ms = 12000) => new Promise((res) => { const i = new Image(), t = setTimeout(() => res(false), ms); i.onload = () => { clearTimeout(t); res(true); }; i.onerror = () => { clearTimeout(t); res(false); }; i.src = url; });
export const CHECKS = [
  ['power', 'NASA POWER', () => get('https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M&community=AG&longitude=-70.93&latitude=-17.19&start=2023&end=2023&format=JSON', 25000).then((j) => !!j?.properties?.parameter?.T2M)],
  ['gibs', 'NASA GIBS (WMTS)', () => img(tileUrl(layerById('base')).replace('{z}', '2').replace('{y}', '1').replace('{x}', '1'))],
  ['wms', 'NASA GIBS (WMS)', () => img(`${GIBS_WMS}?service=WMS&version=1.1.1&request=GetMap&layers=IMERG_Precipitation_Rate&styles=&format=image%2Fpng&transparent=true&srs=EPSG%3A4326&bbox=-90,-45,0,0&width=256&height=128&time=${isoDaysAgo(3)}`)],
  ['eonet', 'NASA EONET', () => get('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=1').then((j) => Array.isArray(j?.events))],
  ['cmr', 'Earthdata CMR', () => get(`${CMR}collections.json?keyword=lake&page_size=1`).then((j) => !!j?.feed)],
  ['images', 'NASA Image Library', () => get('https://images-api.nasa.gov/search?q=earth&media_type=image&page_size=1').then((j) => !!j?.collection)],
  ['epic', 'EPIC / DSCOVR', () => epicLatest().then((a) => a.length > 0)],
];
export async function checkSource(fn) { const t0 = performance.now(); try { const ok = await fn(); return { ok: !!ok, ms: Math.round(performance.now() - t0) }; } catch { return { ok: false, ms: Math.round(performance.now() - t0) }; } }

/* ---------- Enlaces directos al punto elegido ---------- */
export function deepLinks(lat, lon) {
  const d = isoDaysAgo(2), box = [lon - 3, lat - 2.2, lon + 3, lat + 2.2].map((v) => v.toFixed(2)).join(',');
  return {
    worldview: `https://worldview.earthdata.nasa.gov/?v=${box}&t=${d}`,
    search: `https://search.earthdata.nasa.gov/search?sp%5B0%5D=${lon.toFixed(3)}%2C${lat.toFixed(3)}`,
    firms: `https://firms.modaps.eosdis.nasa.gov/map/#d:24hrs;@${lon.toFixed(2)},${lat.toFixed(2)},7.0z`,
    giovanni: `https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2001-01-01T00:00:00Z&endtime=2024-12-31T23:59:59Z&bbox=${box}`,
  };
}
