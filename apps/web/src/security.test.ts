import { describe, expect, it } from 'vitest';
import { escapeCsv } from './csv-cell';
import { parseStatisticsCsv } from './csv';

describe('safe CSV boundaries', () => {
  it('neutralizes formula prefixes, including whitespace, without changing ordinary text', () => {
    for (const text of ['=1+1', '+1+1', '-1+1', '@SUM(A1)', '\t=1', '\r=1', '\n=1']) {
      expect(escapeCsv(text).replace(/^"/, '')).toMatch(/^'/);
    }
    expect(escapeCsv('Kyiv')).toBe('Kyiv');
    expect(escapeCsv('a,"b"')).toBe('"a,""b"""');
    expect(escapeCsv(12)).toBe('12');
  });
  it('rejects client/API range mismatches and duplicate observations', () => {
    const header =
      'institution,region,specialty,educationLevel,year,womenCount,menCount,nonbinaryCount';
    const row = 'University,Kyiv,IT,bachelor,2025,10,20,0';
    for (const invalid of [row.replace('2025', '1999'), row.replace(',10,', ',2147483648,')]) {
      expect(() => parseStatisticsCsv(`${header}\n${invalid}`)).toThrow();
    }
    expect(() => parseStatisticsCsv(`${header}\n${row}\n${row}`)).toThrow();
    expect(parseStatisticsCsv(`${header}\n${row}\n${row.replace('Kyiv', 'Lviv')}`)).toHaveLength(2);
  });
});
