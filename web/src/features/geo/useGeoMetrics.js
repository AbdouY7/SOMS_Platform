// src/features/geo/useGeoMetrics.js
import { useQuery } from '@tanstack/react-query';
import { geoApi } from '../../api/geo.js';

export const ALL_GEO_METRICS = [
  { value: 'conversions', labelKey: 'geo.metrics.conversions', category: 'performance', isDerived: false, format: 'integer' },
  { value: 'orders', labelKey: 'geo.metrics.orders', category: 'performance', isDerived: false, format: 'integer' },
  { value: 'revenue', labelKey: 'geo.metrics.revenue', category: 'financial', isDerived: false, format: 'currency' },
  { value: 'spend', labelKey: 'geo.metrics.spend', category: 'financial', isDerived: false, format: 'currency' },
  { value: 'impressions', labelKey: 'geo.metrics.impressions', category: 'reach', isDerived: false, format: 'integer' },
  { value: 'reach', labelKey: 'geo.metrics.reach', category: 'reach', isDerived: false, format: 'integer' },
  { value: 'clicks', labelKey: 'geo.metrics.clicks', category: 'reach', isDerived: false, format: 'integer' },
  {
    value: 'conversion_rate',
    labelKey: 'geo.metrics.conversionRate',
    category: 'derived',
    isDerived: true,
    format: 'percentage',
    formula: 'conversions / clicks',
  },
  {
    value: 'cost_per_conversion',
    labelKey: 'geo.metrics.costPerConversion',
    category: 'derived',
    isDerived: true,
    format: 'currency',
    formula: 'spend / conversions',
  },
  {
    value: 'aov',
    labelKey: 'geo.metrics.aov',
    category: 'derived',
    isDerived: true,
    format: 'currency',
    formula: 'revenue / orders',
  },
];

export function useGeoList({ metric = 'conversions', dateFrom, dateTo, dataMode = 'real' }) {
  return useQuery({
    queryKey: ['geo-list', { metric, dateFrom, dateTo, dataMode }],
    queryFn: () => geoApi.list({ metric, dateFrom, dateTo, dataMode }),
    staleTime: 60 * 1000,
  });
}

export function useWilayaDetail(wilayaCode, { metric = 'conversions', dateFrom, dateTo, dataMode = 'real' }) {
  return useQuery({
    queryKey: ['geo-detail', wilayaCode, { metric, dateFrom, dateTo, dataMode }],
    queryFn: () => geoApi.detail(wilayaCode, { metric, dateFrom, dateTo, dataMode }),
    enabled: Boolean(wilayaCode),
    staleTime: 60 * 1000,
  });
}

export function useWilayaCompare(codes = [], { metric = 'conversions', dateFrom, dateTo, dataMode = 'real' }) {
  const codesString = Array.isArray(codes) ? codes.join(',') : codes;
  return useQuery({
    queryKey: ['geo-compare', codesString, { metric, dateFrom, dateTo, dataMode }],
    queryFn: () => geoApi.compare({ codes: codesString, metric, dateFrom, dateTo, dataMode }),
    enabled: Boolean(codes && codes.length >= 2),
    staleTime: 60 * 1000,
  });
}

export function formatMetricValue(val, format, lang = 'en') {
  if (val === null || val === undefined) return '—';
  if (format === 'percentage') {
    return `${(val * 100).toFixed(2)}%`;
  }
  if (format === 'currency') {
    const formatted = Number(val).toLocaleString(lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-DZ' : 'en-US', {
      maximumFractionDigits: 2,
    });
    return `${formatted} DZD`;
  }
  return Number(val).toLocaleString(lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-DZ' : 'en-US', {
    maximumFractionDigits: 1,
  });
}

