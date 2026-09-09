import assert from 'node:assert/strict';
import test from 'node:test';
import { parseEurostatItStudents } from './eurostat-it-open-data.js';

const fixture = {
  id: ['sex', 'geo', 'time'],
  size: [3, 1, 1],
  dimension: {
    sex: { category: { index: { T: 0, M: 1, F: 2 } } },
    geo: { category: { index: { PL: 0 }, label: { PL: 'Poland' } } },
    time: { category: { index: { '2023': 0 } } },
  },
  value: { 0: 30, 1: 20, 2: 10 },
};

test('Eurostat omits missing/suppressed/inconsistent counts without inventing zeros', () => {
  for (const value of [
    { 0: 30, 1: 20 },
    { 0: 30, 1: 20, 2: null },
    { 0: 10, 1: 20, 2: 10 },
    { 0: 30, 1: -1, 2: 31 },
  ]) {
    assert.deepEqual(parseEurostatItStudents({ ...fixture, value }), []);
  }
  assert.deepEqual(
    parseEurostatItStudents({
      ...fixture,
      size: [1, 1, 1],
      dimension: { ...fixture.dimension, sex: { category: { index: { M: 0 } } } },
      value: { 0: 20 },
    }),
    [],
  );
  assert.equal(
    parseEurostatItStudents({ ...fixture, value: { 0: 20, 1: 20, 2: 0 } })[0].women,
    '0',
  );
});

test('Eurostat rejects malformed metadata and out-of-range coordinates', () => {
  for (const payload of [
    null,
    {},
    { ...fixture, dimension: null },
    { ...fixture, value: null },
    { ...fixture, size: [3] },
    {
      ...fixture,
      dimension: { ...fixture.dimension, sex: { category: { index: { T: 100, M: 1, F: 2 } } } },
    },
  ]) {
    assert.deepEqual(parseEurostatItStudents(payload), []);
  }
});

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
