import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import AutoExplain from '../shared/charts/AutoExplain';
import Interpret from '../shared/Interpret';
import { useStore } from '../core/store';
import { explainChart } from '../features/decide/llm';
import { echartsFacts, plotlyFacts, stats, tableFacts } from '../shared/charts/chartFacts';
vi.mock('../features/decide/llm', () => ({ explainChart: vi.fn() }));
const wrapper=({children})=><MantineProvider theme={{colors:{forest:Array(10).fill('#0c5a43')}}}>{children}</MantineProvider>;
beforeEach(()=>{useStore.setState({lang:'es',aud:'auth'});explainChart.mockReset();});
it('preserves radar axis labels and scatter coordinate pairs in Killa context',()=>{
  const radar=echartsFacts({radar:{indicator:[{name:'Balance (σ)'},{name:'Temperatura (σ)'}]},series:[{type:'radar',data:[{name:'Titicaca',value:[-2.2,1.7]}]}]});
  expect(radar).toContain('Balance (σ): -2.2');expect(radar).toContain('Temperatura (σ): 1.7');
  const scatter=echartsFacts({xAxis:{name:'PCA 1'},yAxis:{name:'PCA 2'},series:[{type:'scatter',data:[{value:[-2,7],name:'Lago A'},{value:[3,-4],name:'Lago B'}]}]});
  expect(scatter).toContain('2 pairs');expect(scatter).toContain('min -2, max 3');expect(scatter).toContain('min -4, max 7');expect(scatter).not.toContain('first');
});
it('uses heatmap colour values rather than coordinate indexes and preserves category counts',()=>{
  const heat=echartsFacts({series:[{type:'heatmap',data:[[100,200,-0.8],[101,201,0.9]]}]});expect(heat).toContain('min -0.8, max 0.9');expect(heat).not.toContain('max 201');
  const counts=echartsFacts({series:[{type:'sunburst',data:[{name:'Pacífico',children:[{name:'Glaciar',value:8}]}]}]});expect(counts).toContain('Pacífico / Glaciar: 8');
  expect(plotlyFacts([{type:'pie',labels:['Real','Práctica'],values:[6,2]}])).toContain('Real: 6');
});
it('keeps observations paired with their actual dates and limits table rows without inventing omitted details',()=>{
  const facts=stats('temperature',['Jan','Feb','Mar'],[null,-2,5]);expect(facts).toContain('first -2 (Feb)');expect(facts).toContain('last 5 (Mar)');
  const table=tableFacts(['lake','altitude m'],[['A',100],['B',900],['C',300]],1);expect(table).toContain('3 rows');expect(table).toContain('min 100, max 900');expect(table).not.toContain('lake: B');expect(table).toContain('Do not infer omitted row details');
});
it('does not hide a chart because a different card has a dedicated explanation',async()=>{
  render(<div className="card"><div><h4>Radar</h4><div data-chart-kind="echarts"/><AutoExplain facts="radar: balance -2, temperature 1"/></div><div><h4>Validación</h4><Interpret title="Validación" facts="coverage 80%" plain="Validación local"/></div></div>,{wrapper});
  await waitFor(()=>expect(screen.getAllByRole('button',{name:'Explícame este gráfico'})).toHaveLength(2));
});
it('only replaces an automatic explanation with the dedicated explanation of the adjacent chart and restores it when needed',async()=>{
  const view=(explicit)=><div className="card"><div data-chart-kind="echarts"/><AutoExplain facts="line: 12 points"/>{explicit&&<Interpret title="Balance" facts="balance 20 mm" plain="Balance local"/>}</div>;
  const {rerender}=render(view(true),{wrapper});await waitFor(()=>expect(screen.getAllByRole('button',{name:'Explícame este gráfico'})).toHaveLength(1));
  rerender(view(false));expect(await screen.findByRole('button',{name:'Explícame este gráfico'})).toBeTruthy();
});
it('sends the visible table context to Killa and offers a local explanation when the model fails',async()=>{
  const user=userEvent.setup();explainChart.mockRejectedValue(new Error('offline'));
  const facts=tableFacts(['lake','water balance mm'],[['Titicaca',-120]]);
  render(<Interpret kind="table" title="Estado de lagos" facts={facts} how="Cada fila es un lago." plain="El balance no mide el nivel."/>,{wrapper});
  await user.click(screen.getByRole('button',{name:'Explícame esta tabla'}));
  expect(explainChart.mock.calls[0][0]).toMatchObject({kind:'table',title:'Estado de lagos',facts,lang:'es'});
  expect(await screen.findByText('El balance no mide el nivel.')).toBeTruthy();expect(screen.getByText('Explicación local de Killa.')).toBeTruthy();
});
