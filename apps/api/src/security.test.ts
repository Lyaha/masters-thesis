import assert from 'node:assert/strict';
import test from 'node:test';
import { credentialsSchema, dashboardFiltersSchema, datasetImportSchema } from './schemas.js';
import { jwtSecret } from './config.js';
import { fetchOpenData, isAllowedSourceUrl } from './services/open-data-http.js';
import { cachedSource } from './services/source-cache.js';
import { createLoginLimit } from './login-limit.js';
import { EventEmitter } from 'node:events';

test('configuration refuses absent and public JWT secrets', () => {
  const original = process.env.JWT_SECRET;
  try {
    for (const secret of ['', 'development-only-secret', 'replace-this-in-production']) {
      process.env.JWT_SECRET = secret;
      assert.throws(jwtSecret);
    }
  } finally {
    if (original === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = original;
  }
});

test('password constraints use UTF-8 bytes; year/count bounds match the database', () => {
  const credentials = (password: string) =>
    credentialsSchema.safeParse({ email: 'test@example.com', password }).success;
  assert.equal(credentials('я'.repeat(36)), true);
  assert.equal(credentials('я'.repeat(37)), false);
  assert.equal(credentials('a'.repeat(73)), false);
  for (const year of [0, '', 1999, 2101])
    assert.equal(dashboardFiltersSchema.safeParse({ year }).success, false);
  const payload = {
    categoryId: '8f701a00-0000-4000-8000-000000000001',
    title: 'Test',
    periodLabel: '2025',
    records: [
      {
        institution: 'University',
        region: 'Kyiv',
        specialty: 'IT',
        educationLevel: 'bachelor',
        year: 2025,
        womenCount: 2147483647,
        menCount: 1,
      },
    ],
  };
  assert.equal(datasetImportSchema.safeParse(payload).success, true);
  payload.records[0].womenCount += 1;
  assert.equal(datasetImportSchema.safeParse(payload).success, false);
});

test('dataset schema accepts the 15000-row fixture size and enforces the 20000-row cap', () => {
  const record = {
    institution: 'Test university',
    region: 'Kyiv',
    specialty: 'IT',
    educationLevel: 'bachelor',
    year: 2025,
    womenCount: 10,
    menCount: 20,
    nonbinaryCount: 0,
  };
  const metadata = {
    categoryId: '8f701a00-0000-4000-8000-000000000001',
    title: 'Load test',
    periodLabel: '2025',
  };
  assert.equal(
    datasetImportSchema.safeParse({
      ...metadata,
      records: Array.from({ length: 15000 }, (_, i) => ({
        ...record,
        institution: `Test university ${i}`,
      })),
    }).success,
    true,
  );
  assert.equal(
    datasetImportSchema.safeParse({
      ...metadata,
      records: Array.from({ length: 20001 }, (_, i) => ({
        ...record,
        institution: `Test university ${i}`,
      })),
    }).success,
    false,
  );
});

test('only exact HTTPS provider endpoints are eligible, including redirects', async () => {
  for (const url of [
    'http://127.0.0.1/',
    'http://2130706433/',
    'https://[::1]/',
    'http://169.254.169.254/',
    'https://ec.europa.eu.evil.test/',
    'https://user:pass@registry.edbo.gov.ua/api/opendata/university-entrant/',
    'https://registry.edbo.gov.ua/api/opendata/university-entrant/?redirect=http://127.0.0.1',
  ]) {
    assert.equal(isAllowedSourceUrl(url), false);
  }
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(options?.redirect, 'error');
    assert.equal(
      String(url),
      'https://registry.edbo.gov.ua/api/opendata/university-entrant?y=2025',
    );
    return new Response('{}');
  };
  try {
    await assert.rejects(fetchOpenData(new URL('http://127.0.0.1/'), {}));
    assert.equal(calls, 0);
    await fetchOpenData(
      new URL('https://registry.edbo.gov.ua/api/opendata/university-entrant/?y=2025'),
      {},
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test('cache coalesces requests, separates URLs and retries after failures', async () => {
  let calls = 0;
  const load = cachedSource(async (url) => {
    calls++;
    await Promise.resolve();
    if (calls === 1) throw new Error('transient');
    return url;
  }, 1000);
  const failed = await Promise.allSettled([load('a'), load('a')]);
  assert.equal(calls, 1);
  assert.ok(failed.every((result) => result.status === 'rejected'));
  assert.deepEqual(await Promise.all([load('a'), load('a'), load('b')]), ['a', 'a', 'b']);
  assert.equal(calls, 3);
  assert.equal(await load('a'), 'a');
  assert.equal(calls, 3);
});

test('login limiter reserves concurrent attempts and expires its window', () => {
  const original = Date.now;
  let now = 0;
  Date.now = () => now;
  try {
    const limit = createLoginLimit(2, 1000);
    const call = () => {
      const result = { next: false, status: 0, retry: '' };
      const response = Object.assign(new EventEmitter(), {
        setHeader(_key: string, value: string) {
          result.retry = value;
        },
        status(value: number) {
          result.status = value;
          return this;
        },
        json() {},
      });
      limit({ ip: 'test', body: { email: 'user@example.com' } } as never, response as never, () => {
        result.next = true;
      });
      return result;
    };
    assert.equal(call().next, true);
    assert.equal(call().next, true);
    assert.equal(call().status, 429);
    now = 1001;
    assert.equal(call().next, true);
  } finally {
    Date.now = original;
  }
});
