import type { DashboardFilters } from '../dashboard-filters';

type Props = {
  options: {
    years: string[];
    regions: string[];
    institutions: string[];
    specialties: string[];
  };
  value: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
};

type SelectProps = {
  label: string;
  values: string[];
  value?: string;
  onChange: (value: string) => void;
};

function Select({ label, values, value, onChange }: SelectProps) {
  return (
    <label>
      {label}
      <select value={value || ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">Усі</option>
        {values.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
  );
}

export function DashboardFiltersPanel({ options, value, onChange }: Props) {
  const update = (field: keyof DashboardFilters) => (next: string) => {
    onChange({ ...value, [field]: next || undefined });
  };

  return <div className="dashboard-filter-panel">
    <Select label="Рік" values={options.years} value={value.year} onChange={update('year')} />
    <Select label="Регіон" values={options.regions} value={value.region} onChange={update('region')} />
    <Select label="Заклад освіти" values={options.institutions} value={value.institution} onChange={update('institution')} />
    <Select label="Спеціальність" values={options.specialties} value={value.specialty} onChange={update('specialty')} />
  </div>;
}
