# Interpretaciones de Killa

Se retiró del planeta la fila de destinos rápidos de la captura (Titicaca, Amazon, Himalaya, Sahara, Great Barrier Reef, Alps, Aral Sea y Greenland). Se mantienen el visor, los controles del mapa y la selección de lugares del laboratorio.

Las explicaciones usan el componente de Killa existente. El modelo se consulta al pulsar el botón; no se hacen solicitudes de IA para todos los gráficos al abrir la página. Si no responde o está seleccionado el modo de reglas, se ofrece una explicación local identificada como tal. Al cambiar datos, idioma o contexto se descarta una respuesta pendiente del bloque anterior.

| Sección | Cobertura revisada |
| --- | --- |
| Decisiones | Semáforo e índices, cada escenario, comparación de escenarios, tendencia anual, incertidumbre, retrospectiva, huella ambiental, proyección PCA, similitud entre lagos y pasaporte. |
| Centinela | Conteos de revisión y verificación de pronósticos, distinguiendo anomalías recientes del índice de riesgo de Decisiones. |
| Laboratorio | Serie principal, series vinculadas, correlaciones con meses comunes, franjas, mapa de calor y comparación entre lugares. |
| Análisis avanzado | Series, descomposición, histogramas, distribución por década, ECDF, estacionalidad, superficie 3D, autocorrelación, Sen móvil, bootstrap, extremos, sensibilidad de periodos y tabla descriptiva. |
| Datos diarios | Serie SciChart o respaldo Plotly y calendario diario. Se distingue la media de la ventana de una climatología por día del año. |
| Predicción y alertas | Pronóstico, comparación retrospectiva de modelos, escenarios y señales de alerta temprana. |
| Lagos | Inventario, altitud/tamaño, vertiente/tipo, tendencia por altitud, cobertura, clasificación didáctica, balance y escenarios, vigía, catálogo de escenas, reportes, pulso y lagos gemelos. |
| Aprender | Simuladores de tendencia/ruido, estacionalidad, falsas alarmas, intervalos, balance y correlación; ajuste de rectas y explicación del juego después de responder. Los dibujos decorativos de las tarjetas no se tratan como resultados de datos. |

Se corrigieron dos fallos compartidos: una explicación dedicada ya no oculta las de otros gráficos de la misma tarjeta, y los radares/dispersiones/mapas de calor/cajas/diagramas jerárquicos ahora suministran valores con el significado de cada dimensión. Las tablas tienen el botón «Explícame esta tabla». No se confunden una coordenada de celda con su valor de color ni una desviación normalizada con un porcentaje.

Los gráficos Observable reciben contextos calculados a partir de sus datos. Los resúmenes de tablas largas citan una muestra explícita y rangos del conjunto; se indica al modelo que no invente detalles de filas omitidas. El resumen de reportes ciudadanos usa agregados, sin enviar nombres de observadores ni notas.

La disponibilidad del modelo depende de la configuración y conexión existentes. Las pruebas de interfaz verifican el contexto enviado y la recuperación local con respuestas controladas; no se hicieron llamadas de pago ni se certifica la calidad de cualquier respuesta futura del modelo.

Verificación: 55 pruebas aprobadas en 13 archivos y compilación de producción correcta. Las regresiones cubren los datos multidimensionales, el alcance de las explicaciones, la recuperación local y los bloques de Decisiones con datos simulados reales del motor de cálculo.
