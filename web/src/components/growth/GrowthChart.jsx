// src/components/growth/GrowthChart.jsx
import { useTranslation } from 'react-i18next';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export function GrowthChart({
  series = [],
  previousSeries = [],
  metric = 'orders',
  className = '',
}) {
  const { t, i18n } = useTranslation();

  // Unified labels
  const allPeriods = Array.from(
    new Set([...series.map((s) => s.period), ...previousSeries.map((s) => s.period)])
  ).sort();

  const currentMap = new Map(series.map((s) => [s.period, s[metric] || 0]));
  const prevMap = new Map(previousSeries.map((s) => [s.period, s[metric] || 0]));

  const chartData = {
    labels: allPeriods,
    datasets: [
      {
        label: t('growth.currentPeriod', 'Current Period'),
        data: allPeriods.map((p) => currentMap.get(p) ?? 0),
        backgroundColor: '#2563eb',
        borderRadius: 4,
      },
      {
        label: t('growth.previousPeriod', 'Previous Period'),
        data: allPeriods.map((p) => prevMap.get(p) ?? 0),
        backgroundColor: '#cbd5e1',
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { boxWidth: 12, font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const val = context.raw;
            if (metric === 'revenue') {
              return `${context.dataset.label}: ${Number(val).toLocaleString()} DZD`;
            }
            return `${context.dataset.label}: ${Number(val).toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
    },
  };

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-xs ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">
          {t('growth.periodComparison', 'Period vs Period Performance')}
        </h3>
        <span className="text-xs text-gray-400 capitalize">{metric}</span>
      </div>

      <div className="h-64 w-full">
        {allPeriods.length > 0 ? (
          <Bar data={chartData} options={chartOptions} />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">
            {t('common.noData', 'No data for selected period')}
          </div>
        )}
      </div>
    </div>
  );
}

