import { describe, expect, it } from 'vitest';
import { parseStatisticsCsv } from './csv';

const valid =
  'institution,region,specialty,educationLevel,year,womenCount,menCount,nonbinaryCount\nDemo,Kyiv,Software Engineering,bachelor,2025,10,20,1';
describe('parseStatisticsCsv', () => {
  it('parses a valid statistics dataset', () =>
    expect(parseStatisticsCsv(valid)).toEqual([
      {
        institution: 'Demo',
        region: 'Kyiv',
        specialty: 'Software Engineering',
        educationLevel: 'bachelor',
        year: 2025,
        womenCount: 10,
        menCount: 20,
        nonbinaryCount: 1,
      },
    ]));

  it('parses values with commas inside quoted fields', () => {
    const csv = valid.replace('Demo,Kyiv', '"Demo, campus",Kyiv');
    expect(parseStatisticsCsv(csv)[0].institution).toBe('Demo, campus');
  });

  it('rejects a missing required column', () =>
    expect(() => parseStatisticsCsv('institution,region\nDemo,Kyiv')).toThrow('обов’язкових'));
  it('rejects invalid numeric values', () =>
    expect(() => parseStatisticsCsv(valid.replace(',10,20,1', ',ten,20,1'))).toThrow(
      'Некоректне число',
    ));
  it('rejects rows with a missing field', () =>
    expect(() => parseStatisticsCsv(valid.replace('Kyiv', ''))).toThrow('Порожнє поле'));
  it('rejects unclosed quotes', () =>
    expect(() => parseStatisticsCsv(valid.replace('Demo', '"Demo'))).toThrow('Незакриті лапки'));
});
