/**
 * CSV for admin exports. Kept free of imports so it can be unit-tested (tests/adminRules.test.ts).
 * Cells starting with = + - @ (or tab / carriage return) are prefixed with ' so a spreadsheet
 * never runs a student-typed value as a formula (CSV injection).
 */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Header + rows as CSV text (CRLF line endings, no BOM). */
export function toCsv<T>(columns: { label: string; value: (row: T) => unknown }[], rows: T[]): string {
  return [columns.map((c) => csvCell(c.label)).join(','), ...rows.map((r) => columns.map((c) => csvCell(c.value(r))).join(','))].join('\r\n');
}
