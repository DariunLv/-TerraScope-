**Revisión técnica de TerraScope — 16 de noviembre de 2026**

**Corrección posterior: carga directa de Cesium**

La actualización de `vite-plugin-static-copy` cambió la conservación de carpetas: los archivos terminaron bajo `cesium/node_modules/cesium/Build/Cesium/...` en vez de `cesium/...`. Se reprodujo que las URL del visor respondían 200 con HTML, tanto para texturas como para workers; una compilación exitosa no detectaba este fallo de rutas. Se corrigió la copia con `rename.stripBase: 4` y se añadió una prueba del servidor Vite que exige XML, JPEG y JavaScript reales en las rutas públicas.

Por la última petición del usuario, se eliminó la pantalla de carga inicial. La página aparece inmediatamente y Cesium se prepara en segundo plano: módulo, catálogo local, dos texturas iniciales y un worker. Se retiraron la esfera de respaldo CSS, la detección WebGL fijada al cargar el módulo y la espera del observador para iniciar el mapa. Todos los mapas compartidos intentan abrir Cesium directamente y permiten reintentar ante un fallo real. El diseño de las pantallas, el visor y las interacciones del laboratorio se mantienen.

La verificación visual de Chrome volvió a detenerse porque Computer Use no pudo identificar la URL actual con suficiente seguridad. Se comprobaron los recursos por HTTP y los archivos compilados; esta comprobación no equivale a una prueba visual con WebGL real.

Verificación posterior: 50 pruebas aprobadas en 11 archivos, compilación de producción correcta y coincidencia de los archivos publicados con los originales de Cesium. La prueba del servidor usa caché temporal independiente para evitar interferir con servidores de desarrollo abiertos.

La revisión cubre los flujos principales de navegación, mapas, laboratorio, lagos, decisiones, aprendizaje, Killa, API, datos NASA, importación y exportación, cálculos, cachés y dependencias. Los hallazgos numerados describen el estado inicial. Posteriormente se aplicaron las correcciones autorizadas; su estado figura a continuación.

La compilación inicial pasó. La suite inicial contenía 17 pruebas: 11 aprobadas y 6 fallidas; esos fallos precedían las mejoras de Cesium. No se completó una prueba visual de todas las pantallas ni se hicieron llamadas de pago a proveedores de IA. Los riesgos deducidos del código se distinguen de los errores reproducidos.

**Estado tras las correcciones**

| Hallazgo | Resultado implementado |
| --- | --- |
| 1–2. Datos y descargador | Catálogo separado de React; ejecución nativa Node reparada; filtro de fechas y valores finitos; escritura atómica; instantánea real regenerada con 68 puntos y 540 posiciones por variable, 1981–2025; cachés versión 2. |
| 3. Pronóstico | Últimos 12 meses observados frente a los primeros 12 futuros. El cálculo anual conserva 12 meses incluso con una vista de 6 meses. Fechas explícitas en lectura y contexto de Killa. |
| 4. Calendarios | Correlación, regresión y gráficos vinculados unidos por año/mes; huecos conservados y número de meses comunes informado. |
| 5. Procedencia | Sin sustitución automática de datos reales por simulaciones en laboratorio, comparación, diario, escaneos, lagos y Centinela. Procedencia y cobertura conservadas por resultado. |
| 6. Concurrencia | AbortController e identificación de ejecución; resultados antiguos descartados al cambiar contexto o desmontar. Cobertura en laboratorio, chat, explicaciones, escaneos, catálogo, fotos y reportes. |
| 7. Monitoreo | Inventario compartido entre Lagos, Decisiones y Centinela. Los ejemplos no aumentan confianza; se utiliza la red declarada por el usuario y su nombre de archivo, sin afirmar que se verificó externamente. |
| 8–9. CSV | Intercambio mensual compatible con la exportación, comillas/saltos de línea/decimales regionales, números finitos y coordenadas dentro de rango; límites de archivo/filas/meses; errores recuperables. Columnas ambiguas se rechazan con instrucciones para elegir `value`. |
| 10. Mapa modal | Capa y marcador vigentes aplicados tras `load` y al reabrir; diálogo, foco, Tab y Escape. |
| 11. Cachés | Fuente, versión y caducidad; fallos reales no guardan demos. «Revisar ahora» solicita actualización. Si falla la red, una instantánea válida antigua se identifica como tal. |
| 12. Killa | Signos conservados. En decisiones, las afirmaciones numéricas deben conservar una ficha calculada completa con variable, unidad, periodo y fuente; si no, se descartan y se usan reglas locales. |
| 13. API | Validación previa, límites de tamaño, 25 s por consulta, peticiones de proveedor acotadas, máximo 3 modelos y sin descubrimiento ilimitado. Cuota Redis compartida preparada; requiere variables del servidor. Clave Anthropic migrada a la sesión. |
| 14. Dependencias | MapLibre 6.18, Vite 8.3, plugin React 6.3 y herramientas compatibles; `npm audit` sin vulnerabilidades reportadas. |
| 15. Pruebas | Flujos actualizados conservando la interfaz; regresiones añadidas para datos, calendario, CSV, concurrencia, API, cuotas, descargador, navegación, borrador y mapa modal. |

