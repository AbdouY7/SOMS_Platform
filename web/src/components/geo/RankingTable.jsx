// src/components/geo/RankingTable.jsx
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, ChevronDown, ChevronUp, AlertCircle, Eye } from 'lucide-react';
import { formatMetricValue, ALL_GEO_METRICS } from '../../features/geo/useGeoMetrics.js';

export function RankingTable({
  wilayas = [],
  missing = [],
  metric = 'conversions',
  selectedWilayaCode = null,
  onSelectWilaya,
  onAddToCompare,
  compareList = [],
}) {
  const { t, i18n } = useTranslation();
  const [sortField, setSortField] = useState('rank'); // 'rank' or 'value'
  const [sortAsc, setSortAsc] = useState(true);
  const [showMissing, setShowMissing] = useState(false);

  const metricMeta = useMemo(
    () => ALL_GEO_METRICS.find((m) => m.value === metric) || { format: 'integer' },
    [metric]
  );

  const sortedWilayas = useMemo(() => {
    return [...wilayas].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      return sortAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [wilayas, sortField, sortAsc]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'rank');
    }
  };

  const getLocalizedName = (item) => {
    if (i18n.language === 'ar') return item.nameAr || item.nameFr;
    if (i18n.language === 'fr') return item.nameFr;
    return item.nameEn || item.nameFr;
  };

  return (
    <div className="space-y-4">
      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/70 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-800">
            {t('geo.wilayaRankings', 'Regional Rankings')} ({wilayas.length})
          </h3>
          <span className="text-xs text-gray-500">
            {t('geo.sortedBy', 'Sorted by')}: {t(metricMeta.labelKey, metric)}
          </span>
        </div>

        <div className="max-h-[460px] overflow-y-auto">
          <table className="w-full text-start text-xs">
            <thead className="sticky top-0 border-b border-gray-200 bg-gray-50 font-medium text-gray-600">
              <tr>
                <th
                  className="cursor-pointer px-3 py-2.5 text-start hover:text-gray-900"
                  onClick={() => handleSort('rank')}
                >
                  <div className="flex items-center gap-1">
                    <span>{t('geo.rank', 'Rank')}</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-start">{t('geo.wilaya', 'Wilaya')}</th>
                <th
                  className="cursor-pointer px-3 py-2.5 text-end hover:text-gray-900"
                  onClick={() => handleSort('value')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{t(metricMeta.labelKey, metric)}</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-end">{t('geo.share', 'Share %')}</th>
                <th className="px-3 py-2.5 text-center">{t('common.view', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {sortedWilayas.map((item) => {
                const isSelected = selectedWilayaCode === item.code;
                const isCompared = compareList.includes(item.code);

                return (
                  <tr
                    key={item.code}
                    onClick={() => onSelectWilaya(item.code)}
                    className={`cursor-pointer transition-colors hover:bg-blue-50/50 ${
                      isSelected ? 'bg-blue-50/80 font-medium' : ''
                    }`}
                  >
                    <td className="px-3 py-2 tabular-nums">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-700">
                        {item.rank ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono text-gray-400">{item.code}</span>
                        <span className="font-medium text-gray-900">{getLocalizedName(item)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-end font-semibold tabular-nums text-gray-900">
                      {formatMetricValue(item.value, metricMeta.format, i18n.language)}
                    </td>
                    <td className="px-3 py-2 text-end tabular-nums text-gray-500">
                      {item.percentage !== null && item.percentage !== undefined
                        ? `${item.percentage.toFixed(1)}%`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectWilaya(item.code)}
                          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                          title={t('common.view', 'View details')}
                        >
                          <Eye size={14} />
                        </button>
                        {onAddToCompare && (
                          <button
                            type="button"
                            onClick={() => onAddToCompare(item.code)}
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                              isCompared
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title={t('geo.compare', 'Compare')}
                          >
                            {isCompared ? t('geo.compared', 'Added') : '+'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Missing Data Section */}
      {missing.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-xs">
          <button
            type="button"
            onClick={() => setShowMissing(!showMissing)}
            className="flex w-full items-center justify-between text-xs font-semibold text-gray-700 hover:text-gray-900"
          >
            <div className="flex items-center gap-1.5">
              <AlertCircle size={14} className="text-amber-500" />
              <span>
                {t('geo.missingWilayas', 'Wilayas Without Data')} ({missing.length} / 58)
              </span>
            </div>
            {showMissing ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showMissing && (
            <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-gray-100 pt-3 sm:grid-cols-3 md:grid-cols-4">
              {missing.map((w) => (
                <div
                  key={w.code}
                  className="flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1 text-[11px] text-gray-600"
                >
                  <span className="font-mono text-gray-400">{w.code}</span>
                  <span className="truncate">{getLocalizedName(w)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

