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
  const [header, ...lines] = text.trim().split(/\r?\n/).filter(Boolean);

  if (!header) throw new Error('CSV порожній');

  const keys = splitCsvLine(header).map((value) => value.replace(/^\uFEFF/, '').trim());
  if (requiredColumns.some((column) => !keys.includes(column))) {
    throw new Error('CSV не містить усіх обов’язкових колонок');
  }

  return lines.map((line, index) => parseRow(splitCsvLine(line), keys, index + 2));
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
  });

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
