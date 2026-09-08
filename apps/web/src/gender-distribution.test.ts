import { describe, expect, it } from 'vitest';
import { genderDistribution } from './gender-distribution';

describe('genderDistribution', () => {
  it('returns men first for the default active dashboard segment', () => {
    const segments = genderDistribution({ m: 60, w: 35, n: 5 });

    expect(segments).toEqual([
      { id: 'men', label: 'Чоловіки', value: 60, percentage: 60, color: '#4294dd' },
      { id: 'women', label: 'Жінки', value: 35, percentage: 35, color: '#7e70e7' },
      { id: 'other', label: 'Інші', value: 5, percentage: 5, color: '#52bda5' },
    ]);
  });

  it('handles an empty data set without invalid percentages', () => {
    expect(genderDistribution({ m: 0, w: 0, n: 0 }).map((segment) => segment.percentage)).toEqual([
      0, 0, 0,
    ]);
  });
});
