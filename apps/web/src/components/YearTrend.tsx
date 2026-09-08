import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { buildYearlyGenderTotals } from '../dashboard-trend';
import type { DashboardRow } from '../types';

ChartJS.register(BarElement, CategoryScale, Legend, LinearScale, Tooltip);

type Props = {
  rows: DashboardRow[];
};

const options: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        pointStyle: 'rectRounded',
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      grid: { display: false },
      title: { display: true, text: 'Рік' },
    },
    y: {
      stacked: true,
      beginAtZero: true,
      title: { display: true, text: 'Кількість здобувачів освіти' },
    },
  },
};

export function YearTrend({ rows }: Props) {
  const totals = useMemo(() => buildYearlyGenderTotals(rows), [rows]);

  if (!totals.length) {
    return null;
  }

  return (
    <section className="card">
      <div className="title">
        <div>
          <span>ДИНАМІКА</span>
          <h2>Зміна гендерного балансу за роками</h2>
        </div>
      </div>
      <div style={{ height: 320 }}>
        <Bar
          aria-label="Графік зміни гендерного балансу за роками"
          data={{
            labels: totals.map((total) => String(total.year)),
            datasets: [
              {
                label: 'Жінки',
                data: totals.map((total) => total.women),
                backgroundColor: '#7e70e7',
              },
              {
                label: 'Чоловіки',
                data: totals.map((total) => total.men),
                backgroundColor: '#4294dd',
              },
              {
                label: 'Інші',
                data: totals.map((total) => total.nonbinary),
                backgroundColor: '#52bda5',
              },
            ],
          }}
          options={options}
          role="img"
        />
      </div>
    </section>
  );
}
