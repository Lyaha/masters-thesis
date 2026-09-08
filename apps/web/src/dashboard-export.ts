import type { DashboardRow } from './types';

type ExportOptions = {
  institutionLabel?: string;
  fileName?: string;
  includeRegion?: boolean;
};

export function dashboardRowsToCsv(rows: DashboardRow[], options: ExportOptions = {}): string {
  const columns = createColumns(
    options.institutionLabel ?? 'Заклад освіти',
    options.includeRegion ?? true,
  );
  const header = columns.map((column) => escapeCsv(column.label));
  const data = rows.map((row) => columns.map((column) => escapeCsv(column.value(row) ?? '')));

  return `\uFEFF${[header, ...data].map((values) => values.join(',')).join('\r\n')}`;
}

export function downloadDashboardCsv(rows: DashboardRow[], options?: ExportOptions): void {
  const blob = new Blob([dashboardRowsToCsv(rows, options)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download =
    options?.fileName ?? `gender-it-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function createColumns(institutionLabel: string, includeRegion: boolean) {
  return [
    { label: 'Рік', value: (row: DashboardRow) => row.year },
    ...(includeRegion ? [{ label: 'Регіон', value: (row: DashboardRow) => row.region }] : []),
    { label: institutionLabel, value: (row: DashboardRow) => row.institution },
    { label: 'Спеціальність', value: (row: DashboardRow) => row.specialty },
    { label: 'Жінки', value: (row: DashboardRow) => row.women },
    { label: 'Чоловіки', value: (row: DashboardRow) => row.men },
    { label: 'Інші', value: (row: DashboardRow) => row.nonbinary },
    { label: 'Усього', value: (row: DashboardRow) => row.total },
  ];
}

function escapeCsv(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
