export const MAX_CSV_BYTES = 5 * 1024 * 1024;
export const MAX_CSV_ROWS = 100000;
export const MAX_MONTHS = 2400;
export const normalizeHeader = (text) => String(text ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export function csvNumber(text) {
  const value = String(text ?? '').trim().replace(/\u2212/g, '-');
  if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i.test(value)) return NaN;
  return Number(value.replace(',', '.'));
}
export function readCsv(text) {
  if (new TextEncoder().encode(text).length > MAX_CSV_BYTES) throw new Error('CSV_TOO_LARGE');
  const source = text.replace(/^\uFEFF/, ''), first = source.split(/\r?\n/).find((line) => line.trim() && !/^\s*#/.test(line)) || '';
  const separators = [',', ';', '\t'];
  const separator = separators.reduce((best, candidate) => first.split(candidate).length > first.split(best).length ? candidate : best, ',');
  const rows = []; let row = [], field = '', quoted = false;
  const pushRow = () => { row.push(field.trim()); field = ''; if (row.some(Boolean) && !row[0].startsWith('#')) rows.push(row); row = []; if (rows.length > MAX_CSV_ROWS) throw new Error('CSV_TOO_MANY_ROWS'); };
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '"') { if (quoted && source[index + 1] === '"') { field += '"'; index++; } else quoted = !quoted; }
    else if (!quoted && char === separator) { row.push(field.trim()); field = ''; }
    else if (!quoted && (char === '\n' || char === '\r')) { if (char === '\r' && source[index + 1] === '\n') index++; pushRow(); }
    else field += char;
  }
  if (quoted) throw new Error('CSV_UNCLOSED_QUOTE');
  if (field || row.length) pushRow();
  return rows;
}
export async function readCsvFile(file) {
  if (file.size > MAX_CSV_BYTES) throw new Error('CSV_TOO_LARGE');
  return file.text();
}
export const writeCsv = (rows) => rows.map((row) => row.map((cell) => { const text = String(cell ?? ''); return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }).join(',')).join('\r\n');
export function validatedCsvRows(rows, validate) {
  const valid = [], issues = [];
  rows.forEach((row, index) => { const reason = validate(row); if (reason) issues.push({ row: index + 2, reason }); else valid.push(row); });
  Object.defineProperty(valid, 'issues', { value: issues }); return valid;
}
export function csvIssues(rows, lang) {
  if (!rows.issues?.length) return '';
  const records = rows.issues.slice(0, 5).map((issue) => `${issue.row} (${issue.reason})`).join(', ');
  return lang === 'es' ? ` Se omitieron ${rows.issues.length} registros inválidos: ${records}.` : ` Omitted ${rows.issues.length} invalid records: ${records}.`;
}
export function csvError(error, lang = 'es') {
  const messages = {
    CSV_TOO_LARGE: ['El archivo supera el límite de 5 MB.', 'The file exceeds the 5 MB limit.'],
    CSV_TOO_MANY_ROWS: ['El archivo supera las 100 000 filas.', 'The file exceeds 100,000 rows.'],
    CSV_UNCLOSED_QUOTE: ['Hay un campo entre comillas sin cerrar en el CSV.', 'The CSV contains an unclosed quoted field.'],
    CSV_AMBIGUOUS_VALUE: ['Hay varias columnas numéricas. Usa las columnas fecha y valor, o year, month y value.', 'There are multiple numeric columns. Use date and value, or year, month and value.'],
    CSV_TOO_MANY_MONTHS: ['La serie supera el límite de 200 años.', 'The series exceeds the 200-year limit.'],
  };
  return (messages[error?.message] || ['No se pudo leer el CSV. Revisa sus columnas y valores.', 'Could not read the CSV. Check its columns and values.'])[lang === 'es' ? 0 : 1] + csvIssues(error || {}, lang);
}
