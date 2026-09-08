import assert from 'node:assert/strict';
import test from 'node:test';
import { parseEdboEntrants } from './it-open-data.js';

test('parses EDEBO enrolment counts for computer science', () => {
  const rows = parseEdboEntrants([
    {
      'Рік вступу': 2024,
      Регіон: 'Київ',
      'Назва закладу освіти': 'Приклад ЗВО',
      'Назва спеціальності': "Комп'ютерні науки",
      'Денна (бюджет)': 10,
      'Денна (контракт)': '15',
      'Заочна (бюджет)': 2,
      'Заочна (контракт)': 0,
      'Вечірня (бюджет)': null,
      'Вечірня (контракт)': 3,
    },
    { 'Рік вступу': 2024 },
  ]);

  assert.deepEqual(rows, [
    {
      year: 2024,
      region: 'Київ',
      institution: 'Приклад ЗВО',
      specialty: "Комп'ютерні науки",
      total: '30',
    },
  ]);
});
