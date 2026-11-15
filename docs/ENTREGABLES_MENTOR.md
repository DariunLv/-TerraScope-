# Entregables pedidos por el mentor

**Nombre provisional:** Detectives de Tendencias, con el módulo LAGOS-Perú.

## Problema y brechas
1. No existe una plataforma integrada tipo LAGOS para el Perú que reúna inventario de lagunas, imágenes satelitales y análisis espacial.
2. Los algoritmos que clasifican cuerpos de agua deben considerar la altitud (sombras, nieve y hielo se confunden con agua en alta montaña).
3. Falta medir qué tan representativos son los puntos de monitoreo de la ANA.
4. No hay una aplicación que junte inventarios, series satelitales y estadística espacial en una sola herramienta.
5. (Reto NASA) Es difícil elegir variables, ver cómo cambian y saber si el cambio es significativo.

## Objetivo general
Desarrollar una plataforma web interactiva para consultar, visualizar y analizar información ambiental geoespacial del Perú y del mundo, que integra datos satelitales de la NASA y fuentes públicas para detectar tendencias, saber si son significativas y apoyar decisiones.

## Objetivos específicos
1. Integrar información ambiental de fuentes satelitales y repositorios públicos por variable, ubicación y periodo.
2. Implementar visualización geoespacial y de series de tiempo para identificar patrones, tendencias y cambios, con pruebas de significancia.
3. Ofrecer una interfaz web sencilla para consultar la información y apoyar decisiones.

## Arquitectura
- **Hoy (prototipo, todo en el navegador):** React + Vite. Fuentes: NASA POWER (API), NASA GIBS (imágenes), archivos CSV (Giovanni, Data Rods, AppEEARS, CDO, KNMI) e inventario de lagos. Preparación: limpieza, anomalías, medias anuales. Análisis: Mann-Kendall, Sen, prueba t, intervalos, FDR, bootstrap, estadística espacial. Visualización: planeta 3D, mapas y gráficos interactivos.
- **Siguiente etapa:** backend FastAPI + PostgreSQL/PostGIS; inventario oficial ANA/INAIGEM; área de agua por lago con Landsat y Sentinel-2 (Google Earth Engine o AppEEARS) con umbral por franja de altitud; puntos oficiales de monitoreo de la ANA; niveles con SWOT.

## Qué hace ya cada brecha en el prototipo
| Brecha | En el prototipo | Falta |
|---|---|---|
| 1 y 4. Plataforma integrada | Sección Lagos: inventario + mapa + imágenes por año + clima + estadística | Inventario oficial completo |
| 2. Altitud en la clasificación | Tendencia según altitud con datos NASA; simulación didáctica del umbral por franja | Clasificación real sobre imágenes Landsat/Sentinel |
| 3. Representatividad del monitoreo | Cobertura por distancia y por franja de altitud; carga de CSV de puntos | Puntos oficiales de la ANA |
| 5. Reto NASA | Laboratorio, escaneo mundial, pruebas y veredicto | Verificar conexión en vivo |

## Recomendación del mentor aplicada
Ámbito inicial acotado: lagos y embalses del sur del Perú (Moquegua, Puno, Arequipa, Tacna) y cinco variables (lluvia, evaporación, temperatura, temperatura de superficie y humedad del suelo).