También se eliminó la precarga indiscriminada al arrancar; se trasladaron análisis, escaneos, evaluación de decisiones, retrospectiva, ajuste/validación del pronóstico, bootstrap, sensibilidad de periodos y alerta temprana a workers con cola y cancelación. El selector de Cesium conserva nombres y selección sincronizados y evita la geometría dinámica inválida que detenía el renderizado.

Se conservaron resultados y borradores durante la sesión y se incorporó navegación mediante URL e historial. Tarjetas, filas y búsquedas recibieron semántica de teclado sin cambiar estilos. Los reportes requieren confirmación para borrar, exportan CSV con comillas correctas y conservan el formulario si falla el almacenamiento. Los mensajes de copia solo anuncian éxito tras completarse. Se consolidaron seis duplicados exactos de React Bits mediante reexportaciones; las variantes diferentes se conservaron.

**Verificación y límites de lo comprobado**

- `npm test`: 42 pruebas aprobadas en 9 archivos.
- `npm run build`: producción compilada, incluidos el worker y los estáticos de Cesium.
- `npm audit --json`: 0 vulnerabilidades reportadas, incluidas dependencias de desarrollo.
- `npm run datos`: instantánea regenerada desde NASA POWER el 16/11/2026. Prueba adicional del comando Node con respuestas controladas; se verifica que una descarga completamente fallida no sobrescriba el archivo anterior.
- Los archivos de tema, experiencia y configuración visual principal conservan sus hashes respecto al inicio de esta fase de correcciones. No se modificaron colores, tipografías ni distribución. Las pruebas de mapas usan dobles de Cesium/MapLibre; no sustituyen una inspección visual con WebGL real. La automatización de navegador disponible no permitió completar esa inspección.
- La cuota distribuida requiere configurar Redis en el despliegue. El código incluye modo obligatorio que rechaza consultas si la cuota compartida no está disponible. Sin esa configuración, el límite es por instancia. No se desplegó ni se crearon servicios externos.
- No se realizaron llamadas de pago a IA. La validación de una cifra no prueba que toda la explicación verbal del modelo sea correcta; los gráficos genéricos mantienen verificación numérica y respaldo básico, mientras las decisiones aplican fichas cuantitativas estrictas.
- La disponibilidad de teselas, CMR, EONET, EPIC y proveedores de IA depende de servicios externos. La descarga POWER se comprobó; no se certifica disponibilidad permanente de todas las fuentes.

No se ejecutaron `git add`, `git commit` ni `git push`. Los hallazgos originales siguientes se conservan como registro histórico de la auditoría.

**Prioridad alta: resultados y datos**

1. **La instantánea contiene un mes adicional que desplaza el pronóstico. Confirmado por ejecución.**

   `scripts/descargar-datos.mjs:18` acepta cualquier clave de seis caracteres, sin comprobar que el mes esté entre 1 y 12. Una clave como `202513` escribe en la posición de enero de 2026. `src/features/lakes/lakeclim.js:14` reconstruye las fechas por posición y no verifica el límite declarado del archivo.

   El archivo actual declara 1981–2025: deberían ser 540 meses. De sus 204 series, 201 tienen 541 valores. Al cargar Titicaca, la aplicación interpreta el último valor como enero de 2026 y `assess()` genera su primer año pronosticado como 2027. Los valores adicionales son compatibles con los resúmenes anuales que admite el descargador. No corresponden a un mes válido del periodo declarado.

   Corrección: validar año, mes, valor finito y rango antes de guardar; rechazar claves de resumen anual; validar también la lectura. Regenerar la instantánea y versionar o invalidar las cachés que pudieran contener la serie defectuosa. Añadir una prueba que exija exactamente los meses declarados.

