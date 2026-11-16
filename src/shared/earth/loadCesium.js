let viewPromise;
// One shared download, started at page entry and reused by every Cesium map.
export function loadCesium() {
  if (!viewPromise) viewPromise = import('./EarthView').catch((error) => { viewPromise = null; throw error; });
  return viewPromise;
}
export async function prepareCesium() {
  const base = globalThis.CESIUM_BASE_URL || new URL('cesium/', document.baseURI).href;
  const files = [
    ['Assets/Textures/NaturalEarthII/tilemapresource.xml', 'xml'],
    ['Assets/Textures/NaturalEarthII/0/0/0.jpg', 'image/'],
    ['Assets/Textures/NaturalEarthII/0/1/0.jpg', 'image/'],
    ['Workers/createEllipseGeometry.js', 'javascript'],
  ];
  await Promise.all([loadCesium(), ...files.map(async ([path, type]) => {
    const response = await fetch(new URL(path, base), { cache: 'force-cache', signal: AbortSignal.timeout(30000) });
    if (!response.ok || !response.headers.get('content-type')?.includes(type)) throw new Error(`No se pudo cargar el recurso de Cesium: ${path}`);
    await response.arrayBuffer();
  })]);
}
