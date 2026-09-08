import type { DashboardRow } from './types';

const columns: { label: string; value: (row: DashboardRow) => string | number | undefined }[] = [
  { label: 'Рік', value: (row) => row.year },
  { label: 'Регіон', value: (row) => row.region },
  { label: 'Заклад освіти', value: (row) => row.institution },
  { label: 'Спеціальність', value: (row) => row.specialty },
  { label: 'Жінки', value: (row) => row.women },
  { label: 'Чоловіки', value: (row) => row.men },
  { label: 'Інші', value: (row) => row.nonbinary },
  { label: 'Усього', value: (row) => row.total },
];

export function dashboardRowsToCsv(rows: DashboardRow[]): string {
  const header = columns.map((column) => escapeCsv(column.label));
  const data = rows.map((row) => columns.map((column) => escapeCsv(column.value(row) ?? '')));

  return `\uFEFF${[header, ...data].map((values) => values.join(',')).join('\r\n')}`;
}

export function downloadDashboardCsv(rows: DashboardRow[]): void {
  const blob = new Blob([dashboardRowsToCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `gender-it-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
