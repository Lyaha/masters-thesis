import assert from 'node:assert/strict';
import test from 'node:test';
import { sourceSchema } from './schemas.js';

const categoryId = '8f701a00-0000-4000-8000-000000000001';

test('source schema accepts exactly one category option', () => {
  const existingCategorySource = sourceSchema.safeParse({
    categoryId,
    name: 'Міністерство освіти',
    baseUrl: 'https://mon.gov.ua',
    importType: 'api',
  });
  const newCategorySource = sourceSchema.safeParse({
    category: { name: 'Новий реєстр' },
    name: 'Нове джерело',
    importType: 'manual',
  });

  assert.equal(existingCategorySource.success, true);
  assert.equal(newCategorySource.success, true);
});

test('source schema rejects missing or ambiguous category options', () => {
  const missingCategory = sourceSchema.safeParse({
    name: 'Джерело без категорії',
    importType: 'csv',
  });
  const ambiguousCategory = sourceSchema.safeParse({
    categoryId,
    category: { name: 'Нова категорія' },
    name: 'Неоднозначне джерело',
    importType: 'csv',
  });

  assert.equal(missingCategory.success, false);
  assert.equal(ambiguousCategory.success, false);
});
