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

## v6 (actual): plataforma por secciones + Lagos del Perú
- Navegación por 6 secciones (Inicio, Explorar, Laboratorio, Lagos, Aprender, Proyecto); en celular, barra inferior. Un solo interruptor "Práctica" para trabajar sin internet.
- Planeta claro e interactivo: gira, toca un país o un punto, acerca; al acercarte mucho pasa al mapa satelital. En Explorar se alterna entre mapa plano y globo 3D.
- Laboratorio: tres formas de empezar (preguntas guiadas, casos, manual). Resultado en 3 pestañas: Resumen (gráfico con selección de periodo que recalcula la tendencia), Análisis avanzado (4 grupos) y Comparar (zoom sincronizado).
- Lagos del Perú (`src/components/Lakes.jsx`, `LakeMap.jsx`, `src/lib/lakes.js`): inventario de referencia de 39 lagos y embalses (valores APROXIMADOS, reemplazar por ANA/INAIGEM), mapa con imágenes MODIS por año, tendencia según altitud, cobertura de puntos de monitoreo (ejemplo; sube el CSV oficial con columnas lat, lon) y simulación didáctica de clasificación del agua por franja de altitud.
- Aprender: ideas clave, juego "¿tendencia o ruido?" y ejercicio para ajustar la línea de tendencia.
- Proyecto: objetivos, arquitectura, brechas (incluye lagos), requisitos del reto, recursos de la NASA y equipo.
- Librerías de gráficos: Plotly, ECharts, D3, visx, Nivo, Observable Plot y SciChart (licencia Community, con marca de agua).
- Pendiente de comprobar con internet: NASA POWER en vivo, imágenes de NASA GIBS y enlaces "Abrir en mi punto".
