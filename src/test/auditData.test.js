import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { monthlyArray, pointsFromArray, alignMonthly } from '../lib/data/monthly';
import { parseCsv, parsePower, power } from '../lib/nasa/data';
import { parsePoints, parseLakes } from '../features/lakes/lakesData';
import { yearComparison } from '../lib/analysis/forecast';
import { alignedPair, monthlyCorrelation } from '../lib/analysis/viz';
import { clearClimateCache, lakeClimate, last12 } from '../features/lakes/lakeclim';
import { unverifiedNumbers, getCfg, setCfg } from '../features/decide/llm';
import { createRequestGuard } from '../core/useRequest';
import { assess, passport } from '../features/decide/decideEngine';
import { LAKES } from '../features/lakes/lakesData';
import { decisionStatements, unverifiedStatements } from '../features/decide/evidence';
import { readCsv, writeCsv } from '../lib/data/csv';

beforeEach(() => { sessionStorage.clear(); localStorage.clear(); clearClimateCache(); vi.unstubAllGlobals(); });
const points = (n = 540) => Array.from({ length: n }, (_, index) => ({ year: 1981 + Math.floor(index / 12), month: index % 12, x: 1981 + index / 12, v: index % 12 + index * 0.01 }));
describe('Climate data integrity', () => {
  it('rejects month 13, invalid dates, sentinel values and points outside the requested period', () => {
    expect(monthlyArray({ 202501: 2, 202513: 90, 202600: 88, 202601: 1, 202502: null, 202503: -999, 202504: Infinity }, 2025, 2025)).toEqual([2, ...Array(11).fill(null)]);
    expect(parsePower({ properties: { parameter: { T2M: { 202501: 2, 202513: 90, 202502: Infinity } } } }, ['T2M']).T2M).toHaveLength(1);
    expect(pointsFromArray(Array(13).fill(1), 2025, 2025)).toEqual([]);
  });
  it('ships exactly the declared months for every stored point and variable', () => {
    const snapshot = JSON.parse(readFileSync('public/datos/clima-lagos.json', 'utf8'));
    expect(snapshot.schemaVersion).toBe(2);
    for (const series of Object.values(snapshot.series)) for (const values of Object.values(series)) {
      expect(values).toHaveLength((snapshot.y1 - snapshot.y0 + 1) * 12);
      const parsed = pointsFromArray(values, snapshot.y0, snapshot.y1);
      expect(parsed.length).toBe(values.filter(Number.isFinite).length);
      expect(parsed.every((point) => point.year >= snapshot.y0 && point.year <= snapshot.y1)).toBe(true);
    }
  });
  it('recovers a missing variable from a partial successful NASA response', async () => {
    const values = Object.fromEntries(points(24).map((point) => [`${point.year}${String(point.month + 1).padStart(2, '0')}`, point.v]));
    const fetcher = vi.fn(async (url) => ({ ok: true, json: async () => ({ properties: { parameter: String(url).includes('parameters=T2M,') ? { T2M: values } : { PRECTOTCORR: values } } }) }));
    vi.stubGlobal('fetch', fetcher);
    const result = await power(0, 0, ['T2M', 'PRECTOTCORR'], 1981, 1982);
    expect(result.T2M).toHaveLength(24); expect(result.PRECTOTCORR).toHaveLength(24); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('does not cache simulation as live data after a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(lakeClimate({ lat: 1, lon: 1 }, false)).rejects.toThrow('CLIMATE_UNAVAILABLE');
    const simulation = await lakeClimate({ lat: 1, lon: 1 }, true);
    expect(simulation.live).toBe(false);
    expect(simulation.src).toBe('demo');
    await expect(lakeClimate({ lat: 1, lon: 1 }, false)).rejects.toThrow('CLIMATE_UNAVAILABLE');
  });
  it('does not call twelve observations separated by gaps a twelve-month window', () => {
    const regular = points(); expect(last12(regular)).not.toBeNull();
    expect(last12(regular.filter((_, index) => index !== regular.length - 5))).toBeNull();
  });
  it('uses the actual historical coverage and only gives monitoring confidence to an uploaded network', async () => {
    const snapshot = JSON.parse(readFileSync('public/datos/clima-lagos.json', 'utf8')), lake = LAKES[0];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => snapshot }));
    const climate = await lakeClimate(lake, false), L = (es) => es;
    expect(climate.live).toBe(true); expect(climate.wb.at(-1)).toMatchObject({ year: 2025, month: 11 });
    const illustrative = assess(climate, lake, L, [lake], { verified: false }), uploaded = assess(climate, lake, L, [lake], { verified: true, source: 'red.csv' });
    expect(() => structuredClone(uploaded)).not.toThrow();
    expect(uploaded.conf).toBeGreaterThan(illustrative.conf); expect(illustrative.near).toBe(Infinity); expect(uploaded.near).toBe(0);
    expect((await passport(lake, uploaded)).periodo).toBe('1981-01–2025-12');
    const statements = decisionStatements(uploaded, climate, 'es'); expect(statements.some((text) => text.includes('2026-01–2026-12'))).toBe(true);
    expect(unverifiedStatements(statements[0], statements)).toBe(false);
    expect(unverifiedStatements(statements[0].replace(' mm ', ' °C '), statements)).toBe(true);
    expect(unverifiedStatements(statements[0].replace('2025-12', '2026-12'), statements)).toBe(true);
    expect(unverifiedStatements(statements[0].replace('Balance climático', 'Temperatura media'), statements)).toBe(true);
  });
});
describe('CSV interoperability and input validation', () => {
  it('reads its own export, quoted fields, semicolons and decimal commas', () => {
    expect(parseCsv('year,month,value,anomaly\n2025,1,20.5,0.2\n2025,2,21.5,0.3').map((point) => point.v)).toEqual([20.5, 21.5]);
    expect(parseCsv('fecha;valor\n2025-01;"20,5"')[0].v).toBe(20.5);
    expect(parsePoints('nombre,lat,lon\n"Estación, Norte",-12.5,-77.1')[0].name).toBe('Estación, Norte');
    const report = [['fecha', 'descripcion'], ['2025-01', 'Agua "oscura",\ncerca del muelle']];
    expect(readCsv(writeCsv(report))).toEqual(report);
  });
  it('rejects ambiguous value columns and invalid coordinates, and tolerates empty files', () => {
    expect(() => parseCsv('date,temperature,rain\n2025-01,20,2')).toThrow('CSV_AMBIGUOUS_VALUE');
    expect(parsePoints('')).toEqual([]); expect(parseLakes('')).toEqual([]);
    const invalid = parsePoints('lat,lon\n999,999\nInfinity,0');
    expect(invalid).toEqual([]); expect(invalid.issues.map((issue) => issue.row)).toEqual([2, 3]);
    expect(parseLakes('nombre,lat,lon,area\nLago,0,0,-2')).toEqual([]);
  });
});
describe('Forecast and calendar comparisons', () => {
  it('compares the last observed year to the first projected year', () => {
    expect(yearComparison([...Array(60).fill(0), ...Array(12).fill(10)], [...Array(12).fill(10), ...Array(12).fill(99)])).toMatchObject({ previousMean: 10, nextMean: 10, delta: 0 });
  });
  it('aligns missing months instead of pairing array positions', () => {
    const a = { raw: points(4), r: { y: [1, 2, 1, 2] } }, b = { raw: points(5).slice(1), r: { y: [2, 1, 2, 1] } };
    expect(alignedPair(a, b).n).toBe(3); expect(monthlyCorrelation(a, b).r).toBe(1);
    expect(alignMonthly([a.raw, b.raw]).values[1][0]).toBeNull();
  });
});
describe('Request and assistant safeguards', () => {
  it('invalidates previous requests and prevents commits after cancellation', () => {
    const guard = createRequestGuard(), old = guard.begin(), current = guard.begin();
    expect(old.current()).toBe(false); expect(old.signal.aborted).toBe(true); expect(current.current()).toBe(true);
    guard.cancel(); expect(current.current()).toBe(false);
  });
  it('rejects the opposite sign and keeps API credentials out of persistent storage', () => {
    expect(unverifiedNumbers('Balance: -347.2 mm', '{"balance":347.2}')).toContain('-347.2');
    expect(unverifiedNumbers('Balance: -347.2 mm', '{"balance":-347.2}')).toEqual([]);
    setCfg({ mode: 'claude', apiKey: 'test-session-key' });
    expect(localStorage.getItem('ts_llm_v1')).not.toContain('test-session-key'); expect(getCfg().apiKey).toBe('test-session-key');
    sessionStorage.clear(); expect(getCfg().apiKey).toBe('');
  });
});
