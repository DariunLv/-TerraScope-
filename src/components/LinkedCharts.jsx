import { V } from '../lib/data';
import { useT } from '../i18n';
import { EChart } from './charts/hooks';
/* Pequeños múltiplos sincronizados (ECharts): un zoom mueve todas las variables a la vez. */
export default function LinkedCharts({ list }) {
  const { lang } = useT(); const n = list.length, COL = ['#0c5a43', '#1e3a8a', '#c2410c', '#7c3aed', '#0891b2', '#d97706'];
  const x = list[0].raw.map((p) => `${p.year}-${String(p.month + 1).padStart(2, '0')}`), gh = 100 / n;
  const option = {
    textStyle: { fontFamily: 'Inter', color: '#5b6b8c' }, tooltip: { trigger: 'axis', axisPointer: { type: 'line' } }, axisPointer: { link: [{ xAxisIndex: 'all' }] },
    dataZoom: [{ type: 'slider', xAxisIndex: list.map((_, i) => i), bottom: 4, height: 22 }, { type: 'inside', xAxisIndex: list.map((_, i) => i) }],
    grid: list.map((_, i) => ({ left: 56, right: 18, top: `${i * gh * 0.9 + 4}%`, height: `${gh * 0.9 - 9}%` })),
    title: list.map((it, i) => ({ text: `${V[it.k][lang][0]} (${V[it.k].u || '0–1'})`, left: 56, top: `${i * gh * 0.9 + 0.5}%`, textStyle: { fontSize: 12, color: '#14213d' } })),
    xAxis: list.map((_, i) => ({ type: 'category', data: x, gridIndex: i, axisLabel: { show: i === n - 1 }, axisTick: { show: false }, axisLine: { lineStyle: { color: '#d9e2ee' } } })),
    yAxis: list.map((_, i) => ({ type: 'value', scale: true, gridIndex: i, splitNumber: 2, splitLine: { lineStyle: { color: '#eef2f7' } } })),
    series: list.flatMap((it, i) => [{ type: 'line', xAxisIndex: i, yAxisIndex: i, data: it.r.y.map((v) => +v.toFixed(3)), showSymbol: false, lineStyle: { width: 1, color: COL[i % 6], opacity: 0.45 }, name: V[it.k][lang][0] }, { type: 'line', xAxisIndex: i, yAxisIndex: i, data: it.r.roll.map((v) => (v == null ? null : +v.toFixed(3))), showSymbol: false, smooth: true, lineStyle: { width: 2.6, color: COL[i % 6] }, name: '12 m' }]),
  };
  return <EChart option={option} deps={[list, lang]} h={Math.max(300, n * 150 + 40)} />;
}
