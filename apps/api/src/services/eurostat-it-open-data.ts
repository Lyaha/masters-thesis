import type { DashboardRow } from '../types.js';

const cacheTtlMs = 12 * 60 * 60 * 1000;

type Cache = {
  expiresAt: number;
  rows: DashboardRow[];
};

type EurostatData = {
  id?: string[];
  size?: number[];
  value?: Record<string, number>;
  dimension?: Record<string, EurostatDimension>;
};

type EurostatDimension = {
  category?: {
    index?: Record<string, number>;
    label?: Record<string, string>;
  };
};

let cache: Cache | null = null;

export async function loadEurostatItStudents(sourceUrl: string): Promise<DashboardRow[]> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.rows;
  }

  const url = new URL(sourceUrl);
  url.searchParams.set('lang', 'en');
  url.searchParams.set('geoLevel', 'country');
  url.searchParams.set('sinceTimePeriod', '2013');
  url.searchParams.set('isced11', 'ED5-8');
  url.searchParams.set('iscedf13', 'F06');

  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });

  if (!response.ok) {
    throw new Error(`Eurostat повернув статус ${response.status}`);
  }

  const rows = parseEurostatItStudents(await response.json());

  if (!rows.length) {
    throw new Error('Eurostat не повернув даних про ІТ-освіту');
  }

  cache = { rows, expiresAt: Date.now() + cacheTtlMs };
  return rows;
}

export function parseEurostatItStudents(payload: unknown): DashboardRow[] {
  if (!isEurostatData(payload)) {
    return [];
  }

  const { id: dimensions, size: sizes, dimension, value = {} } = payload;
  const geoPosition = dimensions.indexOf('geo');
  const sexPosition = dimensions.indexOf('sex');
  const timePosition = dimensions.indexOf('time');
  const geo = dimension.geo?.category;
  const sex = dimension.sex?.category;
  const time = dimension.time?.category;

  if (!geo || !sex || !time || geoPosition < 0 || sexPosition < 0 || timePosition < 0) {
    return [];
  }

  const countries = orderedCodes(geo.index);
  const years = orderedCodes(time.index);
  const sexIndex = sex.index ?? {};

  return countries.flatMap((country) =>
    years.flatMap((year) => {
      const total = valueAt(value, dimensions, sizes, {
        geo: geo.index?.[country],
        sex: sexIndex.T,
        time: time.index?.[year],
      });
      const women = valueAt(value, dimensions, sizes, {
        geo: geo.index?.[country],
        sex: sexIndex.F,
        time: time.index?.[year],
      });
      const men = valueAt(value, dimensions, sizes, {
        geo: geo.index?.[country],
        sex: sexIndex.M,
        time: time.index?.[year],
      });
      const totalValue = total ?? (women ?? 0) + (men ?? 0);
      const other = Math.max(totalValue - (women ?? 0) - (men ?? 0), 0);

      if (!Number.isFinite(totalValue) || (women === undefined && men === undefined)) {
        return [];
      }

      const countryName = geo.label?.[country] ?? country;
      return [
        {
          year: Number(year),
          region: countryName,
          institution: countryName,
          specialty: 'Information and communication technologies',
          women: String(women ?? 0),
          men: String(men ?? 0),
          nonbinary: String(other),
          total: String(totalValue),
        },
      ];
    }),
  );
}

function valueAt(
  values: Record<string, number>,
  dimensions: string[],
  sizes: number[],
  coordinates: Record<string, number | undefined>,
) {
  let index = 0;

  for (let position = 0; position < dimensions.length; position += 1) {
    const coordinate = coordinates[dimensions[position]] ?? 0;
    index = index * sizes[position] + coordinate;
  }

  return values[String(index)];
}

function orderedCodes(index: Record<string, number> | undefined) {
  return Object.entries(index ?? {})
    .sort(([, first], [, second]) => first - second)
    .map(([code]) => code);
}

function isEurostatData(
  value: unknown,
): value is Required<Pick<EurostatData, 'id' | 'size' | 'dimension'>> & EurostatData {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as EurostatData).id) &&
    Array.isArray((value as EurostatData).size) &&
    typeof (value as EurostatData).dimension === 'object'
  );
}
