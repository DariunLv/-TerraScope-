import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { useStore } from '../core/store';
import { readNavigation, startNavigation } from '../core/navigation';
import { useRouteState } from '../core/useRouteState';
import { runAnalysis } from '../lib/analysis/run';
import Interpret from '../shared/Interpret';
import Wizard from '../features/lab/Wizard';
import { explainChart } from '../features/decide/llm';
import { V } from '../lib/nasa/data';
vi.mock('../features/decide/llm', () => ({ explainChart: vi.fn() }));
const wrap = ({children}) => <MantineProvider theme={{colors:{forest:Array(10).fill('#0c5a43'),navy:Array(10).fill('#1e3a8a')}}}>{children}</MantineProvider>;
beforeEach(() => { useStore.setState({ lang:'es', aud:'auth', place:{id:'moq',lat:-17.19,lon:-70.93}, job:null, routeRevision:0 }); });
afterEach(() => vi.unstubAllGlobals());
it('restores view, place, practice and filter state on browser navigation', async () => {
  history.replaceState(null, '', '/?vista=explorar&lugar=art&practice=1&variable=T2M');
  const stop = startNavigation(useStore);
  expect(useStore.getState()).toMatchObject({view:'explorar',practice:true,place:{id:'art'}});
  const {result}=renderHook(() => useRouteState('variable','T2M',value=>['T2M','TS'].includes(value)));
  act(()=>result.current[1]('TS')); expect(new URL(location.href).searchParams.get('variable')).toBe('TS');
  act(()=>{history.replaceState(null,'','/?vista=lab&lat=12&lon=44&variable=T2M');window.dispatchEvent(new PopStateEvent('popstate'));});
  expect(useStore.getState()).toMatchObject({view:'lab',practice:false,place:{id:'custom',lat:12,lon:44}}); expect(result.current[0]).toBe('T2M');
  act(()=>{history.replaceState(null,'','/');window.dispatchEvent(new PopStateEvent('popstate'));}); expect(useStore.getState().place.id).toBe('moq');
  history.replaceState(null,'','/?lat=999&lon=999&vista=invalid'); expect(readNavigation()).toMatchObject({view:'inicio',place:{id:'moq'}}); stop();
});
it('rejects cancelled work immediately even while waiting in the worker queue', async () => {
  const workers=[]; class FakeWorker { constructor(){workers.push(this);} postMessage(){} terminate(){this.terminated=true;} }
  vi.stubGlobal('Worker',FakeWorker);
  const first=runAnalysis('analyze',{}),second=runAnalysis('analyze',{}),ctl=new AbortController();
  const third=runAnalysis('analyze',{}, {signal:ctl.signal}); ctl.abort(); await expect(third).rejects.toMatchObject({name:'AbortError'}); expect(workers).toHaveLength(2);
  workers[0].onmessage({data:{result:['first']}}); workers[1].onmessage({data:{result:['second']}}); expect(await first).toEqual(['first']);expect(await second).toEqual(['second']);expect(workers.every(worker=>worker.terminated)).toBe(true);
});
it('discards explanations for a previous chart and permits a new request', async () => {
  const user=userEvent.setup(); let oldResolve,newResolve;
  explainChart.mockImplementationOnce(()=>new Promise(resolve=>oldResolve=resolve)).mockImplementationOnce(()=>new Promise(resolve=>newResolve=resolve));
  const {rerender}=render(<Interpret title="A" facts="A 10" plain="A"/>,{wrapper:wrap});
  await user.click(screen.getByRole('button',{name:'Explícame este gráfico'}));const oldSignal=explainChart.mock.calls[0][0].signal;
  rerender(<Interpret title="B" facts="B 20" plain="B"/>);expect(oldSignal.aborted).toBe(true);
  await user.click(screen.getByRole('button',{name:'Explícame este gráfico'}));
  await act(async()=>{oldResolve('Respuesta antigua');newResolve('Respuesta vigente');});
  expect(await screen.findByText('Respuesta vigente')).toBeTruthy();expect(screen.queryByText('Respuesta antigua')).toBeNull();
});
it('preserves an unfinished manual investigation across section remounts', async()=>{
  const user=userEvent.setup(),defaults={vars:['T2M'],years:[1981,2025],ds:true};
  const view=render(<Wizard defaults={defaults} onRun={vi.fn()}/>,{wrapper:wrap});
  await user.click(screen.getByRole('button',{name:'Continuar'}));await screen.findByText(/¿Qué variables quieres analizar/);view.unmount();
  render(<Wizard defaults={defaults} onRun={vi.fn()}/>,{wrapper:wrap});await waitFor(()=>expect(screen.getByRole('form').getAttribute('data-step')).toBe('2'));expect(screen.getByLabelText(V.T2M.es[0]).checked).toBe(true);
});
