const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const array = (value) => Array.isArray(value) ? value : ArrayBuffer.isView(value) && !(value instanceof DataView) ? Array.from(value) : [];
const text = (value) => typeof value === 'string' ? value : value?.text || '';
const f = (value) => +value.toPrecision(6);
function range(values) { return values.reduce((result, value) => finite(value) ? [Math.min(result[0], value), Math.max(result[1], value)] : result, [Infinity, -Infinity]); }
function extent(name, values) { const valid = values.filter(finite); if (!valid.length) return ''; const [lo, hi] = range(valid); return `${name}: ${valid.length} values, min ${f(lo)}, max ${f(hi)}`; }
export function stats(name, xs, ys) {
  const values = array(ys), valid = values.map((value, index) => ({ value, index })).filter(({ value }) => finite(value));
  if (!valid.length) return '';
  const [lo, hi] = range(valid.map(({ value }) => value)), first = valid[0], last = valid.at(-1);
  const label = (index) => xs?.[index] != null ? ` (${String(xs[index]).slice(0, 40)})` : '';
  return `${name || 'series'}: ${valid.length} points, min ${f(lo)}${label(values.indexOf(lo))}, max ${f(hi)}${label(values.indexOf(hi))}, first ${f(first.value)}${label(first.index)}, last ${f(last.value)}${label(last.index)}, difference ${f(last.value - first.value)}; endpoints alone do not establish a trend`;
}
function points(name, data) {
  const valid = data.filter((point) => finite(point?.[0]) && finite(point?.[1]));
  return valid.length ? `${name} (scatter): ${valid.length} pairs; ${extent('x', valid.map((point) => point[0]))}; ${extent('y', valid.map((point) => point[1]))}; point order is not time and does not establish causation` : '';
}
function categories(name, entries) { return `${name} (categories): ${entries.slice(0, 16).map(([label, value]) => `${label}: ${finite(value) ? f(value) : value}`).join('; ')}${entries.length > 16 ? `; ${entries.length - 16} more categories` : ''}`; }
export function plotlyFacts(data = [], layout = {}) {
  const out = [`chart types: ${[...new Set(data.map((trace) => trace.type || 'scatter'))].join(', ')}`];
  if (text(layout.title)) out.push('title: ' + text(layout.title));
  if (text(layout.xaxis?.title)) out.push('x axis: ' + text(layout.xaxis.title));
  if (text(layout.yaxis?.title)) out.push('y axis: ' + text(layout.yaxis.title));
  for (const axis of ['xaxis', 'yaxis', 'zaxis']) if (text(layout.scene?.[axis]?.title)) out.push(`3D ${axis}: ${text(layout.scene[axis].title)}`);
  data.slice(0, 10).forEach((trace) => {
    const name = trace.name || trace.type || 'series', x = array(trace.x), y = array(trace.y);
    if (['surface', 'heatmap'].includes(trace.type)) out.push(extent(`${name} (${trace.type})`, array(trace.z).flatMap(array)));
    else if (trace.type === 'pie') out.push(categories(name, array(trace.labels).map((label, index) => [label, trace.values?.[index]])));
    else if (trace.orientation === 'h') out.push(categories(name, y.map((label, index) => [label, x[index]])));
    else if (trace.mode === 'markers') out.push(points(name, x.map((value, index) => [value, y[index]])));
    else if (y.length) out.push(stats(name, x, y));
    if (trace.error_x || trace.error_y) out.push(`${name}: error bars show the uncertainty supplied by the chart, not additional observations`);
  });
  return out.filter(Boolean).join('\n');
}
export function echartsFacts(option = {}) {
  const series = array(option.series), out = [`chart types: ${[...new Set(series.map((item) => item.type))].join(', ')}`];
  const title = array(option.title)[0]?.text || option.title?.text; if (title) out.push('title: ' + title);
  const axes = (axis) => Array.isArray(axis) ? axis : axis ? [axis] : [];
  for (const [axisName, axis] of [['x', option.xAxis], ['y', option.yAxis]]) axes(axis).forEach((item, index) => { if (item.name) out.push(`${axisName} axis ${index + 1}: ${item.name}`); });
  const xAxis = axes(option.xAxis)[0], yAxis = axes(option.yAxis)[0];
  series.slice(0, 10).forEach((item) => {
    const name = item.name || item.type || 'series', data = array(item.data), values = data.map((value) => value?.value ?? value);
    if (item.type === 'radar') {
      const indicators = (Array.isArray(option.radar) ? option.radar[0] : option.radar)?.indicator || [];
      data.forEach((row) => out.push(`${row.name || name} (radar): ${array(row.value).map((value, index) => `${indicators[index]?.name || `axis ${index + 1}`}: ${finite(value) ? f(value) : 'missing'}`).join('; ')}`));
    } else if (item.type === 'scatter') out.push(points(name, values));
    else if (item.type === 'heatmap') out.push(extent(`${name} (heatmap, colour value)`, values.map((value) => value?.[2])));
    else if (item.type === 'boxplot') values.forEach((row, index) => { if (array(row).length >= 5) out.push(`${xAxis?.data?.[index] ?? index} (boxplot): minimum ${row[0]}, lower quartile ${row[1]}, median ${row[2]}, upper quartile ${row[3]}, maximum ${row[4]}`); });
    else if (['pie', 'sunburst', 'treemap'].includes(item.type)) {
      const leaves = []; const visit = (rows, prefix = '') => rows.forEach((row) => row.children?.length ? visit(row.children, prefix + row.name + ' / ') : leaves.push([prefix + row.name, row.value])); visit(data); out.push(categories(name, leaves));
    } else if (item.type === 'bar' && yAxis?.type === 'category') out.push(categories(name, values.map((value, index) => [yAxis.data?.[index] ?? index, value])));
    else if (values.some(finite)) out.push(stats(name, xAxis?.data, values));
  });
  return out.filter(Boolean).join('\n');
}
export function tableFacts(columns, rows, limit = 8) {
  const out = [`table: ${rows.length} rows`, `columns: ${columns.join(' | ')}`];
  columns.forEach((column, index) => { const summary = extent(column, rows.map((row) => row[index])); if (summary) out.push(summary); });
  out.push(...rows.slice(0, limit).map((row) => columns.map((column, index) => `${column}: ${String(row[index] ?? 'missing').slice(0, 180)}`).join('; ')));
  if (rows.length > limit) out.push(`Only the first ${limit} rows are quoted; column ranges describe all ${rows.length} rows. Do not infer omitted row details.`);
  return out.join('\n');
}
