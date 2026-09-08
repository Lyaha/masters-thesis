export type StatisticRecord = {
  institution: string; region: string; specialty: string; educationLevel: string;
  year: number; womenCount: number; menCount: number; nonbinaryCount: number;
};

const required = ['institution','region','specialty','educationLevel','year','womenCount','menCount','nonbinaryCount'];
export function parseStatisticsCsv(text: string): StatisticRecord[] {
  const [header, ...lines] = text.trim().split(/\r?\n/).filter(Boolean);
  if (!header) throw new Error('CSV порожній');
  const keys = header.split(',').map(x => x.trim());
  if (required.some(x => !keys.includes(x))) throw new Error('CSV не містить усіх обов’язкових колонок');
  return lines.map((line, index) => {
    const row = Object.fromEntries(line.split(',').map((value, i) => [keys[i], value.trim()]));
    const numeric = ['year','womenCount','menCount','nonbinaryCount'] as const;
    for (const key of numeric) if (!/^\d+$/.test(row[key] || '')) throw new Error(`Некоректне число в рядку ${index + 2}`);
    return { institution:row.institution, region:row.region, specialty:row.specialty, educationLevel:row.educationLevel,
      year:Number(row.year), womenCount:Number(row.womenCount), menCount:Number(row.menCount), nonbinaryCount:Number(row.nonbinaryCount) };
  });
}
