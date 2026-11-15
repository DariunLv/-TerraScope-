# Revisión de literatura, brechas y cómo las resuelve "Detectives de Tendencias"

Alcance: revisión dirigida de artículos científicos, informes oficiales y noticias de fuente identificable (búsquedas de noviembre de 2026). No es una revisión sistemática de toda la literatura; la lista final indica cómo ampliarla. El mismo contenido está en la sección "Brechas" de la app (`src/gaps.js`), con enlaces.

## Escala local: Moquegua

| Brecha o necesidad | Evidencia | Función que la atiende | Viabilidad |
|---|---|---|---|
| Riesgo de déficit hídrico y pocas mediciones en altura | DS 116-2026-PCM declaró emergencia por déficit hídrico en 607 distritos de 16 departamentos, incluido Moquegua; la ANA reforzó el seguimiento. Pasto Grande no tiene pluviómetro propio (Sustainability 2023) y su diseño usó lluvias previas al cambio climático (EGU2019-4525) | Caso "Moquegua", clic en el mapa, 15 variables | Inmediata |
| El reanálisis no acierta la lluvia en la cuenca del Tambo | Apaza-Vilca et al. (2025): MERRA-2 con correlación 0,72–0,82 pero subestimación de 31 % a 78 % | Pestaña "Validación" con CSV de estación (sesgo, RMSE, correlación, signo de tendencia) | Inmediata con un CSV de SENAMHI |
| Cambios de lluvia distintos entre puntos cercanos | Imfeld et al. (2020): baja coherencia espacial de la lluvia 1965–2018; Tmax cambia más que Tmin | Ranking de variables y "Compara con otro lugar" | Inmediata |

## Escala nacional: Perú

| Brecha o necesidad | Evidencia | Función | Viabilidad |
|---|---|---|---|
| Pérdida de glaciares y calentamiento en altura | INAIGEM (2023): 56 % de superficie glaciar perdida en unas seis décadas; Perú tiene 68 % de los glaciares tropicales. Birkel et al. (2022): las reanálisis difieren en el Altiplano | Lugares en Cusco, Titicaca y Moquegua; escaneo costa-sierra-selva | Inmediata |
| Datos abiertos que no llegan a no especialistas | Data & Policy (2025): barreras fuertes pese al acceso libre; pide guías paso a paso | Preguntas guiadas, asistente de 3 pasos, ES/EN, sin cuentas | Inmediata; falta modo sin conexión completo |
| Docentes sin herramienta que una gráfico, prueba y explicación | Irish et al. (2019); McBride, Linn & Vitale (2020); reseña CLEAN de NOAA View | Veredicto simple, definiciones, juego | Inmediata |

## Escala mundial: método

| Brecha | Evidencia | Función | 
|---|---|---|
| Pruebas múltiples generan falsos significativos | Wilks (2016) | Escaneo mundial con Benjamini-Hochberg |
| Tendencia real pero aún no detectable | Weatherhead et al. (1998) | Años necesarios para detectar (pestaña Robustez) |
| Elección interesada de años | Liebmann et al. (2010) | Mapa de calor de todos los periodos (pestaña Periodos) |
| Autocorrelación y estacionalidad | Yue et al. (2002); Hirsch et al. (1982) | TFPW, Mann-Kendall estacional, bootstrap en bloques |
| Tendencias opuestas por región | Texto del reto; Acker et al. (2009) | Mapa mundial con signo de la tendencia |
| Reanálisis tomado como verdad | Evaluación de NASA POWER; Marzouk (2021) | Fuente visible por variable + validación |

## Para ampliar
Buscar en Scopus/Scholar: Vuille et al. (2015, 2018); Aybar et al. (2020, PISCO); Fernandez-Palomino et al. (2021, RAIN4PE); Hamed & Rao (1998); boletines de sequía de SENAMHI; estudios de CENEPRED sobre déficit hídrico 2026-2027.

## Referencias
Ver la lista numerada con enlaces en `src/gaps.js` (20 entradas).
