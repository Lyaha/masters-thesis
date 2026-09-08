import { describe, expect, it } from 'vitest';
import { filterOptions, filterRows } from './dashboard-filters';
import type { DashboardRow } from './types';

const rows: DashboardRow[] = [
  { year: 2024, region: 'Київ', institution: 'ЗВО 1', women: '10', men: '20', nonbinary: '0', total: '30' },
  { year: 2025, region: 'Львів', institution: 'ЗВО 2', women: '12', men: '18', nonbinary: '1', total: '31' },
];

describe('dashboard filters', () => {
  it('filters rows by selected region', () => expect(filterRows(rows, { region: 'Львів' })).toEqual([rows[1]]));
  it('builds unique options for controls', () => expect(filterOptions(rows).regions).toEqual(['Київ', 'Львів']));
});