2. **El actualizador de datos no puede ejecutarse con el comando documentado. Confirmado por ejecución.**

   `scripts/descargar-datos.mjs:8` importa `src/lib/nasa/data.js`, que a su vez importa `../../core/store` sin extensión. Node ESM falla con `ERR_MODULE_NOT_FOUND` antes de descargar datos. La carga mediante Vite oculta este problema durante el uso normal de la web.

   Corrección: separar el catálogo y las funciones de datos de las dependencias de React/Zustand y usar importaciones compatibles con el entorno del script. Verificar `npm run datos` con un servidor de prueba, sin sobrescribir la instantánea real durante la prueba.

3. **El pronóstico compara periodos diferentes de los que anuncia. Confirmado por ejecución y revisión.**

   `src/shared/analysis/Forecast.jsx:31` calcula `lastYr = mean12(y)`: promedia toda la serie, aunque el texto y el indicador dicen «último año». La variable `last12` se calcula pero no se utiliza para esa comparación. Además, `fcYr` toma los últimos 12 meses del horizonte; con el horizonte predeterminado de 24 meses, presenta el segundo año como «próximo año».

   Reproducción: una serie con 60 meses de valor 0 y 12 meses de valor 10 tiene un último año de media 10. Si el modelo repite ese año, el cambio correcto es 0. La lógica actual compara contra 1,67 y muestra un aumento de 8,33.

   Corrección: definir explícitamente los 12 meses observados y los 12 meses futuros que se comparan; mostrar sus fechas. Usar esos mismos periodos en indicadores, texto y contexto enviado a Killa.

4. **Las correlaciones y los gráficos sincronizados no alinean las fechas. Confirmado en la lógica y con ejemplo numérico.**

   `src/features/lab/Analytics.jsx:165`, `src/features/lab/Analytics.jsx:167` y `src/features/lab/Lab.jsx:149` comparan posiciones de arrays. `src/features/lab/LinkedCharts.jsx:7` usa las fechas de la primera variable para todas las demás. Cuando una variable empieza después o tiene meses ausentes, se pueden correlacionar y etiquetar meses diferentes.

   Un ejemplo con series desplazadas devuelve correlación −1 por posición y +1 al unir los mismos meses. El problema depende de que existan huecos o coberturas temporales distintas.

   Corrección: unir las series por año y mes; representar ausencias como ausencias; informar cuántos meses comunes se utilizan.

5. **Hay rutas que pueden mezclar datos reales y simulados sin identificar cada serie. Detectado por revisión.**

   `src/features/explore/WorldMap.jsx:27` sustituye una serie vacía por `demo()`, pero solo cambia `live` cuando ocurre una excepción. Una respuesta válida sin datos puede acabar marcada como real. El resto del escaneo comparte una única bandera para lugares con procedencias distintas. En `src/features/decide/agent.js:25`, basta encontrar una fuente real para que la etiqueta global deje de ser «demo», aunque otras filas sean simuladas.

   Corrección: conservar procedencia, periodo y fecha de consulta por lugar y variable. Evitar combinar mediciones y simulaciones en un mismo ranking sin una advertencia clara. Una variable ausente debe producir un estado «sin datos» o una elección explícita de práctica.

6. **Las solicitudes anteriores pueden sobrescribir el contexto actual. Detectado por revisión.**

   `src/features/lab/Lab.jsx:44` no identifica ni cancela ejecuciones anteriores antes de escribir `setRes()`. `src/features/decide/Decide.jsx:57` agrega respuestas a la conversación aunque haya cambiado el lugar mientras esperaba. `src/shared/Interpret.jsx:18` puede abrir una explicación de los datos anteriores después de cambiar el gráfico.

   Corrección: asignar un identificador de ejecución/contexto; descartar respuestas antiguas; cancelar peticiones cuando sea posible; controlar el estado ocupado con `try/finally`. Probar respuestas que llegan en orden inverso.

**Prioridad media: coherencia, entradas y recuperación**

7. **Los puntos de monitoreo cargados no llegan al cálculo de confianza. Detectado por revisión.**

   `src/features/lakes/Lakes.jsx:135` conserva los puntos cargados en estado local. `src/features/decide/decideEngine.js:22` y `src/features/decide/agent.js:26` siguen usando `SAMPLE_POINTS`, que son capitales regionales de ejemplo. La distancia al supuesto punto de monitoreo influye en confianza y recomendaciones, sin corresponder al inventario cargado por el usuario.

   Corrección: compartir el inventario de monitoreo entre módulos e indicar su procedencia. Sin una red real, mostrar que la cobertura es ilustrativa y evitar presentarla como evidencia de mediciones de campo.

