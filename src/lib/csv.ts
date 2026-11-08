/** Minimal CSV helper. A leading BOM makes Excel open UTF-8 text correctly. */
export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(columns: string[], rows: Array<Record<string, unknown>>): string {
  const header = columns.map(csvEscape).join(",");
  const lines = rows.map((r) => columns.map((c) => csvEscape(r[c])).join(","));
  return "\uFEFF" + [header, ...lines].join("\r\n") + "\r\n";
}
