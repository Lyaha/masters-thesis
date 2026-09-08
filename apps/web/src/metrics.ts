import type { DashboardRow } from './types';

export type Totals = { w: number; m: number; n: number };
export const percentage = (value: number, total: number) => total ? Math.round((value / total) * 100) : 0;
export function calculateTotals(rows: DashboardRow[]): Totals {
  return rows.reduce((totals, row) => ({ w: totals.w + Number(row.women), m: totals.m + Number(row.men), n: totals.n + Number(row.nonbinary) }), { w: 0, m: 0, n: 0 });
}