8. **El laboratorio no puede volver a leer su propio CSV exportado. Confirmado por ejecución.**

   `src/features/lab/Lab.jsx:66` exporta `year,month,value,anomaly`, mientras que `src/lib/nasa/data.js:132` espera una fecha combinada en la primera columna. La reproducción con dos filas del formato exportado devuelve cero puntos.

   Corrección: definir un formato de intercambio común y probar exportación → importación. Para archivos de varias variables, ofrecer una selección explícita de columnas y unidades.

9. **El importador de monitoreo falla con un archivo vacío y acepta coordenadas inválidas. Confirmado por ejecución.**

   `src/features/lakes/lakesData.js:54` accede a `rows[0].includes()` sin comprobar que haya filas. `src/features/lakes/lakesData.js:57` admite latitud 999 y longitud 999 porque solo comprueba `NaN`.

   Corrección: validar encabezados, filas, números finitos y límites geográficos; soportar CSV con comillas y separadores regionales; mostrar errores por fila. Añadir límites de tamaño y de cantidad de registros antes de ejecutar cálculos costosos.

10. **La capa seleccionada del mapa modal puede no coincidir con la imagen. Detectado por revisión.**

    `src/layout/MapModal.jsx:41` crea siempre la primera capa visible. El efecto de `src/layout/MapModal.jsx:53` puede ejecutarse antes de que termine la inicialización asíncrona y no vuelve a ejecutarse al cargar el estilo. Al reabrir el modal, el estado de la opción se conserva, pero el nuevo mapa vuelve a la primera capa.

    Corrección: aplicar capa y marcador al recibir `load`/`style.load`, usando el estado vigente. Añadir un estado de disponibilidad del mapa y una prueba de cerrar → reabrir con una capa distinta.

11. **Las cachés pueden conservar resultados de práctica bajo una consulta de datos reales. Detectado por revisión.**

    `src/features/lakes/lakeclim.js:22` devuelve la caché de memoria sin caducidad. Si una consulta real termina en `demo`, ese resultado también se guarda bajo la clave de la consulta real. Recuperar la conexión no obliga a reintentar. La instantánea local siempre tiene precedencia y no existe un control de actualización para el usuario.

    Corrección: distinguir procedencia y antigüedad; dar caducidad corta a fallos; ofrecer «Actualizar datos»; invalidar por versión del conjunto de datos. Mostrar por separado la fecha de descarga y el último mes observado.

12. **El verificador numérico de Killa acepta cambios de signo. Confirmado por ejecución.**

    `src/features/decide/llm.js:32` y `src/features/decide/llm.js:36` convierten las cifras a valor absoluto. Una respuesta que dice −347,2 pasa la verificación de un contexto que contiene +347,2. En balances o tendencias, ese cambio invierte la interpretación.

    Corrección: verificar signo, unidad, variable y periodo. Mantener los cálculos deterministas en la aplicación y usar el modelo para explicarlos. La coincidencia de números por sí sola no verifica el significado de una respuesta.

**Seguridad y fiabilidad**

13. **La API necesita validación y límites más sólidos. Parte confirmada y parte detectada por revisión.**

    `api/chat.js:15` falla con `messages: [null]` antes de entrar en el bloque de manejo de errores; se reprodujo localmente sin llamar a un proveedor. `api/chat.js:4` aplica límites en memoria de una instancia y los borra al superar 5000 claves. Las llamadas a proveedores no tienen un tiempo máximo explícito y el proceso puede recorrer numerosos modelos.

    Corrección: validar el cuerpo con un esquema y responder 400 a entradas inválidas; limitar tamaño y tokens; aplicar una cuota compartida y un presupuesto de tiempo/reintentos. Si el producto seguirá siendo público, definir su política de uso sin depender únicamente del estado de una instancia.

    Además, `src/features/decide/llm.js:6` persiste la clave opcional de Anthropic en `localStorage`. Conviene ofrecer almacenamiento solo durante la sesión o un proxy de servidor para esa modalidad. Esto es un riesgo de exposición ante scripts ejecutados en el mismo origen, no evidencia de una filtración actual.

