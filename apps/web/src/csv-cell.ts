export function escapeCsv(value: string | number): string {
  const text = String(value);
  const safeText =
    typeof value === 'string' && /^[\s\uFEFF]*[=+@-]/u.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safeText) ? `"${safeText.replace(/"/g, '""')}"` : safeText;
}
