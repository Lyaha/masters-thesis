import { downloadItEntrantsCsv } from '../it-entrants-export';
import { useTranslation } from '../i18n';
import type { ItEntrantRow } from '../types';

type Props = {
  rows: ItEntrantRow[];
};

export function ItEntrantsDashboard({ rows }: Props) {
  const { language, t } = useTranslation();
  const total = rows.reduce((sum, row) => sum + Number(row.total), 0);
  const yearlyTotals = groupTotals(rows, (row) => String(row.year)).sort(
    (first, second) => Number(first.label) - Number(second.label),
  );
  const institutionTotals = groupTotals(rows, (row) => row.institution).slice(0, 10);
  const highestYearlyTotal = Math.max(...yearlyTotals.map((item) => item.total), 1);
  const highestInstitutionTotal = Math.max(...institutionTotals.map((item) => item.total), 1);

  return (
    <>
      <section className="data-notice" role="status">
        <b>{t('genderDataUnavailableTitle')}</b>
        <span>{t('genderDataUnavailable')}</span>
      </section>

      <section className="metrics">
        <Metric name={t('itEntrantsTotal')} value={total.toLocaleString(language)} />
        <Metric
          name={t('institutionsCount')}
          value={new Set(rows.map((row) => row.institution)).size.toLocaleString(language)}
        />
        <Metric
          name={t('regionsCount')}
          value={new Set(rows.map((row) => row.region)).size.toLocaleString(language)}
        />
        <Metric
          name={t('yearsCovered')}
          value={new Set(rows.map((row) => row.year)).size.toLocaleString(language)}
        />
      </section>

      <section className="card">
        <div className="title">
          <div>
            <span>{t('dynamics')}</span>
            <h2>{t('itEntrantsTrend')}</h2>
          </div>
        </div>
        <div className="trend-list">
          {yearlyTotals.map((item) => (
            <TotalBar key={item.label} item={item} maximum={highestYearlyTotal} />
          ))}
        </div>
      </section>

      <section className="card">
        <div className="title">
          <div>
            <span>{t('distribution')}</span>
            <h2>{t('itEntrantsByInstitution')}</h2>
          </div>
          <button className="outline" onClick={() => downloadItEntrantsCsv(rows)}>
            {t('exportCsv')}
          </button>
        </div>
        {institutionTotals.length ? (
          <div className="trend-list">
            {institutionTotals.map((item) => (
              <TotalBar key={item.label} item={item} maximum={highestInstitutionTotal} />
            ))}
          </div>
        ) : (
          <p className="empty">{t('emptyData')}</p>
        )}
      </section>
    </>
  );
}

function Metric({ name, value }: { name: string; value: string }) {
  return (
    <article className="metric">
      <span>{name}</span>
      <b>{value}</b>
    </article>
  );
}

function TotalBar({ item, maximum }: { item: GroupedTotal; maximum: number }) {
  return (
    <div className="total-bar">
      <b>{item.label}</b>
      <div aria-label={`${item.label}: ${item.total}`}>
        <i style={{ width: `${(item.total / maximum) * 100}%` }} />
      </div>
      <em>{item.total.toLocaleString()}</em>
    </div>
  );
}

type GroupedTotal = { label: string; total: number };

function groupTotals(rows: ItEntrantRow[], key: (row: ItEntrantRow) => string): GroupedTotal[] {
  const totals = new Map<string, number>();

  for (const row of rows) {
    const label = key(row);
    totals.set(label, (totals.get(label) ?? 0) + Number(row.total));
  }

  return [...totals.entries()]
    .map(([label, total]) => ({ label, total }))
    .sort(
      (first, second) =>
        second.total - first.total || first.label.localeCompare(second.label, 'uk'),
    );
}
