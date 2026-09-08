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
import { useTranslation } from '../i18n';
import { useTheme } from '../theme';
import type { DashboardRow } from '../types';

ChartJS.register(BarElement, CategoryScale, Legend, LinearScale, Tooltip);

type Props = {
  rows: DashboardRow[];
};

export function YearTrend({ rows }: Props) {
  const totals = useMemo(() => buildYearlyGenderTotals(rows), [rows]);
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const options = useMemo(() => chartOptions(t, resolvedTheme), [resolvedTheme, t]);

  if (!totals.length) {
    return null;
  }

  return (
    <section className="card">
      <div className="title">
        <div>
          <span>{t('dynamics')}</span>
          <h2>{t('trendTitle')}</h2>
        </div>
      </div>
      <div style={{ height: 320 }}>
        <Bar
          aria-label={t('chartLabel')}
          data={{
            labels: totals.map((total) => String(total.year)),
            datasets: [
              {
                label: t('women'),
                data: totals.map((total) => total.women),
                backgroundColor: '#7e70e7',
              },
              {
                label: t('men'),
                data: totals.map((total) => total.men),
                backgroundColor: '#4294dd',
              },
              {
                label: t('other'),
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

function chartOptions(
  t: ReturnType<typeof useTranslation>['t'],
  resolvedTheme: ReturnType<typeof useTheme>['resolvedTheme'],
): ChartOptions<'bar'> {
  const color = resolvedTheme === 'dark' ? '#cbd6f7' : '#43516b';
  const gridColor = resolvedTheme === 'dark' ? '#ffffff1a' : '#dfe5f0';

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color, usePointStyle: true, pointStyle: 'rectRounded' },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { color },
        title: { display: true, text: t('chartYear'), color },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: { color: gridColor },
        ticks: { color },
        title: { display: true, text: t('chartCount'), color },
      },
    },
  };
}
