/* Each chart keeps its explanation; only an adjacent dedicated explanation replaces it. */
import { useEffect, useRef, useState } from 'react';
import Interpret from '../Interpret';
import { useT } from '../../core/i18n';
export { stats, plotlyFacts, echartsFacts, tableFacts } from './chartFacts';

function dedicatedExplanation(element) {
  for (let next = element?.nextElementSibling; next; next = next.nextElementSibling) {
    if (next.matches('.interp')) return true;
    if (next.matches('h1,h2,h3,h4,table,[data-chart-kind],[data-auto-explain]') || next.querySelector('[data-chart-kind],[data-auto-explain],.interp')) return false;
    if (!next.matches('p,small,.mini,.legend')) return false;
  }
  return false;
}
export default function AutoExplain({ facts, title, kind = 'chart', how, plain, next }) {
  const { lang } = useT(), L = (a, b) => lang === 'es' ? a : b;
  const ref = useRef(null), [hide, setHide] = useState(false), [inferredTitle, setInferredTitle] = useState(''), [context, setContext] = useState('');
  useEffect(() => {
    const el = ref.current;
    setHide(dedicatedExplanation(el));
    setContext(el?.closest('[data-analysis-context]')?.getAttribute('data-analysis-context') || '');
    if (title || !el) return;
    let heading = null;
    for (let node = el.previousElementSibling; node; node = node.previousElementSibling) {
      if (node.matches('h2,h3,h4')) { heading = node; break; }
    }
    const host = el.parentElement;
    setInferredTitle((heading || host?.querySelector('h2,h3,h4'))?.textContent?.trim() || '');
  });
  const content = String(facts || '').trim();
  if (hide || !content) return <span ref={ref} data-auto-explain hidden />;
  const radar = /radar/.test(content), scatter = /\(scatter\)/.test(content), heat = /heatmap|surface|warming-stripes/.test(content + kind), boxes = /boxplot/.test(content), categories = /\(categories\)/.test(content);
  const reading = how || (kind === 'table'
    ? L('Cada fila es un registro y cada columna una característica. Compara valores de la misma columna, con sus unidades y periodo.', 'Each row is a record and each column a characteristic. Compare values within a column, keeping units and periods together.')
    : radar ? L('Cada radio representa una variable. Compara el valor con la referencia del mismo eje; no confundas una desviación con un porcentaje.', 'Each spoke represents a variable. Compare it with the reference on the same axis; a deviation is not a percentage.')
    : scatter ? L('Cada punto reúne dos coordenadas. Los ejes indican qué se compara; la posición no establece una secuencia temporal ni una causa.', 'Each point pairs two coordinates. The axes identify what is compared; position does not establish time order or causation.')
    : heat ? L('La posición identifica el año, mes o categoría y el color o altura representa el valor según la escala.', 'Position identifies the year, month or category; colour or height represents the value on the scale.')
    : boxes ? L('La caja resume los cuartiles y la mediana. Sus extremos y bigotes describen la dispersión; no son por sí solos un intervalo de pronóstico.', 'The box summarises quartiles and median. Its edges and whiskers describe spread; they are not themselves a forecast interval.')
    : categories ? L('Cada barra o sector corresponde a una categoría. Lee su etiqueta y escala antes de comparar tamaños.', 'Each bar or sector represents a category. Read labels and scales before comparing sizes.')
    : L('Revisa las etiquetas y unidades de cada eje. Las líneas o barras muestran los valores; los extremos por sí solos no prueban una tendencia.', 'Check axis labels and units. Lines or bars show values; endpoints alone do not prove a trend.'));
  const summaries = content.split('\n').filter(line => /points|values, min|categories|radar/.test(line)).slice(0, 2);
  const summary = summaries.map(line => lang === 'es' ? line.replace(/points/g, 'datos').replace(/values, min/g, 'valores, mínimo').replace(/, min /g, ', mínimo ').replace(/, max /g, ', máximo ').replace(/, first /g, ', primero ').replace(/, last /g, ', último ').replace(/, difference /g, ', diferencia ').replace(/; endpoints alone do not establish a trend/g, '; los extremos no prueban una tendencia').replace(/\(categories\)/g, '(categorías)') : line).join(' ');
  return <div ref={ref} data-auto-explain className="auto-ex"><Interpret title={title || inferredTitle || L('Gráfico', 'Chart')} kind={kind === 'table' ? 'table' : 'chart'} facts={[context, content].filter(Boolean).join('\n')} how={reading} plain={plain || summary || L('Comprueba las variables, sus unidades y su referencia antes de concluir. Killa utiliza únicamente los datos de este bloque.', 'Check variables, units and reference before drawing conclusions. Killa uses only this block’s data.')} next={next} /></div>;
}
