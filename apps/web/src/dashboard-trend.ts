import type { DashboardRow } from './types';

export type YearlyGenderTotals = {
  year: number;
  women: number;
  men: number;
  nonbinary: number;
};

export function buildYearlyGenderTotals(rows: DashboardRow[]): YearlyGenderTotals[] {
  const totalsByYear = new Map<number, YearlyGenderTotals>();

  for (const row of rows) {
    const totals = totalsByYear.get(row.year) ?? {
      year: row.year,
      women: 0,
      men: 0,
      nonbinary: 0,
    };

    totals.women += Number(row.women);
    totals.men += Number(row.men);
    totals.nonbinary += Number(row.nonbinary);
    totalsByYear.set(row.year, totals);
  }

  return [...totalsByYear.values()].sort((first, second) => first.year - second.year);
}
