// src/components/forecast/SCurveChart.jsx
import { useTranslation } from 'react-i18next';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

export function SCurveChart({
  series = [],
  milestones = {},
  color = '#2563eb', // Default blue
  showDaily = true,
  showBands = true,
  className = '',
}) {
  const { t } = useTranslation();

  if (!series || series.length === 0) {
    return (
      <div className={`flex h-80 w-full items-center justify-center rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-400 ${className}`}>
        {t('forecast.noData', 'No simulation data generated yet')}
      </div>
    );
  }

  const labels = series.map((s) => s.date ? s.date.slice(5) : `D${s.day}`);

  const datasets = [];

  // Stochastic upper bound (if bands enabled and available)
  if (showBands && series[0]?.stochasticMax !== undefined) {
    datasets.push({
      label: t('forecast.stochasticBand', 'Stochastic Range (P10 - P90)'),
      data: series.map((s) => s.stochasticMax),
      borderColor: 'transparent',
      backgroundColor: 'rgba(99, 102, 241, 0.12)',
      fill: '+1', // fill down to stochasticMin dataset
      pointRadius: 0,
      tension: 0.3,
      yAxisID: 'y',
    });

    datasets.push({
      label: 'Stochastic Min Bound',
      data: series.map((s) => s.stochasticMin),
      borderColor: 'transparent',
      backgroundColor: 'transparent',
      pointRadius: 0,
      tension: 0.3,
      yAxisID: 'y',
    });
  }

  // Cumulative Adoption S-Curve
  datasets.push({
    label: t('forecast.cumulativeAdoption', 'Cumulative Adoption'),
    data: series.map((s) => s.cumulative),
    borderColor: color,
    backgroundColor: color,
    borderWidth: 2.5,
    pointRadius: (ctx) => {
      const idx = ctx.dataIndex;
      const day = series[idx]?.day;
      // Emphasize milestone points
      if (
        day === milestones.p10?.day ||
        day === milestones.p50?.day ||
        day === milestones.p90?.day
      ) {
        return 5;
      }
      return 0;
    },
    pointHoverRadius: 6,
    tension: 0.3,
    yAxisID: 'y',
  });

  // Daily Incremental Conversions
  if (showDaily) {
    datasets.push({
      label: t('forecast.dailyIncrement', 'Daily Incremental'),
      data: series.map((s) => s.daily),
      borderColor: '#10b981',
      backgroundColor: '#10b981',
      borderWidth: 1.5,
      borderDash: [4, 4],
      pointRadius: 0,
      tension: 0.3,
      yAxisID: 'y1',
    });
  }

  const chartData = { labels, datasets };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          font: { size: 11 },
          filter: (item) => item.text !== 'Stochastic Min Bound',
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            if (context.dataset.label === 'Stochastic Min Bound') return null;
            const val = context.raw;
            return `${context.dataset.label}: ${Number(val).toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, maxTicksLimit: 15 },
      },
      y: {
        type: 'linear',
        position: 'left',
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: {
          font: { size: 10 },
          callback: (v) => Number(v).toLocaleString(),
        },
        title: {
          display: true,
          text: t('forecast.cumulativeTotal', 'Cumulative Total'),
          font: { size: 11 },
        },
      },
      y1: {
        type: 'linear',
        position: 'right',
        display: showDaily,
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        ticks: {
          font: { size: 10 },
          callback: (v) => Number(v).toLocaleString(),
        },
        title: {
          display: true,
          text: t('forecast.dailyNew', 'Daily Additions'),
          font: { size: 11 },
        },
      },
    },
  };

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-xs ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">
            {t('forecast.scurveTitle', 'S-Curve Adoption Trajectory')}
          </h3>
          <p className="text-xs text-gray-500">
            {t('forecast.scurveSubtitle', 'Stochastic diffusion model based on market parameters')}
          </p>
        </div>
      </div>
      <div className="h-72 w-full">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}

