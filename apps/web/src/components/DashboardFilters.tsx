import type { DashboardFilters } from '../dashboard-filters';
import { useTranslation } from '../i18n';

type Props = {
  options: {
    years: string[];
    regions: string[];
    institutions: string[];
    specialties: string[];
  };
  value: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
  regionLabel?: string;
  showInstitution?: boolean;
  showRegion?: boolean;
  yearLabel?: string;
};

type SelectProps = {
  label: string;
  values: string[];
  value?: string;
  onChange: (value: string) => void;
};

function Select({ label, values, value, onChange }: SelectProps) {
  const { t } = useTranslation();

  return (
    <label>
      {label}
      <select value={value || ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">{t('all')}</option>
        {values.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DashboardFiltersPanel({
  options,
  value,
  onChange,
  regionLabel,
  showInstitution = true,
  showRegion = true,
  yearLabel,
}: Props) {
  const { t } = useTranslation();
  const update = (field: keyof DashboardFilters) => (next: string) => {
    onChange({ ...value, [field]: next || undefined });
  };

  return (
    <div className="dashboard-filter-panel">
      <Select
        label={yearLabel ?? t('year')}
        values={options.years}
        value={value.year}
        onChange={update('year')}
      />
      {showRegion && (
        <Select
          label={regionLabel ?? t('region')}
          values={options.regions}
          value={value.region}
          onChange={update('region')}
        />
      )}
      {showInstitution && (
        <Select
          label={t('institution')}
          values={options.institutions}
          value={value.institution}
          onChange={update('institution')}
        />
      )}
      <Select
        label={t('specialty')}
        values={options.specialties}
        value={value.specialty}
        onChange={update('specialty')}
      />
    </div>
  );
}
