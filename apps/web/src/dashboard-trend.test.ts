import { describe, expect, it } from 'vitest';
import { buildYearlyGenderTotals } from './dashboard-trend';
import type { DashboardRow } from './types';

const row = (overrides: Partial<DashboardRow>): DashboardRow => ({
  year: 2023,
  region: 'Київ',
  institution: 'ЗВО',
  women: '10',
  men: '20',
  nonbinary: '1',
  total: '31',
  ...overrides,
});

describe('buildYearlyGenderTotals', () => {
  it('aggregates records from the same year and orders years ascending', () => {
    const result = buildYearlyGenderTotals([
      row({ year: 2024, women: '7', men: '8', nonbinary: '0' }),
      row({ year: 2023, women: '10', men: '20', nonbinary: '1' }),
      row({ year: 2023, women: '5', men: '6', nonbinary: '2' }),
    ]);

    expect(result).toEqual([
      { year: 2023, women: 15, men: 26, nonbinary: 3 },
      { year: 2024, women: 7, men: 8, nonbinary: 0 },
    ]);
  });

  it('returns no points when there are no dashboard rows', () => {
    expect(buildYearlyGenderTotals([])).toEqual([]);
  });
});
