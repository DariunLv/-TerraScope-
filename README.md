# Detectives de Tendencias (React)
Equipo The Innovators · NASA Space Apps 2026 · Moquegua

Stack: Vite, React, Mantine, Framer Motion, GSAP, react-globe.gl, MapLibre + NASA GIBS, Zustand, canvas-confetti.

```bash
npm install
npm run dev      # desarrollo
npm run build    # produce dist/ (se puede subir a GitHub Pages / Netlify / Vercel)
```
- Modo "Datos reales" usa NASA POWER (requiere internet). Si falla, cae a datos de práctica simulados y lo avisa.
- Estadística en `src/lib/stats.js` (Mann-Kendall, Sen+IC, regresión+t, TFPW, Pettitt).
- Literatura y brechas: `docs/REVISION_LITERATURA.md` y `src/gaps.js`.
- Textos ES/EN: `src/i18n.js`.

## v2
- Componentes de [React Bits](https://reactbits.dev) en `src/rb/` (Aurora, Particles, SplitText, BlurText, GradientText, ShinyText, CountUp, SpotlightCard, Magnet, StarBorder, ClickSpark, ScrollVelocity, Stepper). Licencia MIT + Commons Clause: se pueden usar dentro de tu app, no revender los componentes solos.
- Nuevo: franjas de calentamiento, mapa de calor año×mes, correlaciones, comparar dos lugares, casos del detective, checklist del reto y equipo.

## v3
- Modo oscuro (por defecto) y claro con botón en la barra; paleta cian/violeta/rosa/ámbar.
- Sin emojis: solo iconos Tabler.
- Análisis avanzado (pestañas del laboratorio): Plotly (series con zoom, banda de confianza, descomposición, dispersión), Observable Plot (histogramas, facetas, ECDF, bootstrap), ECharts (cajas por mes, radar, mapa de calor), D3 (pendiente de Sen móvil), visx (ACF), Nivo (matriz de correlación).
- Estadística extra en `src/lib/advanced.js`: Jarque-Bera, ACF, descomposición clásica, Sen móvil, bootstrap en bloques, Welch, Mann-Whitney, extremos.
- Importar CSV (Giovanni, AppEEARS, CDO, KNMI): fecha AAAA-MM(-DD) + valor.
- SciChart.js no se incluyó: requiere licencia y WASM; Plotly con WebGL cubre grandes volúmenes.

## v5 (actual)
- Tema claro; acentos oscuros en verde (#0c5a43) y azul (#1e3a8a); vidrio solo en barra, veredicto y modal.
- Planeta 3D en el inicio (con respaldo si no hay WebGL) y mapa mundial D3 que funciona sin conexión; modal satelital NASA GIBS con contorno de países de respaldo.
- Escaneo de 30 lugares con corrección FDR; preguntas guiadas; pestañas nuevas: Periodos, Diario (SciChart), Validación; superficie 3D.
- SciChart usa licencia Community (uso no comercial, con marca de agua). Los .wasm están en `public/`.
- Sin probar desde el entorno de desarrollo: conexión real a NASA POWER, teselas GIBS y enlaces "Abrir en mi punto".

## v6: plataforma por secciones + Lagos del Perú
- Navegación por 6 secciones (Inicio, Explorar, Laboratorio, Lagos, Aprender, Proyecto); en celular, barra inferior. Un solo interruptor "Práctica" para trabajar sin internet.
- Planeta claro e interactivo: gira, toca un país o un punto, acerca; al acercarte mucho pasa al mapa satelital. En Explorar se alterna entre mapa plano y globo 3D.
- Laboratorio: tres formas de empezar (preguntas guiadas, casos, manual). Resultado en 3 pestañas: Resumen (gráfico con selección de periodo que recalcula la tendencia), Análisis avanzado (4 grupos) y Comparar (zoom sincronizado).
- Lagos del Perú (`src/components/Lakes.jsx`, `LakeMap.jsx`, `src/lib/lakes.js`): inventario de referencia de 39 lagos y embalses (valores APROXIMADOS, reemplazar por ANA/INAIGEM), mapa con imágenes MODIS por año, tendencia según altitud, cobertura de puntos de monitoreo (ejemplo; sube el CSV oficial con columnas lat, lon) y simulación didáctica de clasificación del agua por franja de altitud.
- Aprender: ideas clave, juego "¿tendencia o ruido?" y ejercicio para ajustar la línea de tendencia.
- Proyecto: objetivos, arquitectura, brechas (incluye lagos), requisitos del reto, recursos de la NASA y equipo.
- Librerías de gráficos: Plotly, ECharts, D3, visx, Nivo, Observable Plot y SciChart (licencia Community, con marca de agua).
- Pendiente de comprobar con internet: NASA POWER en vivo, imágenes de NASA GIBS y enlaces "Abrir en mi punto".


## v7 (actual): planeta CesiumJS, inteligencia ambiental y lagos ampliado

Instalar y ejecutar (hay dependencias nuevas, así que `npm install` es obligatorio):

```
npm install
npm run dev
```

**Planeta 3D con CesiumJS** (`src/components/EarthView.jsx`, carga diferida desde `Earth.jsx`)
- Un solo componente para la portada, el explorador y los lagos.
- 12 capas satelitales de NASA GIBS por fecha: color real, falso color (agua en negro), detalle HLS de 30 m, temperatura de superficie, lluvia IMERG, NDVI, nieve, humedad del suelo SMAP, aerosoles, incendios y luces nocturnas.
- Eventos naturales en curso de NASA EONET sobre el planeta.
- En Lagos: imagen por año y cortina para comparar dos años.
- Funciona sin internet con el relieve incluido en Cesium; no usa token de Cesium ion.
- Los archivos estáticos de Cesium se copian solos desde `node_modules` (ver `vite.config.js`), no se guardan en el repositorio.

**Asistente por pasos** (`Wizard.jsx`): Mantine Stepper + React Hook Form + Zod + Framer Motion. Cada paso se valida antes de avanzar. El mismo patrón se usa en el reporte ciudadano.

**Anomalías y futuro** (`src/lib/intel.js`, `Intel.jsx`)
- Normalidad contextual: aprende lo normal de cada mes y marca lo inusual. Se compara con un umbral fijo y con Isolation Forest.
- Ficha de evidencia por anomalía y anomalía conjunta multivariable (distancia de Mahalanobis).
- Pronóstico con bandas de 50 % y 90 % (tendencia + estación + AR1, 400 simulaciones) y validación retrospectiva: si el método no habría acertado, la app se abstiene.
- Alerta temprana: varianza y autocorrelación móviles con significancia por series simuladas.
- Relleno de meses faltantes, marcados como reconstruidos.

**Lagos** (`LakeTools.jsx`, `src/lib/lakeclim.js`)
- Balance lluvia − evaporación de cada lago, tendencia y escenarios de temperatura y lluvia.
- Vigía: revisa todos los lagos y ordena los que se salen de lo normal (con corrección Benjamini-Hochberg).
- Satélites que observan cada lago: conteo en vivo en el catálogo Earthdata CMR (HLS, OPERA, SWOT, MODIS).
- Reportes ciudadanos contrastados con los datos; se guardan en el navegador.
- Carga del inventario oficial en CSV: todo el módulo se recalcula con él.

**Datos en vivo** (`src/lib/nasa.js`, `DataHub.jsx`): prueba de conexión de las siete fuentes, buscador de datasets, foto diaria EPIC y fototeca de la NASA.

**Límites conocidos**
- Las conexiones en vivo (POWER, GIBS, EONET, CMR, EPIC, fototeca) no se pudieron probar desde el entorno de desarrollo, que no tiene salida a la NASA. Usa Proyecto → Datos en vivo → Probar conexión.
- El balance de agua es un índice climático de MERRA-2, no el nivel medido del lago.
- El inventario de 39 lagos es de referencia, con valores aproximados.

## Centro de decisiones con IA (v9)

**Centinela (IA que vigila sola)** — `src/lib/agent.js`, `AgentPanel.jsx`. Mientras la app esté abierta revisa todos los lagos cada 15 minutos (observar, aprender, descubrir, hipótesis, evidencia, verificar), guarda su memoria en el navegador, avisa los cambios de semáforo y verifica sus propios pronósticos anteriores. Botón "Centinela" en la barra.

**Asistente con modelo de lenguaje real (opcional)** — `src/lib/llm.js`. Ajustes (engranaje del chat): *Reglas* (sin red), *IA local* con Ollama (`ollama pull llama3.2`, y `OLLAMA_ORIGINS=*`), o *Claude* con tu clave de API (se guarda solo en tu navegador). El modelo solo recibe un resumen numérico del análisis y tiene prohibido inventar. Si falla, responde con reglas.

**Datos reales ya descargados (modo sin internet)**
1. Con internet: `npm run datos` (genera `public/datos/clima-lagos.json`, 68 puntos, NASA POWER).
2. `npm run build`. La app usa primero esa instantánea, luego la caché del navegador, luego la descarga en vivo y, al final, datos de práctica.
3. Inventario oficial: Lagos → subir CSV. Plantillas en `public/plantillas/`. `npm run datos -- archivo.csv` descarga datos para tus propios lagos.

**Validación retrospectiva** (sección "¿Habría avisado a tiempo?"): recalcula el semáforo mes a mes con datos que existían entonces y mide con cuántos meses de anticipación avisó antes del mínimo de agua. Con datos de práctica es solo un ejemplo; úsala con la instantánea real (por ejemplo desde 2015 para Pasto Grande).

**Demo y pruebas con usuarios**: ver `GUION_DEMO.md` y `GUIA_PRUEBA_USUARIOS.md`. El recorrido guiado está en la portada; la encuesta guarda en el navegador y se exporta a CSV.

**Planeta 3D**: se carga solo cuando entra en pantalla y, con conexión lenta o ahorro de datos, espera un botón.

## IA en línea gratis para Vercel
La función `api/chat.js` conecta el asistente con un modelo gratuito sin exponer claves.
1. Crea una clave gratis en console.groq.com (o en aistudio.google.com para Gemini).
2. En Vercel: Project → Settings → Environment Variables → `GROQ_API_KEY` (o `GEMINI_API_KEY`) → Redeploy.
3. Abre `https://TU-APP.vercel.app/api/chat`: debe mostrar `{"ok":true,"provider":"groq"}`.
En `npm run dev` local no existe `/api`: el asistente cae a reglas (o usa Ollama). Para probar local: `npx vercel dev`.

## Estructura del código (v10)
```
src/
  core/        store, idioma, paleta
  layout/      TopBar (portada), Sidebar + TopStrip (dashboard), Tour, PageHead, Background, MapModal
  killa/       mascota Killa (36 poses, animada) y KillaSay / KillaNote
  features/    home · explore · lab · decide · lakes · learn · project  (cada módulo con sus archivos)
  shared/      earth (planeta 3D), charts, analysis
  lib/         analysis (estadística), nasa (datos), geo (mapas)
  ui/          componentes visuales reutilizables (React Bits)
  styles/      theme.css
api/chat.js    IA en línea (Vercel)
public/killa   poses de Killa en WebP
```
La portada muestra la barra arriba. Al entrar a cualquier sección aparece el menú lateral (contraíble); en celular se usa la barra inferior.
