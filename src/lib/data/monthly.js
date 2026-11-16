export const DATA_VERSION = 2;
export const monthKey = (point) => point.year * 12 + point.month;
export const isMonthlyPoint = (point) => Number.isInteger(point?.year) && point.year >= 1 && point.year <= 9999 && Number.isInteger(point.month) && point.month >= 0 && point.month < 12 && Number.isFinite(point.v);
export const coverageOf = (points) => ({ first: points[0] ? { year: points[0].year, month: points[0].month } : null, last: points.at(-1) ? { year: points.at(-1).year, month: points.at(-1).month } : null, months: points.length });

export function monthlyArray(parameters, year0, year1) {
  const values = Array((year1 - year0 + 1) * 12).fill(null);
  for (const [date, value] of Object.entries(parameters || {})) {
    if (!/^\d{6}$/.test(date) || !Number.isFinite(value) || value <= -990) continue;
    const year = +date.slice(0, 4), month = +date.slice(4);
    if (year < year0 || year > year1 || month < 1 || month > 12) continue;
    values[(year - year0) * 12 + month - 1] = +value.toFixed(3);
  }
  return values;
}

export function pointsFromArray(values, year0, year1) {
  const count = (year1 - year0 + 1) * 12;
  if (!Array.isArray(values) || !Number.isInteger(count) || count < 1 || count > 12000 || values.length !== count) return [];
  return values.flatMap((v, index) => Number.isFinite(v) && v > -990 ? [{ year: year0 + Math.floor(index / 12), month: index % 12, x: year0 + index / 12, v }] : []);
}

// Each variable keeps its own calendar; null means there was no observation that month.
export function alignMonthly(series, { common = false } = {}) {
  const maps = series.map((points) => new Map(points.filter(isMonthlyPoint).map((point) => [monthKey(point), point.v])));
  const keys = [...new Set(maps.flatMap((map) => [...map.keys()]))].filter((key) => !common || maps.every((map) => map.has(key))).sort((a, b) => a - b);
  return { keys, dates: keys.map((key) => `${Math.floor(key / 12)}-${String(key % 12 + 1).padStart(2, '0')}`), values: maps.map((map) => keys.map((key) => map.get(key) ?? null)), n: keys.length };
}

export function periodText(points) {
  if (!points?.length) return '';
  const label = (p) => `${p.year}-${String(p.month + 1).padStart(2, '0')}`;
  return `${label(points[0])}–${label(points.at(-1))}`;
}
