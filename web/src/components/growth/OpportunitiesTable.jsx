// src/components/growth/OpportunitiesTable.jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Sparkles, AlertCircle, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export function OpportunitiesTable({ results = [], onSelectWilaya }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRow = (code) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const getLocalizedName = (item) => {
    if (i18n.language === 'ar') return item.nameAr || item.nameFr;
    if (i18n.language === 'fr') return item.nameFr;
    return item.nameEn || item.nameFr;
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
      <div className="border-b border-gray-200 bg-gray-50/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="text-purple-600" size={16} />
          <h3 className="text-sm font-bold text-gray-900">
            {t('growth.wilayaOpportunities', 'Wilaya Expansion Opportunities')} ({results.length})
          </h3>
        </div>
        <p className="mt-0.5 text-xs text-gray-500">
          {t('growth.opportunitiesSubtitle', 'Ranked by multi-indicator potential score based on your uploaded data.')}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-start text-xs">
          <thead className="border-b border-gray-200 bg-gray-50/50 font-semibold text-gray-600">
            <tr>
              <th className="px-4 py-3 text-start w-16">{t('geo.rank', 'Rank')}</th>
              <th className="px-4 py-3 text-start">{t('geo.wilaya', 'Wilaya')}</th>
              <th className="px-4 py-3 text-center">{t('growth.score', 'Opportunity Score')}</th>
              <th className="px-4 py-3 text-center">{t('common.status', 'Status')}</th>
              <th className="px-4 py-3 text-start">{t('growth.keyFactors', 'Key Drivers')}</th>
              <th className="px-4 py-3 text-end">{t('common.actions', 'Details')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {results.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-xs text-gray-400">
                  {t('growth.noOpportunitiesYet', 'No regional opportunities computed. Upload regional metrics and sales records to calculate scores.')}
                </td>
              </tr>
            ) : (
              results.map((row) => {
                const isExpanded = expandedRows.has(row.wilayaCode);
                const hasScore = row.score !== null && row.score !== undefined;

                return (
                  <tr key={row.wilayaCode} className="group">
                    <td colSpan={6} className="p-0">
                      <div
                        onClick={() => toggleRow(row.wilayaCode)}
                        className={`flex cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-purple-50/40 ${
                          isExpanded ? 'bg-purple-50/30' : ''
                        }`}
                      >
                        {/* Rank */}
                        <div className="w-12 text-start">
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              row.rank === 1
                                ? 'bg-amber-100 text-amber-800'
                                : row.rank === 2
                                ? 'bg-slate-200 text-slate-800'
                                : row.rank === 3
                                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {row.rank ?? '—'}
                          </span>
                        </div>

                        {/* Wilaya Name & Code */}
                        <div className="flex-1 text-start">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-gray-400">{row.wilayaCode}</span>
                            <span className="font-bold text-gray-900">{getLocalizedName(row)}</span>
                          </div>
                        </div>

                        {/* Score bar */}
                        <div className="w-36 text-center">
                          {hasScore ? (
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className="h-full rounded-full bg-linear-to-r from-blue-500 to-purple-600"
                                  style={{ width: `${Math.min(100, Math.max(0, row.score))}%` }}
                                />
                              </div>
                              <span className="w-10 text-end font-bold tabular-nums text-purple-700">
                                {row.score.toFixed(1)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-[11px]">
                              {t('common.insufficientData', 'Insufficient')}
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className="w-28 text-center">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              row.status === 'ok'
                                ? 'bg-emerald-50 text-emerald-700'
                                : row.status === 'partial'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {row.status === 'ok' && <CheckCircle2 size={12} />}
                            {row.status === 'partial' && <AlertCircle size={12} />}
                            {row.status.toUpperCase()}
                          </span>
                        </div>

                        {/* Top Reason */}
                        <div className="flex-2 text-start text-xs text-gray-600 truncate pe-4">
                          {row.reasons && row.reasons[0] ? (
                            <span>{row.reasons[0]}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>

                        {/* Expand / View */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/analytics/geo');
                            }}
                            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                            title={t('geo.viewOnMap', 'View on Map')}
                          >
                            <ArrowUpRight size={14} />
                          </button>
                          <div className="text-gray-400">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                      </div>

                      {/* Expandable "Why" Row */}
                      {isExpanded && (
                        <div className="border-t border-purple-100 bg-purple-50/20 px-6 py-4">
                          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {/* Factor Contributions */}
                            <div>
                              <h4 className="mb-2 text-xs font-semibold text-gray-700">
                                {t('growth.factorBreakdown', 'Score Factor Contributions')}
                              </h4>
                              {row.contributions && Object.keys(row.contributions).length > 0 ? (
                                <div className="space-y-1.5">
                                  {Object.entries(row.contributions).map(([fKey, val]) => (
                                    <div key={fKey} className="flex items-center justify-between text-xs">
                                      <span className="text-gray-600 capitalize">
                                        {t(`growth.weights.${fKey}`, fKey)}
                                      </span>
                                      <span className="font-semibold tabular-nums text-purple-900">
                                        +{val.toFixed(1)} pts
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400">
                                  {t('growth.noContributions', 'Not enough indicators to calculate factor points.')}
                                </p>
                              )}
                            </div>

                            {/* Reasoning & Missing Factors */}
                            <div className="space-y-3">
                              <div>
                                <h4 className="mb-1.5 text-xs font-semibold text-gray-700">
                                  {t('growth.explainableReasons', 'Why this Wilaya?')}
                                </h4>
                                <ul className="space-y-1 text-xs text-gray-600">
                                  {row.reasons?.map((r, i) => (
                                    <li key={i} className="flex items-center gap-1.5">
                                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                                      <span>{r}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {row.featuresMissing && row.featuresMissing.length > 0 && (
                                <div className="rounded-md border border-amber-200 bg-amber-50/60 p-2.5 text-[11px] text-amber-800">
                                  <strong className="font-semibold">
                                    {t('growth.missingDataNotice', 'Missing indicators')}:
                                  </strong>{' '}
                                  {row.featuresMissing
                                    .map((m) => t(`growth.weights.${m}`, m))
                                    .join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

