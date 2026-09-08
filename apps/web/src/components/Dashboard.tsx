import { useMemo } from 'react';
import { filterOptions, filterRows, type DashboardFilters } from '../dashboard-filters';
import { downloadDashboardCsv } from '../dashboard-export';
import { useTranslation } from '../i18n';
import { percentage as pct, type Totals } from '../metrics';
import type { Category, DashboardData, DashboardRow } from '../types';
import { DashboardFiltersPanel } from './DashboardFilters';
import { GenderOrb } from './GenderOrb';
import { ItEntrantsDashboard } from './ItEntrantsDashboard';
import { YearTrend } from './YearTrend';

type Props = {
  categories: Category[];
  categoryId: string;
  setCategoryId: (id: string) => void;
  data: DashboardData;
  filters: DashboardFilters;
  setFilters: (filters: DashboardFilters) => void;
  openProfile: () => void;
};

export function Dashboard({
  categories,
  categoryId,
  setCategoryId,
  data,
  filters,
  setFilters,
  openProfile,
}: Props) {
  const { language, t } = useTranslation();
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const filteredGenderRows = useMemo(
    () => (data.kind === 'gender-statistics' ? filterRows(data.rows, filters) : []),
    [data, filters],
  );
  const filteredItEntrantRows = useMemo(
    () => (data.kind === 'it-entrants' ? filterRows(data.rows, filters) : []),
    [data, filters],
  );
  const options =
    data.kind === 'gender-statistics' ? filterOptions(data.rows) : filterOptions(data.rows);

  return (
    <>
      <section className="hero">
        <div>
          <span>{t('monitoring')}</span>
          <h1>{data.kind === 'it-entrants' ? t('itOpenDataTitle') : t('heroTitle')}</h1>
          <p>{data.kind === 'it-entrants' ? t('itOpenDataDescription') : t('heroDescription')}</p>
          <button onClick={openProfile}>{t('addStatistics')}</button>
        </div>
        {data.kind === 'gender-statistics' ? (
          <GenderOrb totals={calculateTotal(data.rows)} />
        ) : (
          <ItDataMark />
        )}
      </section>

      <section className="filter source-filter">
        <label className="source-selector">
          <span>{t('statisticsSource')}</span>
          <span className="select-control">
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </span>
        </label>
        <p>{selectedCategory?.description}</p>
      </section>

      <section className="filter dashboard-filter-section">
        <div>
          <h2>{t('dataFilters')}</h2>
          <p>{t('filtersDescription')}</p>
        </div>
        <DashboardFiltersPanel options={options} value={filters} onChange={setFilters} />
      </section>

      {data.kind === 'it-entrants' ? (
        <ItEntrantsDashboard rows={filteredItEntrantRows} />
      ) : (
        <GenderDashboard rows={filteredGenderRows} language={language} />
      )}
    </>
  );
}

function GenderDashboard({ rows, language }: { rows: DashboardRow[]; language: string }) {
  const { t } = useTranslation();
  const totals = calculateTotal(rows);
  const total = totals.w + totals.m + totals.n;

  return (
    <>
      <section className="metrics">
        <Metric name={t('totalObservations')} value={total.toLocaleString(language)} />
        <Metric name={t('womenShare')} value={`${pct(totals.w, total)}%`} />
        <Metric name={t('menShare')} value={`${pct(totals.m, total)}%`} />
        <Metric name={t('genderIndex')} value={totals.m ? (totals.w / totals.m).toFixed(2) : '—'} />
      </section>

      <YearTrend rows={rows} />

      <section className="card">
        <div className="title">
          <div>
            <span>{t('distribution')}</span>
            <h2>{t('distributionTitle')}</h2>
          </div>
          <div className="legend">
            <i className="women" />
            {t('women')}
            <i className="men" />
            {t('men')}
            <i className="other" />
            {t('other')}
            <button className="outline" onClick={() => downloadDashboardCsv(rows)}>
              {t('exportCsv')}
            </button>
          </div>
        </div>
        {rows.length ? (
          <div className="bars">
            {rows.map((row, index) => (
              <DistributionBar key={index} row={row} />
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

function ItDataMark() {
  const { t } = useTranslation();

  return (
    <div className="it-data-mark" aria-label={t('itDataMarkLabel')}>
      <b>IT</b>
      <small>{t('itSpecialties')}</small>
      <span>ЄДЕБО</span>
    </div>
  );
}

function calculateTotal(rows: DashboardRow[]): Totals {
  return rows.reduce(
    (totals, row) => ({
      w: totals.w + Number(row.women),
      m: totals.m + Number(row.men),
      n: totals.n + Number(row.nonbinary),
    }),
    { w: 0, m: 0, n: 0 },
  );
}

function DistributionBar({ row }: { row: DashboardRow }) {
  const total = Number(row.total);

  return (
    <div className="bar">
      <div>
        <b>{row.institution}</b>
        <small>
          {row.year} · {row.region}
        </small>
      </div>
      <aside>
        <i className="women" style={{ width: `${pct(Number(row.women), total)}%` }} />
        <i className="men" style={{ width: `${pct(Number(row.men), total)}%` }} />
        <i className="other" style={{ width: `${pct(Number(row.nonbinary), total)}%` }} />
      </aside>
      <em>{total}</em>
    </div>
  );
}
