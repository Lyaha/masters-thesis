export type UserRole = 'user' | 'admin';
export type Session = { token: string; role: UserRole } | null;
export type Category = { id: string; name: string; description: string; visible?: boolean };
export type DashboardRow = { year: number; region: string; institution: string; women: string; men: string; nonbinary: string; total: string };
export type Source = { id: string; name: string; category_name: string; base_url: string | null; import_type: string; enabled: boolean };
export type Dataset = { id: string; title: string; period_label: string; category_name: string; records_count: number };
