// src/pages/data/ForecastComparePage.jsx
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { ArrowLeft, BarChart2, AlertCircle, Coins, Calendar, Target } from 'lucide-react';
import { useCompareSimulations } from '../../features/forecast/useForecast.js';
import { Button } from '../../components/ui/Button.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const SCENARIO_COLORS = ['#ef4444', '#10b981', '#2563eb', '#8b5cf6']; // Red, Green, Blue, Purple

export default function ForecastComparePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idsParam = searchParams.get('ids');

  const [compareData, setCompareData] = useState(null);
  const compareMutation = useCompareSimulations();

  const ids = idsParam ? idsParam.split(',').filter(Boolean) : [];

  useEffect(() => {
    if (ids.length >= 2) {
      compareMutation.mutate(ids, {
        onSuccess: (data) => setCompareData(data),
      });
    }
  }, [idsParam]);

  if (ids.length < 2) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-800">
        <AlertCircle className="mx-auto h-8 w-8 text-amber-600 mb-2" />
        <h3 className="text-base font-bold">{t('forecast.insufficientCompare', 'Select at least 2 scenarios')}</h3>
        <p className="mt-1 text-xs text-amber-700">
          {t('forecast.insufficientCompareDesc', 'Return to scenarios list and select 2 to 4 scenarios to view side-by-side comparison.')}
        </p>
        <Button onClick={() => navigate('/forecast')} className="mt-4 bg-indigo-600 text-white">
          {t('forecast.backToScenarios', 'Back to Scenarios')}
        </Button>
      </div>
    );
  }

  if (compareMutation.isPending && !compareData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const simulations = compareData?.simulations || [];
  const alignedSeries = compareData?.alignedSeries || [];
  const summaryTable = compareData?.summaryTable || [];

  // Multi-line chart datasets
  const chartLabels = alignedSeries.map((row) => `D${row.day}`);
  const datasets = simulations.map((sim, idx) => ({
    label: sim.name,
    data: alignedSeries.map((row) => row[`sim_${sim.id}_cum`] ?? 0),
    borderColor: SCENARIO_COLORS[idx % SCENARIO_COLORS.length],
    backgroundColor: SCENARIO_COLORS[idx % SCENARIO_COLORS.length],
    borderWidth: 2.5,
    pointRadius: 0,
    tension: 0.3,
  }));

  const chartData = { labels: chartLabels, datasets };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString()}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 20 } },
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: { font: { size: 10 }, callback: (v) => Number(v).toLocaleString() },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/forecast')}
            className="p-2"
            title={t('common.back', 'Back')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <BarChart2 className="h-6 w-6 text-purple-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                {t('forecast.compareScenariosTitle', 'Multi-Scenario Comparative Analysis')}
              </h1>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {t('forecast.compareSubtitle', 'Evaluating trajectory shape, inflection timing, and efficiency metrics')}
            </p>
          </div>
        </div>
      </div>

      {/* Multi-line Overlay Chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
        <h3 className="mb-4 text-sm font-bold text-gray-900">
          {t('forecast.alignedTrajectoryComparison', 'Aligned Cumulative Trajectories')}
        </h3>
        <div className="h-80 w-full">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Side-by-Side Comparison Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        <div className="border-b border-gray-200 bg-gray-50/70 p-4">
          <h3 className="text-sm font-bold text-gray-900">
            {t('forecast.metricsComparisonTable', 'Scenario Efficiency & Milestone Breakdown')}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
              <tr>
                <th className="p-3 font-semibold">{t('forecast.scenario', 'Scenario')}</th>
                <th className="p-3 font-semibold">{t('forecast.capacityK', 'Capacity (K)')}</th>
                <th className="p-3 font-semibold">{t('forecast.growthRateR', 'Rate (r)')}</th>
                <th className="p-3 font-semibold">{t('forecast.inflectionT0', 'Inflection (t0)')}</th>
                <th className="p-3 font-semibold">{t('forecast.durationDays', 'Duration')}</th>
                <th className="p-3 font-semibold">{t('forecast.budget', 'Budget')}</th>
                <th className="p-3 font-semibold">{t('forecast.finalReach', 'Final Reach')}</th>
                <th className="p-3 font-semibold">{t('forecast.daysToP50', 'Days to P50')}</th>
                <th className="p-3 font-semibold">{t('forecast.daysToP90', 'Days to P90')}</th>
                <th className="p-3 font-semibold">{t('forecast.costPerResult', 'Cost Per Result')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {summaryTable.map((item, idx) => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="p-3 font-bold text-gray-900 flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: SCENARIO_COLORS[idx % SCENARIO_COLORS.length] }}
                    />
                    <span className="truncate max-w-[160px]">{item.name}</span>
                  </td>
                  <td className="p-3">{Number(item.K).toLocaleString()}</td>
                  <td className="p-3 font-mono">{item.r}</td>
                  <td className="p-3">{item.t0}d</td>
                  <td className="p-3">{item.durationDays}d</td>
                  <td className="p-3 font-semibold">
                    {item.budget ? `${Number(item.budget).toLocaleString()} DZD` : '—'}
                  </td>
                  <td className="p-3 font-bold text-indigo-600">
                    {item.finalReach ? Number(item.finalReach).toLocaleString() : '—'}
                  </td>
                  <td className="p-3">{item.daysToP50 !== null ? `Day ${item.daysToP50}` : '—'}</td>
                  <td className="p-3">{item.daysToP90 !== null ? `Day ${item.daysToP90}` : '—'}</td>
                  <td className="p-3 font-bold text-emerald-600">
                    {item.costPerResult !== null ? `${Number(item.costPerResult).toLocaleString()} DZD` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

