import { describe, expect, it } from 'vitest';
import { dashboardRowsToCsv } from './dashboard-export';

describe('dashboard CSV export', () => {
  it('adds a UTF-8 BOM and Ukrainian column labels', () => {
    const csv = dashboardRowsToCsv([]);
    expect(csv).toBe('\uFEFFРік,Регіон,Заклад освіти,Спеціальність,Жінки,Чоловіки,Інші,Усього');
  });

  it('escapes values that contain commas and quotes', () => {
    const csv = dashboardRowsToCsv([
      {
        year: 2025,
        region: 'Київ',
        institution: 'ЗВО, №1',
        specialty: 'Інженерія "ПЗ"',
        women: '12',
        men: '20',
        nonbinary: '1',
        total: '33',
      },
    ]);

    expect(csv).toContain('2025,Київ,"ЗВО, №1","Інженерія ""ПЗ""",12,20,1,33');
  });
});
