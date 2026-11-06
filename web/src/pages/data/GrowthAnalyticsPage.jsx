// src/pages/data/GrowthAnalyticsPage.jsx — route: /analytics/growth
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Sliders,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Upload,
  Info,
} from 'lucide-react';
import { DemoBanner } from '../../components/ui/DemoBanner.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { GrowthKPICards } from '../../components/growth/GrowthKPICards.jsx';
import { GrowthChart } from '../../components/growth/GrowthChart.jsx';
import { OpportunitiesTable } from '../../components/growth/OpportunitiesTable.jsx';
import { OpportunityWeightsModal } from '../../components/growth/OpportunityWeightsModal.jsx';
import { useGrowthSummary, useGrowthOpportunities } from '../../features/growth/useGrowth.js';

export default function GrowthAnalyticsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Filter states
  const [dataMode, setDataMode] = useState('real');
  const [granularity, setGranularity] = useState('month');
  const [metric, setMetric] = useState('orders'); // 'orders' | 'revenue' | 'followers'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Weights override state
  const [customWeights, setCustomWeights] = useState(null);
  const [isWeightsModalOpen, setIsWeightsModalOpen] = useState(false);

  // Queries
  const summaryQuery = useGrowthSummary({
    start: dateFrom || undefined,
    end: dateTo || undefined,
    granularity,
    metric,
    dataMode,
  });

  const opportunitiesQuery = useGrowthOpportunities({
    start: dateFrom || undefined,
    end: dateTo || undefined,
    dataMode,
    weights: customWeights || undefined,
  });

  const summary = summaryQuery.data;
  const opportunities = opportunitiesQuery.data;

  const isLoading = summaryQuery.isLoading || opportunitiesQuery.isLoading;
  const isError = summaryQuery.isError || opportunitiesQuery.isError;
  const error = summaryQuery.error || opportunitiesQuery.error;

  const hasData = summary && (summary.totals?.orders > 0 || summary.totals?.sales > 0 || (opportunities?.results && opportunities.results.length > 0));

  return (
    <div className="space-y-5">
      {/* Permanent Demo Banner */}
      {dataMode === 'demo' && <DemoBanner />}

      {/* Header and primary filters */}
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="text-blue-600" size={20} />
            <h1 className="text-xl font-bold text-gray-900">{t('nav.growth', 'Growth & Expansion')}</h1>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            {t('growth.subtitle', 'Track sales performance trends and uncover data-driven wilaya expansion opportunities.')}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Data Mode Toggle */}
          <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setDataMode('real')}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                dataMode === 'real'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t('geo.realData', 'Real Data')}
            </button>
            <button
              type="button"
              onClick={() => setDataMode('demo')}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                dataMode === 'demo'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t('common.demoData', 'Demo Data')}
            </button>
          </div>

          {/* Granularity */}
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:border-gray-400"
          >
            <option value="month">{t('growth.monthly', 'Monthly')}</option>
            <option value="week">{t('growth.weekly', 'Weekly')}</option>
            <option value="day">{t('growth.daily', 'Daily')}</option>
          </select>

          {/* Metric */}
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:border-gray-400"
          >
            <option value="orders">{t('growth.orders', 'Orders')}</option>
            <option value="revenue">{t('growth.revenue', 'Revenue')}</option>
            <option value="followers">{t('growth.followers', 'Engagement')}</option>
          </select>

          {/* Customize Opportunity Weights */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsWeightsModalOpen(true)}
            className="gap-1.5"
          >
            <Sliders size={14} className="text-purple-600" />
            {t('growth.weightsBtn', 'Weights')}
            {customWeights && <span className="h-2 w-2 rounded-full bg-purple-600" />}
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar size={14} className="text-gray-400" />
          <span className="font-medium text-gray-700">{t('common.date', 'Date range')}:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800"
          />
          <span className="text-gray-400">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800"
          />
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="text-xs text-blue-600 hover:underline"
            >
              {t('common.reset', 'Reset')}
            </button>
          )}
        </div>

        {/* Quick Date Presets */}
        <div className="flex items-center gap-1.5 text-gray-500">
          <button
            type="button"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 30);
              setDateFrom(d.toISOString().slice(0, 10));
              setDateTo(new Date().toISOString().slice(0, 10));
            }}
            className="rounded-md bg-gray-100 px-2 py-1 hover:bg-gray-200"
          >
            30d
          </button>
          <button
            type="button"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 90);
              setDateFrom(d.toISOString().slice(0, 10));
              setDateTo(new Date().toISOString().slice(0, 10));
            }}
            className="rounded-md bg-gray-100 px-2 py-1 hover:bg-gray-200"
          >
            90d
          </button>
          <button
            type="button"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 365);
              setDateFrom(d.toISOString().slice(0, 10));
              setDateTo(new Date().toISOString().slice(0, 10));
            }}
            className="rounded-md bg-gray-100 px-2 py-1 hover:bg-gray-200"
          >
            1y
          </button>
        </div>
      </div>

      {/* Warnings Banner if insufficient periods */}
      {summary?.warnings && summary.warnings.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-800">
          <AlertTriangle size={15} className="shrink-0 text-amber-600" />
          <span>{summary.warnings.join(' ')}</span>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          <p className="font-semibold">{t('common.error', 'Failed to load growth analytics')}</p>
          <p className="mt-1 text-xs">{error?.message}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              summaryQuery.refetch();
              opportunitiesQuery.refetch();
            }}
            className="mt-3"
          >
            <RotateCcw size={14} className="me-1.5" />
            {t('common.retry', 'Retry')}
          </Button>
        </div>
      ) : !hasData && dataMode === 'real' ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8">
          <EmptyState
            title={t('growth.noDataTitle', 'No growth data recorded')}
            description={t(
              'growth.noDataDescription',
              'Upload sales records and regional metrics to enable growth KPIs and wilaya opportunity scoring.'
            )}
            action={
              <div className="flex gap-2">
                <Button onClick={() => navigate('/data/imports/new')}>
                  <Upload size={16} className="me-1.5" />
                  {t('data.newImport', 'Import Data')}
                </Button>
                <Button variant="secondary" onClick={() => setDataMode('demo')}>
                  {t('common.tryDemoData', 'Try Demo Data')}
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <GrowthKPICards totals={summary?.totals} />

          {/* Period vs Period Chart */}
          <GrowthChart
            series={summary?.series}
            previousSeries={summary?.previousSeries}
            metric={metric}
          />

          {/* Opportunities Table */}
          <OpportunitiesTable
            results={opportunities?.results || []}
            onSelectWilaya={(code) => navigate(`/analytics/geo?wilaya=${code}`)}
          />

          {/* Disclaimer per spec */}
          <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50/70 p-3 text-[11px] text-gray-500">
            <Info size={14} className="mt-0.5 shrink-0 text-gray-400" />
            <span>{opportunities?.disclaimer || t('growth.disclaimer', 'Opportunity scores are based exclusively on your company uploaded data, not on the broader Algerian macroeconomic market.')}</span>
          </div>
        </>
      )}

      {/* Weights Modal */}
      {isWeightsModalOpen && (
        <OpportunityWeightsModal
          currentWeights={customWeights || opportunities?.weightsUsed}
          onApply={(w) => setCustomWeights(w)}
          onClose={() => setIsWeightsModalOpen(false)}
        />
      )}
    </div>
  );
}

