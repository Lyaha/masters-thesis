import type { ItEntrantRow } from '../types.js';

const cacheTtlMs = 5 * 60 * 1000;
const legacyAdmissionYears = [2020, 2021, 2022, 2023, 2024];
const legacyItSpecialtyIds = ['1509', '1970', '1511', '1512', '1513', '2390', '1957'];
const currentItSpecialtyIds = ['2547', '2548', '2549', '2550', '2551', '2552'];
const allocationFields = [
  'Денна (бюджет)',
  'Денна (контракт)',
  'Заочна (бюджет)',
  'Заочна (контракт)',
  'Вечірня (бюджет)',
  'Вечірня (контракт)',
];

type Cache = {
  expiresAt: number;
  rows: ItEntrantRow[];
};

let cache: Cache | null = null;

export async function loadItEntrants(sourceUrl: string): Promise<ItEntrantRow[]> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.rows;
  }

  const results = await runWithConcurrency(getRequests(), 4, async ({ year, specialtyId }) => {
    const response = await fetch(buildUrl(sourceUrl, year, specialtyId), {
      signal: AbortSignal.timeout(15_000),
    });

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new Error(`ЄДЕБО повернуло статус ${response.status}`);
    }

    return parseEdboEntrants(await response.json());
  });
  const rows = results.flat().sort((first, second) => first.year - second.year);

  if (!rows.length) {
    throw new Error('ЄДЕБО не повернуло даних про вступ на ІТ-спеціальність');
  }

  cache = { rows, expiresAt: Date.now() + cacheTtlMs };
  return rows;
}

export function parseEdboEntrants(payload: unknown): ItEntrantRow[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.flatMap((record) => {
    if (!isRecord(record)) {
      return [];
    }

    const year = Number(record['Рік вступу']);
    const region = asText(record['Регіон']);
    const institution = asText(record['Назва закладу освіти']);
    const specialty = asText(record['Назва спеціальності']);
    const total = allocationFields.reduce(
      (sum, field) => sum + toNonNegativeNumber(record[field]),
      0,
    );

    if (!Number.isInteger(year) || !region || !institution || !specialty || total === 0) {
      return [];
    }

    return [{ year, region, institution, specialty, total: String(total) }];
  });
}

function getRequests() {
  return [
    ...legacyAdmissionYears.flatMap((year) =>
      legacyItSpecialtyIds.map((specialtyId) => ({ year, specialtyId })),
    ),
    ...currentItSpecialtyIds.map((specialtyId) => ({ year: 2025, specialtyId })),
  ];
}

async function runWithConcurrency<Item, Result>(
  items: Item[],
  limit: number,
  task: (item: Item) => Promise<Result>,
): Promise<Result[]> {
  const results: Result[] = [];
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex++];
      results.push(await task(item));
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function buildUrl(sourceUrl: string, year: number, specialtyId: string) {
  const url = new URL(sourceUrl);
  url.searchParams.set('y', String(year));
  url.searchParams.set('qf', '1');
  url.searchParams.set('eb', '40');
  url.searchParams.set('sp', specialtyId);
  url.searchParams.set('exp', 'json');
  return url;
}

function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function toNonNegativeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
