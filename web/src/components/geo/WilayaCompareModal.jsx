// src/components/geo/WilayaCompareModal.jsx
import { useTranslation } from 'react-i18next';
import { X, ArrowRight, Trash2 } from 'lucide-react';
import { useWilayaCompare, formatMetricValue, ALL_GEO_METRICS } from '../../features/geo/useGeoMetrics.js';

export function WilayaCompareModal({
  codes = [],
  metric = 'conversions',
  dateFrom,
  dateTo,
  dataMode = 'real',
  onClose,
  onRemoveCode,
}) {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError } = useWilayaCompare(codes, {
    metric,
    dateFrom,
    dateTo,
    dataMode,
  });

  if (!codes || codes.length < 2) return null;

  const items = data?.items || [];
  const metricMeta = ALL_GEO_METRICS.find((m) => m.value === metric) || { format: 'integer' };

  const getLocalizedName = (item) => {
    if (i18n.language === 'ar') return item.nameAr || item.nameFr;
    if (i18n.language === 'fr') return item.nameFr;
    return item.nameEn || item.nameFr;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {t('geo.compareWilayasTitle', 'Multi-Wilaya Comparison')}
            </h2>
            <p className="text-xs text-gray-500">
              {t('geo.comparingCount', 'Comparing {{count}} regions side-by-side', { count: codes.length })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex justify-center py-16 text-sm text-gray-500">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-red-600">
              {t('common.error', 'Failed to load comparison data')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                    <th className="p-3 text-start font-semibold">{t('geo.metric', 'Metric')}</th>
                    {items.map((it) => (
                      <th key={it.code} className="p-3 text-end font-semibold text-gray-900">
                        <div className="flex items-center justify-end gap-1.5">
                          <span>
                            {it.code} - {getLocalizedName(it)}
                          </span>
                          {onRemoveCode && (
                            <button
                              type="button"
                              onClick={() => onRemoveCode(it.code)}
                              className="text-gray-400 hover:text-red-500"
                              title={t('common.delete', 'Remove')}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="bg-blue-50/40 font-bold text-blue-900">
                    <td className="p-3">
                      {t('geo.primaryMetric', 'Primary')}: {t(metricMeta.labelKey, metric)}
                    </td>
                    {items.map((it) => (
                      <td key={it.code} className="p-3 text-end tabular-nums text-blue-700">
                        {formatMetricValue(it.value, metricMeta.format, i18n.language)}
                      </td>
                    ))}
                  </tr>

                  {/* Derived rates */}
                  <tr className="font-semibold text-gray-800">
                    <td className="p-3">{t('geo.metrics.conversionRate', 'Conversion Rate')}</td>
                    {items.map((it) => (
                      <td key={it.code} className="p-3 text-end tabular-nums">
                        {formatMetricValue(it.metrics?.conversion_rate, 'percentage', i18n.language)}
                      </td>
                    ))}
                  </tr>
                  <tr className="font-semibold text-gray-800">
                    <td className="p-3">{t('geo.metrics.costPerConversion', 'Cost / Conversion')}</td>
                    {items.map((it) => (
                      <td key={it.code} className="p-3 text-end tabular-nums">
                        {formatMetricValue(it.metrics?.cost_per_conversion, 'currency', i18n.language)}
                      </td>
                    ))}
                  </tr>
                  <tr className="font-semibold text-gray-800">
                    <td className="p-3">{t('geo.metrics.aov', 'AOV')}</td>
                    {items.map((it) => (
                      <td key={it.code} className="p-3 text-end tabular-nums">
                        {formatMetricValue(it.metrics?.aov, 'currency', i18n.language)}
                      </td>
                    ))}
                  </tr>

                  {/* Absolute metrics */}
                  {['conversions', 'orders', 'revenue', 'spend', 'impressions', 'reach', 'clicks'].map((mKey) => {
                    const mMeta = ALL_GEO_METRICS.find((m) => m.value === mKey);
                    return (
                      <tr key={mKey} className="text-gray-600">
                        <td className="p-3">{t(mMeta?.labelKey || mKey, mKey)}</td>
                        {items.map((it) => (
                          <td key={it.code} className="p-3 text-end tabular-nums">
                            {formatMetricValue(it.metrics?.[mKey], mMeta?.format, i18n.language)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end border-t border-gray-200 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200"
          >
            {t('common.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
}

