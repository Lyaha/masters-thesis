export type StatisticRecord = {
  institution: string;
  region: string;
  specialty: string;
  educationLevel: string;
  year: number;
  womenCount: number;
  menCount: number;
  nonbinaryCount: number;
};

const requiredColumns = [
  'institution',
  'region',
  'specialty',
  'educationLevel',
  'year',
  'womenCount',
  'menCount',
  'nonbinaryCount',
] as const;

const numericColumns = ['year', 'womenCount', 'menCount', 'nonbinaryCount'] as const;

export function parseStatisticsCsv(text: string): StatisticRecord[] {
  if (new TextEncoder().encode(text).byteLength > 10 * 1024 * 1024)
    throw new Error('CSV перевищує 10 МіБ');
  const [header, ...lines] = text.trim().split(/\r?\n/).filter(Boolean);

  if (!header) throw new Error('CSV порожній');

  const keys = splitCsvLine(header).map((value) => value.replace(/^\uFEFF/, '').trim());
  if (requiredColumns.some((column) => !keys.includes(column))) {
    throw new Error('CSV не містить усіх обов’язкових колонок');
  }

  if (lines.length > 20000) throw new Error('Максимум 20000 записів у наборі');
  const records = lines.map((line, index) => parseRow(splitCsvLine(line), keys, index + 2));
  const unique = new Set(
    records.map((row) =>
      JSON.stringify([row.institution, row.region, row.specialty, row.educationLevel, row.year]),
    ),
  );
  if (unique.size !== records.length) throw new Error('CSV містить повторні записи');
  return records;
}

function parseRow(values: string[], keys: string[], rowNumber: number): StatisticRecord {
  if (values.length !== keys.length) {
    throw new Error(`Некоректна кількість колонок у рядку ${rowNumber}`);
  }

  const row = Object.fromEntries(values.map((value, index) => [keys[index], value.trim()]));
  requiredColumns.forEach((column) => {
    if (!row[column]) throw new Error(`Порожнє поле ${column} у рядку ${rowNumber}`);
  });
  numericColumns.forEach((column) => {
    if (!/^\d+$/.test(row[column])) throw new Error(`Некоректне число в рядку ${rowNumber}`);
    const number = Number(row[column]);
    if (
      !Number.isSafeInteger(number) ||
      number > (column === 'year' ? 2100 : 2147483647) ||
      (column === 'year' && number < 2000)
    )
      throw new Error(`Число поза допустимим діапазоном у рядку ${rowNumber}`);
  });
  for (const field of ['institution', 'region', 'specialty', 'educationLevel']) {
    if (row[field].length < 2)
      throw new Error(`Поле ${field} має містити щонайменше 2 символи у рядку ${rowNumber}`);
  }

  return {
    institution: row.institution,
    region: row.region,
    specialty: row.specialty,
    educationLevel: row.educationLevel,
    year: Number(row.year),
    womenCount: Number(row.womenCount),
    menCount: Number(row.menCount),
    nonbinaryCount: Number(row.nonbinaryCount),
  };
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      inQuotes = !inQuotes;
    } else if (character === ',' && !inQuotes) {
      values.push(value);
      value = '';
    } else {
      value += character;
    }
  }

  if (inQuotes) throw new Error('Незакриті лапки у CSV');

  values.push(value);
  return values;
}