14. **Hay avisos de seguridad en las versiones instaladas. Confirmado con auditoría de dependencias.**

    `npm audit --omit=dev` reportó tres paquetes: MapLibre GL con severidad crítica, Vite alta y esbuild moderada. Esa clasificación no significa que todos los problemas sean explotables en la web publicada: Vite/esbuild afectan al entorno de desarrollo en las condiciones de sus avisos. MapLibre se usa en el navegador, pero el aviso requiere introducir atribuciones/HTML no confiable; las atribuciones revisadas están fijadas en el código. No se demostró una explotación en esta aplicación.

    `package.json:40` fija MapLibre en la rama 4.7 y `package.json:65` fija Vite en la rama 5.4. Planificar una actualización compatible, revisar cambios mayores y repetir pruebas de mapas y compilación. No ejecutar una actualización forzada indiscriminada.

    Fuentes primarias: [aviso de MapLibre](https://github.com/maplibre/maplibre-gl-js/security/advisories/GHSA-jrc7-96c5-q579), [aviso de Vite](https://github.com/vitejs/vite/security/advisories/GHSA-4w7w-66w2-5vf9), [aviso de esbuild](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99).

15. **La suite de pruebas no está al día con la interfaz. Confirmado por ejecución y revisión.**

    Resultado: 17 pruebas, 11 aprobadas y 6 fallidas. Entre los desajustes: `src/test/flows.test.jsx:23` busca un progreso que el asistente actual no expone de esa forma; `src/test/flows.test.jsx:141` busca «Guardar reporte» donde la interfaz dice «Enviar reporte»; el test importa `Quiz` como exportación aunque `src/features/learn/Game.jsx:55` lo declara interno. Los fallos de pruebas no demuestran por sí solos que todas esas funciones estén rotas para el usuario.

    Corrección: actualizar las pruebas contra el comportamiento esperado, sin reducir comprobaciones solo para ponerlas en verde. Añadir regresiones para meses 13, huecos temporales, datos parciales, periodos de pronóstico, solicitudes fuera de orden, CSV vacío y errores de API.

**Mejoras de rendimiento y experiencia**

- **Carga inicial:** `src/App.jsx:48` precarga Cesium y varias secciones a los 300 ms. En los artefactos actuales, Cesium/EarthView ocupa aproximadamente 4,40 MB de JavaScript sin comprimir; Plotly 4,81 MB y el módulo de gráficos 1,50 MB. Plotly tiene carga diferida, por lo que no debe atribuirse todo ese peso a la primera pantalla. Conviene descargar cada motor al necesitarlo y precargar solo durante inactividad o intención de navegación.
- **Cálculo:** análisis, simulaciones y escaneos se ejecutan en el hilo de la interfaz. En una reproducción local, una evaluación completa de Titicaca tardó unos 179 ms y un análisis mensual de 540 puntos, 37 ms; son mediciones puntuales de este equipo. Usar Web Workers para lotes y archivos grandes; permitir cancelar y mostrar progreso efectivo.
- **Estado y navegación:** sincronizar sección, lugar y filtros con la URL; conservar una investigación al cambiar de sección; hacer que Atrás/Adelante del navegador funcione dentro de la aplicación. `src/core/store.js:11` solo cambia el estado de React.
- **Accesibilidad:** convertir tarjetas y filas activables en controles accesibles por teclado (`src/features/lab/CaseFiles.jsx:21`, `src/features/lakes/Lakes.jsx:40`). El mapa modal necesita semántica de diálogo, control del foco y cierre con Escape. Añadir etiquetas visibles o accesibles a búsquedas que solo tienen placeholder. Referencia: [guías de interfaces de Vercel](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).
- **Protección de reportes:** `src/features/lakes/LakeTools.jsx:167` borra los reportes inmediatamente con `save([])`. Añadir confirmación o una opción de deshacer y explicar que el almacenamiento es local.
- **Mantenimiento:** consolidar componentes duplicados entre `src/ui/react-bits` y `src/components/reactbits`; separar catálogo, acceso a datos, cálculos y presentación. Mantener un contrato compartido con procedencia, unidad, cobertura y fechas.
- **Transparencia:** indicar siempre «medición», «dato de modelo», «instantánea histórica» o «simulación», y el periodo exacto. Las consultas de catálogo satelital y la visualización de imágenes no equivalen a medir el nivel o el área del lago. La interfaz ya incluye varias advertencias útiles; deben mantenerse consistentes en indicadores, reportes y Killa.

**Orden recomendado de trabajo**

1. Corregir y regenerar los datos guardados; reparar el actualizador e invalidar cachés afectadas.
2. Corregir periodos del pronóstico, alineación por fechas y procedencia de datos.
3. Controlar solicitudes pendientes y unificar el inventario de monitoreo.
4. Corregir CSV, capa inicial del mapa modal y validación de la API.
5. Actualizar dependencias y recuperar una suite de pruebas fiable.
6. Optimizar carga/cálculo y completar navegación, accesibilidad y recuperación de errores.

No se ejecutaron `git add`, `git commit` ni `git push`.
