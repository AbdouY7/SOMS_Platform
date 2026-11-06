// src/components/geo/DataQualityNotice.jsx
import { useTranslation } from 'react-i18next';
import { Info, Database, AlertCircle } from 'lucide-react';

export function DataQualityNotice({ sources, dataMode, summary }) {
  const { t } = useTranslation();

  const totalSources = sources ? Object.values(sources).reduce((acc, v) => acc + (v || 0), 0) : 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-2.5 text-xs text-gray-600">
      <div className="flex items-center gap-2">
        <Info size={14} className="text-blue-600 shrink-0" />
        <span>
          <strong className="font-semibold text-gray-700">{t('geo.dataSources', 'Data Sources')}:</strong>{' '}
          {dataMode === 'demo' ? (
            <span className="inline-flex items-center gap-1 font-medium text-amber-700">
              <AlertCircle size={12} /> {t('common.dataSource.synthetic_demo', 'Demo data')} ({sources?.synthetic_demo ?? 0})
            </span>
          ) : totalSources > 0 ? (
            <span>
              {sources?.csv_import > 0 && `${t('common.dataSource.csv_import', 'CSV import')} (${sources.csv_import}) `}
              {sources?.public_manual > 0 && `${t('common.dataSource.public_manual', 'Manual entry')} (${sources.public_manual}) `}
              {sources?.official_api > 0 && `${t('common.dataSource.official_api', 'Official API')} (${sources.official_api})`}
            </span>
          ) : (
            <span>{t('geo.noActiveSources', 'No active sources for this period')}</span>
          )}
        </span>
      </div>

      {summary && (
        <div className="flex items-center gap-4 text-gray-500">
          <span>
            {t('geo.wilayasWithData', 'Coverage')}:{' '}
            <strong className="text-gray-800 font-medium">
              {summary.withDataCount} / {summary.withDataCount + summary.withoutDataCount}
            </strong>{' '}
            ({Math.round((summary.withDataCount / 58) * 100)}%)
          </span>
        </div>
      )}
    </div>
  );
}

