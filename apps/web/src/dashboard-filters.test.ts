import { describe, expect, it } from 'vitest';
import { filterOptions, filterRows } from './dashboard-filters';
import type { DashboardRow } from './types';

const rows: DashboardRow[] = [
  { year: 2024, region: 'Київ', institution: 'ЗВО 1', specialty: 'Інженерія ПЗ', women: '10', men: '20', nonbinary: '0', total: '30' },
  { year: 2025, region: 'Львів', institution: 'ЗВО 2', specialty: 'Комп’ютерні науки', women: '12', men: '18', nonbinary: '1', total: '31' },
];

describe('dashboard filters', () => {
  it('filters rows by selected region', () => expect(filterRows(rows, { region: 'Львів' })).toEqual([rows[1]]));
  it('filters rows by selected specialty', () => expect(filterRows(rows, { specialty: 'Інженерія ПЗ' })).toEqual([rows[0]]));
  it('builds unique options for controls', () => expect(filterOptions(rows).regions).toEqual(['Київ', 'Львів']));
  it('builds specialty options for controls', () => expect(filterOptions(rows).specialties).toEqual(['Інженерія ПЗ', 'Комп’ютерні науки']));
});
