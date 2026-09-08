import type { DashboardRow } from './types';

export type DashboardFilters = {
  year?: string;
  region?: string;
  institution?: string;
  specialty?: string;
};

export function filterRows(rows: DashboardRow[], filters: DashboardFilters): DashboardRow[] {
  return rows.filter((row) =>
    (!filters.year || String(row.year) === filters.year) &&
    (!filters.region || row.region === filters.region) &&
    (!filters.institution || row.institution === filters.institution) &&
    (!filters.specialty || row.specialty === filters.specialty),
  );
}

export function filterOptions(rows: DashboardRow[]) {
  const unique = (values: string[]) => [...new Set(values)]
    .sort((a, b) => a.localeCompare(b, 'uk'));
  return {
    years: unique(rows.map((row) => String(row.year))),
    regions: unique(rows.map((row) => row.region)),
    institutions: unique(rows.map((row) => row.institution)),
    specialties: unique(rows.flatMap((row) => row.specialty ? [row.specialty] : [])),
  };
}
