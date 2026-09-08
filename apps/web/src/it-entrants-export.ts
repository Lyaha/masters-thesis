import type { ItEntrantRow } from './types';

const columns: { label: string; value: (row: ItEntrantRow) => string | number }[] = [
  { label: 'Рік', value: (row) => row.year },
  { label: 'Регіон', value: (row) => row.region },
  { label: 'Заклад освіти', value: (row) => row.institution },
  { label: 'Спеціальність', value: (row) => row.specialty },
  { label: 'Зараховано', value: (row) => row.total },
];

export function downloadItEntrantsCsv(rows: ItEntrantRow[]): void {
  const header = columns.map((column) => escapeCsv(column.label));
  const data = rows.map((row) => columns.map((column) => escapeCsv(column.value(row))));
  const blob = new Blob(
    [`\uFEFF${[header, ...data].map((values) => values.join(',')).join('\r\n')}`],
    {
      type: 'text/csv;charset=utf-8',
    },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `edbo-it-entrants-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
