import { filterOptions, type DashboardFilters } from '../dashboard-filters';
import { downloadDashboardCsv } from '../dashboard-export';
import { percentage as pct, type Totals } from '../metrics';
import type { Category, DashboardRow } from '../types';
import { DashboardFiltersPanel } from './DashboardFilters';

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
  return <>
    <section className="hero">
      <div>
        <span>МОНІТОРИНГ ТА ВІЗУАЛІЗАЦІЯ</span>
        <h1>Ґендерний баланс<br />в ІТ-освіті</h1>
        <p>Агрегована статистика для аналізу доступності та інклюзивності освіти.</p>
        <button onClick={openProfile}>Додати власну статистику</button>
      </div>
      <div className="orb">
        <b>{pct(totals.w, total)}%</b>
        <small>частка жінок</small>
      </div>
    </section>

    <section className="filter">
      <label>
        Джерело статистики
        <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>
      <p>{categories.find((category) => category.id === categoryId)?.description}</p>
    </section>

    <section className="filter dashboard-filter-section">
      <div>
        <h2>Фільтри даних</h2>
        <p>Оберіть параметри, щоб оновити показники та розподіл за закладами.</p>
      </div>
      <DashboardFiltersPanel options={filterOptions(rows)} value={filters} onChange={setFilters} />
    </section>

    <section className="metrics">
      <Metric name="Усього спостережень" value={total.toLocaleString('uk-UA')} />
      <Metric name="Частка жінок" value={`${pct(totals.w, total)}%`} />
      <Metric name="Частка чоловіків" value={`${pct(totals.m, total)}%`} />
      <Metric name="Гендерний індекс" value={totals.m ? (totals.w / totals.m).toFixed(2) : '—'} />
    </section>

    <section className="card">
      <div className="title">
        <div>
          <span>ДИНАМІКА</span>
          <h2>Розподіл за закладами</h2>
        </div>
        <div className="legend">
          <i className="women" />Жінки<i className="men" />Чоловіки<i className="other" />Інші
          <button className="outline" onClick={() => downloadDashboardCsv(filteredRows)}>
            Експорт CSV
          </button>
        </div>
      </div>
      {filteredRows.length
        ? <div className="bars">{filteredRows.map((row, index) => <DistributionBar key={index} row={row} />)}</div>
        : <p className="empty">За обраними фільтрами даних немає.</p>}
    </section>
  </>;
}

function Metric({ name, value }: { name: string; value: string }) {
  return <article className="metric">
    <span>{name}</span>
    <b>{value}</b>
  </article>;
}

function DistributionBar({ row }: { row: DashboardRow }) {
  const total = Number(row.total);

  return <div className="bar">
    <div>
      <b>{row.institution}</b>
      <small>{row.year} · {row.region}</small>
    </div>
    <aside>
      <i className="women" style={{ width: `${pct(Number(row.women), total)}%` }} />
      <i className="men" style={{ width: `${pct(Number(row.men), total)}%` }} />
      <i className="other" style={{ width: `${pct(Number(row.nonbinary), total)}%` }} />
    </aside>
    <em>{total}</em>
  </div>;
}
