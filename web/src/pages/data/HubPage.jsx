// src/pages/data/HubPage.jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Globe,
  TrendingUp,
  CalendarDays,
  LineChart,
  FileText,
  Upload,
  ArrowUpRight,
  AlertCircle,
  Info,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  DollarSign,
  ShoppingCart,
  Users,
  EyeIcon,
  Sparkles,
} from 'lucide-react';
import { useHubSummary } from '../../features/hub/useHub.js';
import { reportsApi } from '../../api/reports.js';
import { Button } from '../../components/ui/Button.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import toast from 'react-hot-toast';

export default function HubPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dataMode, setDataMode] = useState('real');

  const { data: summary, isLoading, isError } = useHubSummary({ dataMode });

  const kpis = summary?.kpiSummary || {};
  const modules = summary?.moduleStatus || {};
  const latestImports = summary?.latestImports || [];
  const recentReports = summary?.recentReports || [];
  const notices = summary?.notices || [];

  const handleDownloadCsv = async (id, title) => {
    try {
      await reportsApi.downloadCsv(id, `soms-${title || 'report'}.csv`);
      toast.success(t('reports.downloadSuccess', 'Report CSV downloaded'));
    } catch {
      toast.error(t('reports.downloadError', 'Failed to download CSV'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">{t('hub.pageTitle', 'SOMS Analytics Hub')}</h1>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {t('hub.pageSubtitle', 'Central marketing command center for Algerian multi-channel campaigns')}
          </p>
        </div>

        {/* Data mode switch + Quick actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1 text-xs shadow-xs">
            <button
              type="button"
              onClick={() => setDataMode('real')}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                dataMode === 'real'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('common.realData', 'Real Data')}
            </button>
            <button
              type="button"
              onClick={() => setDataMode('demo')}
              className={`flex items-center gap-1 rounded-md px-3 py-1 font-medium transition-colors ${
                dataMode === 'demo'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Sparkles className="h-3 w-3" />
              {t('common.demoData', 'Demo Data')}
            </button>
          </div>

          <Button
            onClick={() => navigate('/data/imports/new')}
            className="bg-blue-600 text-white hover:bg-blue-700 text-xs"
          >
            <Upload className="h-3.5 w-3.5" />
            {t('hub.importData', 'Import CSV')}
          </Button>

          <Button
            onClick={() => navigate('/reports/new')}
            variant="outline"
            className="text-xs"
          >
            <FileText className="h-3.5 w-3.5" />
            {t('hub.newReport', 'New Report')}
          </Button>
        </div>
      </div>

      {/* Notices Banner */}
      {notices && notices.length > 0 && (
        <div className="space-y-2">
          {notices.map((n) => (
            <div
              key={n.id}
              className={`flex items-center gap-2 rounded-xl border p-3 text-xs ${
                n.type === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-blue-100 bg-blue-50 text-blue-800'
              }`}
            >
              {n.type === 'warning' ? (
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              ) : (
                <Info className="h-4 w-4 text-blue-600 shrink-0" />
              )}
              <span>{n.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          {t('hub.loadError', 'Failed to load executive summary')}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* Executive KPI Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-medium text-gray-500">{t('hub.totalRevenue', 'Revenue')}</span>
              <div className="mt-1 flex items-center gap-1 text-lg font-bold text-gray-900">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span>{Number(kpis.totalRevenue || 0).toLocaleString()} DZD</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-medium text-gray-500">{t('hub.totalOrders', 'Total Orders')}</span>
              <div className="mt-1 flex items-center gap-1 text-lg font-bold text-gray-900">
                <ShoppingCart className="h-4 w-4 text-blue-600" />
                <span>{Number(kpis.totalOrders || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-medium text-gray-500">{t('hub.totalPosts', 'Tracked Posts')}</span>
              <div className="mt-1 text-lg font-bold text-gray-900">
                {Number(kpis.totalPosts || 0).toLocaleString()}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-medium text-gray-500">{t('hub.totalImpressions', 'Impressions')}</span>
              <div className="mt-1 flex items-center gap-1 text-lg font-bold text-gray-900">
                <EyeIcon className="h-4 w-4 text-purple-600" />
                <span>{Number(kpis.totalImpressions || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-medium text-gray-500">{t('hub.totalReach', 'Unique Reach')}</span>
              <div className="mt-1 flex items-center gap-1 text-lg font-bold text-gray-900">
                <Users className="h-4 w-4 text-indigo-600" />
                <span>{Number(kpis.totalReach || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-medium text-gray-500">{t('hub.totalEngagement', 'Engagement')}</span>
              <div className="mt-1 text-lg font-bold text-emerald-600">
                {Number(kpis.totalEngagement || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Module Navigation Tiles */}
          <div>
            <h2 className="mb-3 text-sm font-bold text-gray-900">
              {t('hub.modulesOverview', 'Analytics & Planning Modules')}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {/* Geo Tile */}
              <div
                onClick={() => navigate('/analytics/geo')}
                className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-xs transition-all hover:border-blue-500 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Globe className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-gray-900">{t('nav.geo', 'Geo Analytics')}</h3>
                <p className="mt-1 text-xs text-gray-500">
                  {t('hub.geoDesc', 'Regional Algerian performance across 58 wilayas')}
                </p>
                <div className="mt-3">
                  {modules.geo?.hasData ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> {t('hub.dataReady', 'Data Ready')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      <Clock className="h-3 w-3" /> {t('hub.needsImport', 'Needs Import')}
                    </span>
                  )}
                </div>
              </div>

              {/* Growth Tile */}
              <div
                onClick={() => navigate('/analytics/growth')}
                className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-xs transition-all hover:border-emerald-500 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-emerald-600" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-gray-900">{t('nav.growth', 'Growth & Expansion')}</h3>
                <p className="mt-1 text-xs text-gray-500">
                  {t('hub.growthDesc', 'Timeline velocity and market opportunity scoring')}
                </p>
                <div className="mt-3">
                  {modules.growth?.hasData ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> {t('hub.dataReady', 'Data Ready')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      <Clock className="h-3 w-3" /> {t('hub.needsImport', 'Needs Import')}
                    </span>
                  )}
                </div>
              </div>

              {/* Scheduler Tile */}
              <div
                onClick={() => navigate('/analytics/scheduler')}
                className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-xs transition-all hover:border-purple-500 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-gray-900">{t('nav.scheduler', 'Post Scheduler')}</h3>
                <p className="mt-1 text-xs text-gray-500">
                  {t('hub.schedulerDesc', 'Optimal publication windows and editorial queue')}
                </p>
                <div className="mt-3">
                  {modules.scheduler?.hasData ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> {t('hub.dataReady', 'Data Ready')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      <Clock className="h-3 w-3" /> {t('hub.needsImport', 'Needs Import')}
                    </span>
                  )}
                </div>
              </div>

              {/* Forecast Tile */}
              <div
                onClick={() => navigate('/forecast')}
                className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-xs transition-all hover:border-indigo-500 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <LineChart className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-indigo-600" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-gray-900">{t('nav.forecast', 'S-Curve Forecast')}</h3>
                <p className="mt-1 text-xs text-gray-500">
                  {t('hub.forecastDesc', 'Stochastic diffusion simulation scenarios')}
                </p>
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                    {modules.forecast?.simulationsCount || 0} {t('hub.simulations', 'Scenarios')}
                  </span>
                </div>
              </div>

              {/* Reports Tile */}
              <div
                onClick={() => navigate('/reports')}
                className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-xs transition-all hover:border-gray-500 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                    <FileText className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-gray-900" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-gray-900">{t('nav.reports', 'Reports & Export')}</h3>
                <p className="mt-1 text-xs text-gray-500">
                  {t('hub.reportsDesc', 'Frozen reproducible snapshots and CSV exports')}
                </p>
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                    {modules.reports?.reportsCount || 0} {t('hub.savedReports', 'Saved')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Grid: Latest Imports & Recent Reports */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Latest Imports */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">
                  {t('hub.latestImports', 'Recent Data Imports')}
                </h3>
                <button
                  type="button"
                  onClick={() => navigate('/data/imports')}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  {t('common.viewAll', 'View All')}
                </button>
              </div>

              {latestImports.length > 0 ? (
                <div className="divide-y divide-gray-100 text-xs">
                  {latestImports.map((imp) => (
                    <div key={imp.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <div className="font-semibold text-gray-800">{imp.fileName || 'data.csv'}</div>
                        <span className="text-[11px] text-gray-400">
                          {imp.importType} • {new Date(imp.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-end">
                        <span className="inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          {imp.acceptedRows ?? imp.totalRows ?? 0} {t('hub.rows', 'rows')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-gray-400">
                  {t('hub.noImports', 'No datasets imported yet')}
                </div>
              )}
            </div>

            {/* Recent Reports */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">
                  {t('hub.recentReports', 'Recent Generated Reports')}
                </h3>
                <button
                  type="button"
                  onClick={() => navigate('/reports')}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  {t('common.viewAll', 'View All')}
                </button>
              </div>

              {recentReports.length > 0 ? (
                <div className="divide-y divide-gray-100 text-xs">
                  {recentReports.map((rep) => (
                    <div key={rep.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <div className="font-semibold text-gray-800">{rep.title}</div>
                        <span className="text-[11px] text-gray-400 capitalize">
                          {rep.reportType} • {new Date(rep.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDownloadCsv(rep.id, rep.title)}
                          className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                          title={t('common.download', 'Download CSV')}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/reports/${rep.id}`)}
                          className="rounded-md border border-gray-200 p-1.5 text-blue-600 hover:bg-blue-50"
                          title={t('common.view', 'View')}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-gray-400">
                  {t('hub.noReports', 'No reports generated yet')}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

