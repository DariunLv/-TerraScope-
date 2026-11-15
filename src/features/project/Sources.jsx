import { motion } from 'framer-motion';
import { IconExternalLink, IconPlugConnected, IconFileTypeCsv, IconBookmark, IconMapPin } from '@tabler/icons-react';
import { useStore } from '../../core/store';
import { useT } from '../../core/i18n';
const S = [
  { n: 'NASA POWER (MERRA-2 · CERES)', u: 'https://power.larc.nasa.gov/data-access-viewer/', st: 0, es: 'Series mensuales y diarias por punto. Es la fuente principal del laboratorio y del escaneo mundial.', en: 'Monthly and daily point series. Main source of the lab and the world scan.' },
  { n: 'NASA GIBS / Worldview (MODIS · VIIRS · GPM)', u: 'https://worldview.earthdata.nasa.gov/', st: 0, deep: (p) => `https://worldview.earthdata.nasa.gov/?v=${p.lon - 8},${p.lat - 5},${p.lon + 8},${p.lat + 5}`, es: 'Doce capas satelitales sobre el planeta 3D, por fecha: color real, falso color, temperatura, lluvia, vegetación, nieve, humedad del suelo, aerosoles, incendios y luces.', en: 'Twelve satellite layers on the 3D planet, by date: true color, false color, temperature, rain, vegetation, snow, soil moisture, aerosols, fires and lights.' },
  { n: 'NASA EONET · eventos naturales', u: 'https://eonet.gsfc.nasa.gov/', st: 0, es: 'Incendios, tormentas y volcanes en curso. Se ven sobre el planeta 3D en Explorar.', en: 'Ongoing wildfires, storms and volcanoes. Shown on the 3D planet in Explore.' },
  { n: 'Earthdata Search · catálogo CMR', u: 'https://search.earthdata.nasa.gov/', st: 0, deep: (p) => `https://search.earthdata.nasa.gov/search?sp%5B0%5D=${p.lon}%2C${p.lat}`, es: 'Catálogo de todos los datasets de la NASA. Lo consultamos en vivo para buscar datasets y contar las escenas de cada satélite sobre cada lago.', en: 'Catalog of every NASA dataset. Queried live to find datasets and count each satellite’s scenes over each lake.' },
  { n: 'NASA Open APIs (api.nasa.gov) · EPIC', u: 'https://api.nasa.gov/', st: 0, es: 'Foto diaria de la Tierra completa tomada por DSCOVR/EPIC.', en: 'Daily full-Earth photo taken by DSCOVR/EPIC.' },
  { n: 'NASA Image and Video Library', u: 'https://images.nasa.gov/', st: 0, es: 'Fotos de la NASA del lugar que investigas.', en: 'NASA photos of the place you investigate.' },
  { n: 'FIRMS · incendios MODIS y VIIRS', u: 'https://firms.modaps.eosdis.nasa.gov/map/', st: 0, deep: (p) => `https://firms.modaps.eosdis.nasa.gov/map/#d:24hrs;@${p.lon},${p.lat},7.0z`, es: 'Focos de calor. La capa de incendios del planeta usa las mismas detecciones MODIS a través de GIBS.', en: 'Hot spots. The planet’s fire layer uses the same MODIS detections through GIBS.' },
  { n: 'SMAP · humedad del suelo', u: 'https://smap.jpl.nasa.gov/', st: 0, es: 'Capa de humedad del suelo en el planeta 3D. Las series por punto se bajan con AppEEARS y se suben en CSV.', en: 'Soil-moisture layer on the 3D planet. Point series come from AppEEARS and upload as CSV.' },
  { n: 'OPERA · agua superficial y radar', u: 'https://www.jpl.nasa.gov/go/opera', st: 0, es: 'Mapas de agua ya clasificados (DSWx) y radar Sentinel-1. La app cuenta sus escenas sobre cada lago.', en: 'Pre-classified water maps (DSWx) and Sentinel-1 radar. The app counts their scenes over each lake.' },
  { n: 'ASF Vertex · NISAR y Sentinel-1', u: 'https://search.asf.alaska.edu/', st: 2, es: 'Radar que ve con nubes y de noche. Procesarlo requiere el servidor de la siguiente etapa.', en: 'Radar that sees through clouds and at night. Processing it needs the next-stage server.' },
  { n: 'DAHITI · Hydroweb (nivel de lagos)', u: 'https://dahiti.dgfi.tum.de/', st: 1, es: 'Series de nivel de agua por altimetría satelital. Se descargan y se suben en CSV para probar su tendencia.', en: 'Satellite-altimetry water-level series. Download and upload as CSV to test their trend.' },
  { n: 'Global Surface Water (Landsat)', u: 'https://global-surface-water.appspot.com/', st: 2, es: 'Historia del agua superficial desde 1984 para contrastar con el inventario de lagos.', en: 'Surface-water history since 1984 to check against the lake inventory.' },
  { n: 'Earthdata · cuenta gratuita', u: 'https://urs.earthdata.nasa.gov/', st: 2, es: 'Cuenta para descargar escenas completas. La app no la necesita para funcionar.', en: 'Account to download full scenes. The app does not need it to work.' },
  { n: 'data.nasa.gov', u: 'https://data.nasa.gov/', st: 2, es: 'Catálogo general de datos abiertos de la NASA.', en: 'NASA’s general open-data catalog.' },
  { n: 'Giovanni (MODIS · OMI · AIRS · GPM · MERRA-2)', u: 'https://giovanni.gsfc.nasa.gov/giovanni/', st: 1, deep: (p) => `https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2000-01-01T00:00:00Z&endtime=2025-12-31T23:59:59Z&bbox=${p.lon - 1},${p.lat - 1},${p.lon + 1},${p.lat + 1}`, es: 'Crea la serie de tu región, descarga el CSV y súbelo: se analiza con las mismas pruebas.', en: 'Build your region’s series, download the CSV and upload it: analysed with the same tests.' },
  { n: 'Hydrology Time Series · Data Rods (GLDAS)', u: 'https://disc.gsfc.nasa.gov/information/tools?title=Hydrology%20Data%20Rods', st: 1, deep: (p) => `https://hydro1.gesdisc.eosdis.nasa.gov/daac-bin/access/timeseries.cgi?variable=GLDAS2:GLDAS_NOAH025_3H_v2.1:SoilMoi0_10cm_inst&location=GEOM:POINT(${p.lon},%20${p.lat})&startDate=2000-01-01T00&endDate=2025-12-31T21&type=asc2`, es: 'Humedad del suelo, lluvia y escorrentía de GLDAS. El archivo ASCII se sube tal cual.', en: 'GLDAS soil moisture, rain and runoff. The ASCII file uploads as is.' },
  { n: 'AppEEARS (MODIS, VIIRS, SMAP)', u: 'https://appeears.earthdatacloud.nasa.gov/', st: 1, es: 'Series por punto de vegetación (NDVI) y temperatura de superficie. Compatible por CSV.', en: 'Point series of vegetation (NDVI) and surface temperature. CSV compatible.' },
  { n: 'Climate Data Online (NCEI)', u: 'https://www.ncei.noaa.gov/cdo-web/', st: 1, es: 'Estaciones históricas. Úsalas en la pestaña Validación para comprobar el dato del modelo.', en: 'Historical stations. Use them in the Validation tab to check the model value.' },
  { n: 'KNMI Climate Explorer', u: 'https://climexp.knmi.nl/', st: 1, es: 'Series e índices como El Niño. Leemos su formato de columnas año-mes-valor.', en: 'Series and indices such as El Niño. We read its year-month-value column format.' },
  { n: 'CUAHSI', u: 'https://www.cuahsi.org/', st: 1, es: 'Datos hidrológicos de universidades. Compatible por CSV.', en: 'University hydrology data. CSV compatible.' },
  { n: 'Acker et al. (2009) · SeaWiFS', u: 'https://ntrs.nasa.gov/api/citations/20090042747/downloads/20090042747.pdf', st: 2, es: 'Artículo modelo del reto: series de clorofila y prueba de significancia. Seguimos su flujo.', en: 'The challenge’s model article: chlorophyll series and significance testing. We follow its workflow.' },
  { n: 'SWOT (NASA · CNES · CSA · UKSA)', u: 'https://swot.jpl.nasa.gov/', st: 2, es: 'Nivel de lagos y embalses: siguiente paso para vigilar Pasto Grande.', en: 'Lake and reservoir levels: next step to watch Pasto Grande.' },
  { n: 'RADARSAT Constellation (CSA)', u: 'https://www.asc-csa.gc.ca/eng/satellites/radarsat/', st: 2, es: 'Radar que ve de noche y con nubes: humedad del suelo y cambios del terreno.', en: 'Radar that sees at night and through clouds: soil moisture and terrain change.' },
  { n: 'GEO.ca', u: 'https://geo.ca/', st: 2, es: 'Datos geoespaciales abiertos de Canadá, para replicar el método allí.', en: 'Canada’s open geospatial data, to replicate the method there.' },
];
export default function Sources() {
  const { lang } = useT(); const place = useStore((s) => s.place);
  const L = (a, b) => (lang === 'es' ? a : b);
  const st = [[L('Conectado', 'Connected'), IconPlugConnected, '#0c5a43'], [L('Por archivo CSV', 'Via CSV file'), IconFileTypeCsv, '#1e3a8a'], [L('Referencia', 'Reference'), IconBookmark, '#5b6b8c']];
  return (
    <section id="datos"><div className="wrap">
      <h2>{L('Todas las fuentes y cómo las usamos', 'Every source and how we use it')}</h2>
      <p className="sub">{L('Todos los recursos de la pestaña Resources del reto y cómo los usa el programa. Los enlaces “en mi punto” se arman con las coordenadas que elegiste.', 'Every resource on the challenge’s Resources tab and how the program uses it. “At my point” links are built from the coordinates you picked.')}</p>
      <div className="src">
        {S.map((x, i) => { const [lab, Ic, col] = st[x.st]; return (
          <motion.div key={x.n} className="card srcc" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.06 }}>
            <span className="stag" style={{ color: col, borderColor: col }}><Ic size={13} /> {lab}</span>
            <b style={{ display: 'block', margin: '8px 0 4px' }}>{x.n}</b>
            <p className="mini" style={{ fontSize: 14 }}>{x[lang]}</p>
            <div className="row" style={{ gap: 14 }}>
              <a className="ref" href={x.u} target="_blank" rel="noreferrer">{L('Abrir', 'Open')} <IconExternalLink size={13} style={{ verticalAlign: '-2px' }} /></a>
              {x.deep && <a className="ref" href={x.deep(place)} target="_blank" rel="noreferrer"><IconMapPin size={13} style={{ verticalAlign: '-2px' }} /> {L('Abrir en mi punto', 'Open at my point')}</a>}
            </div>
          </motion.div>); })}
      </div>
      <p className="mini" style={{ marginTop: 14 }}>{L('Guías de método del reto aplicadas: pruebas de tendencia (Mann-Kendall, t, intervalos de confianza) y guía de significancia estadística. Método completo: Mann-Kendall clásico, estacional y con TFPW, pendiente de Sen, regresión con prueba t, Pettitt, bootstrap en bloques, Welch, Mann-Whitney, Jarque-Bera, Benjamini-Hochberg y descomposición clásica.', 'Challenge method guides applied: trend tests (Mann-Kendall, t, confidence intervals) and the statistical significance guide. Full method: classic, seasonal and TFPW Mann-Kendall, Sen slope, regression with t-test, Pettitt, block bootstrap, Welch, Mann-Whitney, Jarque-Bera, Benjamini-Hochberg and classical decomposition.')}</p>
    </div></section>
  );
}
