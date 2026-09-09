import type { DashboardRow } from '../types.js';
import { HttpError } from '../http.js';
import { fetchOpenData, type FetchData } from './open-data-http.js';
import { cachedSource } from './source-cache.js';

const cacheTtlMs = 12 * 60 * 60 * 1000;

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

export function createEurostatLoader(fetchData: FetchData = fetchOpenData) {
  return cachedSource(async (sourceUrl: string): Promise<DashboardRow[]> => {
    const url = new URL(sourceUrl);
    url.searchParams.set('lang', 'en');
    url.searchParams.set('geoLevel', 'country');
    url.searchParams.set('sinceTimePeriod', '2013');
    url.searchParams.set('isced11', 'ED5-8');
    url.searchParams.set('iscedf13', 'F06');
    url.searchParams.set('unit', 'NR');
    url.searchParams.set('freq', 'A');

    const response = await fetchData(url, { signal: AbortSignal.timeout(30_000) });

    if (!response.ok) {
      throw new HttpError(502, 'Eurostat тимчасово недоступний');
    }

    const rows = parseEurostatItStudents(await response.json().catch(() => null));

    if (!rows.length) {
      throw new HttpError(502, 'Eurostat не повернув повних коректних даних про ІТ-освіту');
    }

    return rows;
  }, cacheTtlMs);
}
export const loadEurostatItStudents = createEurostatLoader();

export function parseEurostatItStudents(payload: unknown): DashboardRow[] {
  if (!isEurostatData(payload)) {
    return [];
  }

  const { id: dimensions, size: sizes, dimension, value = {} } = payload;
  if (
    !dimensions.every((name, position) => {
      const index = dimension[name]?.category?.index;
      if (!index || typeof index !== 'object' || Array.isArray(index)) return false;
      const offsets = Object.values(index);
      return (
        offsets.length === sizes[position] &&
        new Set(offsets).size === offsets.length &&
        offsets.every(
          (offset) => Number.isInteger(offset) && offset >= 0 && offset < sizes[position],
        )
      );
    })
  )
    return [];
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
      if (!/^\d{4}$/.test(year) || Number(year) < 2000 || Number(year) > 2100) return [];
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
      // Missing/suppressed observations are not zero. Only compare complete, consistent rows.
      if (total === undefined || women === undefined || men === undefined || total < women + men) {
        return [];
      }
      const totalValue = total;
      const other = total - women - men;

      const countryName = typeof geo.label?.[country] === 'string' ? geo.label[country] : country;
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
    const name = dimensions[position];
    const coordinate = coordinates[name];
    if (coordinate === undefined && (name in coordinates || sizes[position] !== 1))
      return undefined;
    index = index * sizes[position] + (coordinate ?? 0);
  }

  const value = values[String(index)];
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
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
    (value as EurostatData).dimension !== null &&
    typeof (value as EurostatData).dimension === 'object' &&
    !Array.isArray((value as EurostatData).dimension) &&
    (value as EurostatData).value !== null &&
    typeof (value as EurostatData).value === 'object' &&
    (value as EurostatData).id!.length === (value as EurostatData).size!.length &&
    (value as EurostatData).id!.every((id) => typeof id === 'string') &&
    new Set((value as EurostatData).id).size === (value as EurostatData).id!.length &&
    (value as EurostatData).size!.every((size) => Number.isSafeInteger(size) && size > 0)
  );
}
