import { analyze } from './stats';
import { assess, eelRaw, timeline, validate } from '../../features/decide/decideEngine';
import { watchLake } from '../../features/lakes/lakeclim';
import { simulate, earlyWarning, fillGaps } from './intel';
import * as F from './forecast';
import * as advanced from './advanced';
export async function analysisTask(type, payload, progress = () => {}, yieldTask = () => Promise.resolve()) {
  if (type === 'forecast') return { backtest: payload.y.length >= 72 ? F.backtest(payload.y, payload.m0) : null, params: F.hwParams(payload.y) };
  if (type === 'warning') return { result: earlyWarning(fillGaps(payload.points).pts) };
  if (type === 'robust') return { boot: advanced.bootstrapSen(payload.annual.years, payload.annual.y, 500), seasonal: advanced.seasonalMK(payload.raw), detect: advanced.yearsToDetect(payload.x, payload.y) };
  if (type === 'periods') return advanced.sensitivity(payload.years, payload.y, 10);
  if (type === 'assess') return assess(payload.clim, payload.tgt, (es, en) => payload.lang === 'es' ? es : en, payload.points, payload.observations);
  if (type === 'timeline') { const rows = timeline(payload.clim, payload.fromYear); return { rows, validation: validate(payload.clim, rows) }; }
  if (type === 'lake') return { watch: watchLake(payload.clim), raw: eelRaw(payload.clim, payload.lake), prediction: simulate(payload.clim.wb, { years: 1, B: 150, seed: 11 }).ann[0] };
  if (type !== 'analyze' && type !== 'scan') throw new Error('Unknown analysis');
  const results = [];
  for (const [index, item] of payload.items.entries()) {
    try {
      const result = analyze(item.points, payload.options);
      results.push(type === 'scan' ? { ...item.meta, perDec: result.perDec, p: result.p, level: result.level } : { k: item.k, r: result, raw: item.points, source: item.source });
    } catch { /* Se informa como ausente; nunca se inventa una serie. */ }
    progress((index + 1) / payload.items.length);
    await yieldTask();
  }
  return results;
}
