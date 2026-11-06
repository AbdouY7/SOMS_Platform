// src/pages/data/GeoAnalyticsPage.jsx — route: /analytics/geo
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Layers,
  Sparkles,
  Calendar,
  RotateCcw,
  Upload,
  ArrowRightLeft,
  Info,
} from 'lucide-react';
import { DemoBanner } from '../../components/ui/DemoBanner.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { MetricSelect } from '../../components/geo/MetricSelect.jsx';
import { ChoroplethMap } from '../../components/map/ChoroplethMap.jsx';
import { WilayaDetailPanel } from '../../components/geo/WilayaDetailPanel.jsx';
import { RankingTable } from '../../components/geo/RankingTable.jsx';
import { DataQualityNotice } from '../../components/geo/DataQualityNotice.jsx';
import { WilayaCompareModal } from '../../components/geo/WilayaCompareModal.jsx';
import { useGeoList, ALL_GEO_METRICS } from '../../features/geo/useGeoMetrics.js';

export default function GeoAnalyticsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Filters state
  const [metric, setMetric] = useState('conversions');
  const [dataMode, setDataMode] = useState('real'); // 'real' | 'demo'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Selected wilaya & compare list
  const [selectedWilayaCode, setSelectedWilayaCode] = useState('16'); // default to Alger (16) if available
  const [compareList, setCompareList] = useState([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Fetch geo data
  const { data, isLoading, isError, error, refetch } = useGeoList({
    metric,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    dataMode,
  });

  const wilayas = data?.wilayas || [];
  const missing = data?.missing || [];
  const summary = data?.summary;
  const sources = data?.sources;

  const hasAnyData = wilayas.length > 0;

  // Add / remove to compare list (max 4)
  const handleToggleCompare = (code) => {
    if (compareList.includes(code)) {
      setCompareList(compareList.filter((c) => c !== code));
    } else {
      if (compareList.length >= 4) {
        setCompareList([...compareList.slice(1), code]);
      } else {
        setCompareList([...compareList, code]);
      }
    }
  };

  const handleRemoveCompare = (code) => {
    setCompareList(compareList.filter((c) => c !== code));
  };

  return (
    <div className="space-y-5">
      {/* Permanent Demo Banner if dataMode === 'demo' */}
      {dataMode === 'demo' && <DemoBanner />}

      {/* Top Header & Filter Controls */}
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="text-blue-600" size={20} />
            <h1 className="text-xl font-bold text-gray-900">{t('nav.geo', 'Geo Analytics')}</h1>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            {t('geo.subtitle', 'Explore regional performance across all 58 Algerian wilayas.')}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Data Mode Toggle (Real vs Demo) */}
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

          {/* Metric Selector */}
          <MetricSelect value={metric} onChange={setMetric} />

          {/* Compare Button */}
          {compareList.length >= 2 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCompareModalOpen(true)}
              className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <ArrowRightLeft size={14} />
              {t('geo.compare', 'Compare')} ({compareList.length})
            </Button>
          )}

          {/* Discover Wilaya Opportunities (links to Growth module) */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/analytics/growth')}
            className="gap-1.5"
          >
            <Sparkles size={14} className="text-purple-600" />
            {t('geo.discoverOpportunities', 'Opportunities')}
          </Button>
        </div>
      </div>

      {/* Date Range & Secondary Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar size={14} className="text-gray-400" />
          <span className="font-medium text-gray-700">{t('common.date', 'Date range')}:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800"
            placeholder="From"
          />
          <span className="text-gray-400">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800"
            placeholder="To"
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
              setDateFrom('');
              setDateTo('');
            }}
            className="rounded-md bg-gray-100 px-2 py-1 hover:bg-gray-200"
          >
            {t('common.allTime', 'All time')}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          <p className="font-semibold">{t('common.error', 'Failed to load geo analytics')}</p>
          <p className="mt-1 text-xs">{error?.message}</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-3">
            <RotateCcw size={14} className="me-1.5" />
            {t('common.retry', 'Retry')}
          </Button>
        </div>
      ) : !hasAnyData && dataMode === 'real' ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8">
          <EmptyState
            title={t('geo.noDataTitle', 'No regional data yet')}
            description={t(
              'geo.noDataDescription',
              'Upload your sales records or regional marketing metrics via CSV import, or switch to Demo Data to preview the analytics.'
            )}
            action={
              <div className="flex gap-2">
                <Button onClick={() => navigate('/data/imports/new')}>
                  <Upload size={16} className="me-1.5" />
                  {t('data.newImport', 'Import CSV Data')}
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
          {/* Data Quality Notice */}
          <DataQualityNotice sources={sources} dataMode={dataMode} summary={summary} />

          {/* Map & Detail Side-by-Side Grid */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Map Column */}
            <div className="lg:col-span-8">
              <ChoroplethMap
                wilayas={wilayas}
                metric={metric}
                selectedWilayaCode={selectedWilayaCode}
                onSelectWilaya={(code) => setSelectedWilayaCode(code)}
              />
            </div>

            {/* Wilaya Detail Panel Column */}
            <div className="lg:col-span-4">
              {selectedWilayaCode ? (
                <WilayaDetailPanel
                  wilayaCode={selectedWilayaCode}
                  metric={metric}
                  dateFrom={dateFrom || undefined}
                  dateTo={dateTo || undefined}
                  dataMode={dataMode}
                  onClose={() => setSelectedWilayaCode(null)}
                  onAddToCompare={handleToggleCompare}
                />
              ) : (
                <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-xs text-gray-500">
                  <MapPin className="mb-2 text-gray-300" size={32} />
                  <p className="font-semibold text-gray-700">
                    {t('geo.selectWilayaPrompt', 'Click any wilaya on the map')}
                  </p>
                  <p className="mt-1 text-gray-400">
                    {t(
                      'geo.selectWilayaHint',
                      'Detailed metrics, trend charts, and conversion rates will appear here.'
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Wilaya Rankings Table & Missing Data List */}
          <div className="pt-2">
            <RankingTable
              wilayas={wilayas}
              missing={missing}
              metric={metric}
              selectedWilayaCode={selectedWilayaCode}
              onSelectWilaya={(code) => setSelectedWilayaCode(code)}
              onAddToCompare={handleToggleCompare}
              compareList={compareList}
            />
          </div>
        </>
      )}

      {/* Compare Modal */}
      {isCompareModalOpen && (
        <WilayaCompareModal
          codes={compareList}
          metric={metric}
          dateFrom={dateFrom || undefined}
          dateTo={dateTo || undefined}
          dataMode={dataMode}
          onClose={() => setIsCompareModalOpen(false)}
          onRemoveCode={handleRemoveCompare}
        />
      )}
    </div>
  );
}

