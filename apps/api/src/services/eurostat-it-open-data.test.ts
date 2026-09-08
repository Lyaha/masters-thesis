import assert from 'node:assert/strict';
import test from 'node:test';
import { parseEurostatItStudents } from './eurostat-it-open-data.js';

test('parses Eurostat ICT students by country, year and sex', () => {
  const rows = parseEurostatItStudents({
    id: ['sex', 'geo', 'time'],
    size: [3, 1, 1],
    dimension: {
      sex: { category: { index: { T: 0, M: 1, F: 2 } } },
      geo: { category: { index: { PL: 0 }, label: { PL: 'Poland' } } },
      time: { category: { index: { '2023': 0 } } },
    },
    value: { 0: 121, 1: 80, 2: 40 },
  });

  assert.deepEqual(rows, [
    {
      year: 2023,
      region: 'Poland',
      institution: 'Poland',
      specialty: 'Information and communication technologies',
      women: '40',
      men: '80',
      nonbinary: '1',
      total: '121',
    },
  ]);
});
