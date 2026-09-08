import { describe, expect, it } from 'vitest';
import { calculateTotals, percentage } from './metrics';

describe('dashboard metrics', () => {
  it('calculates totals from API rows', () =>
    expect(
      calculateTotals([
        {
          year: 2025,
          region: 'Kyiv',
          institution: 'Demo',
          women: '12',
          men: '20',
          nonbinary: '1',
          total: '33',
        },
      ]),
    ).toEqual({ w: 12, m: 20, n: 1 }));
  it('returns zero percentage for an empty dataset', () => expect(percentage(0, 0)).toBe(0));
  it('rounds the percentage', () => expect(percentage(1, 3)).toBe(33));
});
