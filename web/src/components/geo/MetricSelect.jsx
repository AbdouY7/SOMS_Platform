// src/components/geo/MetricSelect.jsx
import { useTranslation } from 'react-i18next';
import { ALL_GEO_METRICS } from '../../features/geo/useGeoMetrics.js';

export function MetricSelect({ value, onChange, className = '' }) {
  const { t } = useTranslation();

  return (
    <div className={`relative inline-block ${className}`}>
      <label htmlFor="geo-metric-select" className="sr-only">
        {t('geo.selectMetric', 'Select Metric')}
      </label>
      <select
        id="geo-metric-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-xs transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
      >
        <optgroup label={t('geo.categories.performance', 'Performance')}>
          {ALL_GEO_METRICS.filter((m) => m.category === 'performance').map((m) => (
            <option key={m.value} value={m.value}>
              {t(m.labelKey, m.value)}
            </option>
          ))}
        </optgroup>
        <optgroup label={t('geo.categories.financial', 'Financial (DZD)')}>
          {ALL_GEO_METRICS.filter((m) => m.category === 'financial').map((m) => (
            <option key={m.value} value={m.value}>
              {t(m.labelKey, m.value)}
            </option>
          ))}
        </optgroup>
        <optgroup label={t('geo.categories.reach', 'Reach & Engagement')}>
          {ALL_GEO_METRICS.filter((m) => m.category === 'reach').map((m) => (
            <option key={m.value} value={m.value}>
              {t(m.labelKey, m.value)}
            </option>
          ))}
        </optgroup>
        <optgroup label={t('geo.categories.derived', 'Derived Rates')}>
          {ALL_GEO_METRICS.filter((m) => m.category === 'derived').map((m) => (
            <option key={m.value} value={m.value}>
              {t(m.labelKey, m.value)} ({m.formula})
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}

