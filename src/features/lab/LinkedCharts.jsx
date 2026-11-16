import { V } from '../../lib/nasa/data';
import { useT } from '../../core/i18n';
import { EChart } from '../../shared/charts/hooks';
import { alignMonthly } from '../../lib/data/monthly';
/* Pequeños múltiplos sincronizados (ECharts): un zoom mueve todas las variables a la vez. */
export default function LinkedCharts({ list }) {
  const { lang } = useT(); const n = list.length, COL = ['#0c5a43', '#1e3a8a', '#c2410c', '#7c3aed', '#0891b2', '#d97706'];
  const joined = alignMonthly(list.map((series) => series.raw)), x = joined.dates, gh = 100 / n;
  const values = list.map((series) => { const map = new Map(series.raw.map((point, index) => [point.year * 12 + point.month, index])); return joined.keys.map((key) => map.get(key)); });
  const option = {
    textStyle: { fontFamily: 'Inter', color: '#5b6b8c' }, tooltip: { trigger: 'axis', axisPointer: { type: 'line' } }, axisPointer: { link: [{ xAxisIndex: 'all' }] },
    dataZoom: [{ type: 'slider', xAxisIndex: list.map((_, i) => i), bottom: 4, height: 22 }, { type: 'inside', xAxisIndex: list.map((_, i) => i) }],
    grid: list.map((_, i) => ({ left: 56, right: 18, top: `${i * gh * 0.9 + 4}%`, height: `${gh * 0.9 - 9}%` })),
    title: list.map((it, i) => ({ text: `${V[it.k][lang][0]} (${V[it.k].u || '0–1'})`, left: 56, top: `${i * gh * 0.9 + 0.5}%`, textStyle: { fontSize: 12, color: '#14213d' } })),
    xAxis: list.map((_, i) => ({ type: 'category', data: x, gridIndex: i, axisLabel: { show: i === n - 1 }, axisTick: { show: false }, axisLine: { lineStyle: { color: '#d9e2ee' } } })),
    yAxis: list.map((_, i) => ({ type: 'value', scale: true, gridIndex: i, splitNumber: 2, splitLine: { lineStyle: { color: '#eef2f7' } } })),
    series: list.flatMap((it, i) => [{ type: 'line', xAxisIndex: i, yAxisIndex: i, data: values[i].map((index) => index == null ? null : +it.r.y[index].toFixed(3)), showSymbol: false, lineStyle: { width: 1, color: COL[i % 6], opacity: 0.45 }, name: V[it.k][lang][0] }, { type: 'line', xAxisIndex: i, yAxisIndex: i, data: values[i].map((index) => index == null || it.r.roll[index] == null ? null : +it.r.roll[index].toFixed(3)), showSymbol: false, smooth: true, lineStyle: { width: 2.6, color: COL[i % 6] }, name: '12 m' }]),
  };
  return <EChart option={option} deps={[list, lang]} h={Math.max(300, n * 150 + 40)} />;
}
