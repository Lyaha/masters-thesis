import { filterOptions, type DashboardFilters } from '../dashboard-filters';
import { downloadDashboardCsv } from '../dashboard-export';
import { useTranslation } from '../i18n';
import { percentage as pct, type Totals } from '../metrics';
import type { Category, DashboardRow } from '../types';
import { DashboardFiltersPanel } from './DashboardFilters';
import { GenderOrb } from './GenderOrb';
import { YearTrend } from './YearTrend';

type Props = {
  categories: Category[];
  categoryId: string;
  setCategoryId: (id: string) => void;
  rows: DashboardRow[];
  filteredRows: DashboardRow[];
  filters: DashboardFilters;
  setFilters: (filters: DashboardFilters) => void;
  totals: Totals;
  total: number;
  openProfile: () => void;
};

export function Dashboard({
  categories,
  categoryId,
  setCategoryId,
  rows,
  filteredRows,
  filters,
  setFilters,
  totals,
  total,
  openProfile,
}: Props) {
  const { language, t } = useTranslation();

  return (
    <>
      <section className="hero">
        <div>
          <span>{t('monitoring')}</span>
          <h1>{t('heroTitle')}</h1>
          <p>{t('heroDescription')}</p>
          <button onClick={openProfile}>{t('addStatistics')}</button>
        </div>
        <GenderOrb totals={totals} />
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
        <p>{categories.find((category) => category.id === categoryId)?.description}</p>
      </section>

      <section className="filter dashboard-filter-section">
        <div>
          <h2>{t('dataFilters')}</h2>
          <p>{t('filtersDescription')}</p>
        </div>
        <DashboardFiltersPanel
          options={filterOptions(rows)}
          value={filters}
          onChange={setFilters}
        />
      </section>

      <section className="metrics">
        <Metric name={t('totalObservations')} value={total.toLocaleString(language)} />
        <Metric name={t('womenShare')} value={`${pct(totals.w, total)}%`} />
        <Metric name={t('menShare')} value={`${pct(totals.m, total)}%`} />
        <Metric name={t('genderIndex')} value={totals.m ? (totals.w / totals.m).toFixed(2) : '—'} />
      </section>

      <YearTrend rows={filteredRows} />

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
            <button className="outline" onClick={() => downloadDashboardCsv(filteredRows)}>
              {t('exportCsv')}
            </button>
          </div>
        </div>
        {filteredRows.length ? (
          <div className="bars">
            {filteredRows.map((row, index) => (
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
