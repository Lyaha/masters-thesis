export type DashboardRow = {
  year: number;
  region: string;
  institution: string;
  specialty: string;
  women: string;
  men: string;
  nonbinary: string;
  total: string;
};

export type ItEntrantRow = {
  year: number;
  region: string;
  institution: string;
  specialty: string;
  total: string;
};

export type DashboardData =
  | { kind: 'gender-statistics'; rows: DashboardRow[] }
  | { kind: 'it-entrants'; rows: ItEntrantRow[] };
