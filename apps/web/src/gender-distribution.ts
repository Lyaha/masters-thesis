import { percentage, type Totals } from './metrics';

export type GenderId = 'men' | 'women' | 'other';

export type GenderSegment = {
  id: GenderId;
  label: string;
  value: number;
  percentage: number;
  color: string;
};

export function genderDistribution(totals: Totals): GenderSegment[] {
  const total = totals.m + totals.w + totals.n;

  return [
    {
      id: 'men',
      label: 'Чоловіки',
      value: totals.m,
      percentage: percentage(totals.m, total),
      color: '#4294dd',
    },
    {
      id: 'women',
      label: 'Жінки',
      value: totals.w,
      percentage: percentage(totals.w, total),
      color: '#7e70e7',
    },
    {
      id: 'other',
      label: 'Інші',
      value: totals.n,
      percentage: percentage(totals.n, total),
      color: '#52bda5',
    },
  ];
}
