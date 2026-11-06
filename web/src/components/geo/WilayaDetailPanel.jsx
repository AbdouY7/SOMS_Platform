// src/components/geo/WilayaDetailPanel.jsx
import { useTranslation } from 'react-i18next';
import { X, TrendingUp, AlertCircle, BarChart3, HelpCircle } from 'lucide-react';
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
import { useWilayaDetail, formatMetricValue, ALL_GEO_METRICS } from '../../features/geo/useGeoMetrics.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export function WilayaDetailPanel({
  wilayaCode,
  metric = 'conversions',
  dateFrom,
  dateTo,
  dataMode = 'real',
  onClose,
  onAddToCompare,
}) {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError } = useWilayaDetail(wilayaCode, {
    metric,
    dateFrom,
    dateTo,
    dataMode,
  });

  if (!wilayaCode) return null;

  const wilaya = data?.wilaya;
  const metrics = data?.metrics || {};
  const trend = data?.trend || [];

  const displayName =
    i18n.language === 'ar'
      ? (wilaya?.nameAr || wilaya?.nameFr)
      : i18n.language === 'fr'
      ? wilaya?.nameFr
      : (wilaya?.nameEn || wilaya?.nameFr);

  // Prepare trend chart data
  const chartData = {
    labels: trend.map((t) => t.period),
    datasets: [
      {
        label: t(`geo.metrics.${metric}`, metric),
        data: trend.map((t) => t.value),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.3,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const mMeta = ALL_GEO_METRICS.find((m) => m.value === metric);
            return `${context.dataset.label}: ${formatMetricValue(context.raw, mMeta?.format, i18n.language)}`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { font: { size: 10 } } },
    },
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
      {/* Panel Header */}
      <div className="flex items-start justify-between border-b border-gray-100 pb-3">
        <div>
          <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
            {t('geo.wilaya', 'Wilaya')} {wilayaCode}
          </span>
          <h2 className="mt-1 text-lg font-bold text-gray-900">
            {displayName || `Wilaya ${wilayaCode}`}
          </h2>
          {wilaya?.nameAr && i18n.language !== 'ar' && (
            <p className="text-xs text-gray-500 font-arabic">{wilaya.nameAr}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-hidden"
          title={t('common.close', 'Close')}
        >
          <X size={18} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-12 text-sm text-gray-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="ms-2">{t('common.loading', 'Loading details...')}</span>
        </div>
      ) : isError ? (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="mb-2 text-red-500" size={28} />
          <p className="text-sm font-medium text-gray-800">{t('common.error', 'Failed to load details')}</p>
        </div>
      ) : (
        <div className="mt-4 flex-1 space-y-6 overflow-y-auto pe-1">
          {/* Trend Chart */}
          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-700">
              <span className="flex items-center gap-1">
                <TrendingUp size={14} className="text-blue-600" />
                {t('geo.trendHistory', 'Trend Series')}
              </span>
              <span className="text-gray-400 font-normal">
                {t(`geo.metrics.${metric}`, metric)}
              </span>
            </div>
            <div className="h-36 w-full rounded-lg bg-gray-50/70 p-2 border border-gray-100">
              {trend.length > 0 ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-gray-400">
                  {t('geo.noTrendData', 'No historical periods')}
                </div>
              )}
            </div>
          </div>

          {/* Derived Metrics */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t('geo.derivedRates', 'Calculated Rates')}
            </h3>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-2.5">
                <div className="text-[11px] font-medium text-blue-900">
                  {t('geo.metrics.conversionRate', 'Conversion Rate')}
                </div>
                <div className="mt-1 text-base font-bold text-blue-700">
                  {formatMetricValue(metrics.conversion_rate, 'percentage', i18n.language)}
                </div>
                <div className="text-[10px] text-gray-400">conversions / clicks</div>
              </div>

              <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-2.5">
                <div className="text-[11px] font-medium text-emerald-900">
                  {t('geo.metrics.costPerConversion', 'Cost / Conversion')}
                </div>
                <div className="mt-1 text-base font-bold text-emerald-700">
                  {formatMetricValue(metrics.cost_per_conversion, 'currency', i18n.language)}
                </div>
                <div className="text-[10px] text-gray-400">spend / conversions</div>
              </div>

              <div className="rounded-lg border border-purple-100 bg-purple-50/50 p-2.5">
                <div className="text-[11px] font-medium text-purple-900">
                  {t('geo.metrics.aov', 'Average Order (AOV)')}
                </div>
                <div className="mt-1 text-base font-bold text-purple-700">
                  {formatMetricValue(metrics.aov, 'currency', i18n.language)}
                </div>
                <div className="text-[10px] text-gray-400">revenue / orders</div>
              </div>
            </div>
          </div>

          {/* Raw Metrics Breakdown */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t('geo.allMetrics', 'Absolute Metrics')}
            </h3>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              <div className="flex justify-between px-3 py-2 text-xs">
                <span className="text-gray-600">{t('geo.metrics.conversions', 'Conversions')}</span>
                <span className="font-semibold text-gray-900">
                  {formatMetricValue(metrics.conversions, 'integer', i18n.language)}
                </span>
              </div>
              <div className="flex justify-between px-3 py-2 text-xs">
                <span className="text-gray-600">{t('geo.metrics.orders', 'Orders')}</span>
                <span className="font-semibold text-gray-900">
                  {formatMetricValue(metrics.orders, 'integer', i18n.language)}
                </span>
              </div>
              <div className="flex justify-between px-3 py-2 text-xs">
                <span className="text-gray-600">{t('geo.metrics.revenue', 'Revenue')}</span>
                <span className="font-semibold text-gray-900">
                  {formatMetricValue(metrics.revenue, 'currency', i18n.language)}
                </span>
              </div>
              <div className="flex justify-between px-3 py-2 text-xs">
                <span className="text-gray-600">{t('geo.metrics.spend', 'Spend')}</span>
                <span className="font-semibold text-gray-900">
                  {formatMetricValue(metrics.spend, 'currency', i18n.language)}
                </span>
              </div>
              <div className="flex justify-between px-3 py-2 text-xs">
                <span className="text-gray-600">{t('geo.metrics.impressions', 'Impressions')}</span>
                <span className="font-semibold text-gray-900">
                  {formatMetricValue(metrics.impressions, 'integer', i18n.language)}
                </span>
              </div>
              <div className="flex justify-between px-3 py-2 text-xs">
                <span className="text-gray-600">{t('geo.metrics.reach', 'Reach')}</span>
                <span className="font-semibold text-gray-900">
                  {formatMetricValue(metrics.reach, 'integer', i18n.language)}
                </span>
              </div>
              <div className="flex justify-between px-3 py-2 text-xs">
                <span className="text-gray-600">{t('geo.metrics.clicks', 'Clicks')}</span>
                <span className="font-semibold text-gray-900">
                  {formatMetricValue(metrics.clicks, 'integer', i18n.language)}
                </span>
              </div>
            </div>
          </div>

          {/* Action button */}
          {onAddToCompare && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onAddToCompare(wilayaCode)}
                className="w-full rounded-lg border border-blue-600 px-3 py-2 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50"
              >
                {t('geo.addToCompare', 'Add to Multi-Wilaya Compare')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

