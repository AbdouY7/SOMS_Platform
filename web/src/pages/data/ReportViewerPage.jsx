// src/pages/data/ReportViewerPage.jsx
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Printer,
  Calendar,
  Layers,
  Globe,
  TrendingUp,
  CalendarDays,
  LineChart,
  Sparkles,
  Database,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useReport } from '../../features/reports/useReports.js';
import { reportsApi } from '../../api/reports.js';
import { Button } from '../../components/ui/Button.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';

export default function ReportViewerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: report, isLoading, isError } = useReport(id);

  const handleDownloadCsv = async () => {
    if (!report) return;
    try {
      await reportsApi.downloadCsv(report.id, `soms-${report.title || 'report'}.csv`);
      toast.success(t('reports.downloadSuccess', 'Report CSV downloaded successfully'));
    } catch {
      toast.error(t('reports.downloadError', 'Failed to download CSV'));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
        <h3 className="font-bold">{t('reports.notFound', 'Report Not Found')}</h3>
        <p className="mt-1 text-xs">{t('reports.notFoundDesc', 'This report does not exist or has been removed.')}</p>
        <Button onClick={() => navigate('/reports')} className="mt-4 bg-blue-600 text-white">
          {t('reports.backToReports', 'Back to Reports')}
        </Button>
      </div>
    );
  }

  const snapshot = report.snapshotJson || {};
  const sources = report.sourcesJson || {};
  const isDemo = report.dataMode === 'demo';

  return (
    <div className="space-y-6 print:space-y-4 print:text-black">
      {/* Top Controls Bar (hidden during print) */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/reports')}
            className="p-2"
            title={t('common.back', 'Back')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">{report.title}</h1>
            <p className="mt-0.5 text-xs text-gray-500 capitalize">
              {report.reportType} • {new Date(report.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="text-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            {t('common.print', 'Print Report')}
          </Button>

          <Button
            onClick={handleDownloadCsv}
            className="bg-blue-600 text-white hover:bg-blue-700 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            {t('reports.exportCsv', 'Export CSV')}
          </Button>
        </div>
      </div>

      {/* Demo Banner if demo mode */}
      {isDemo && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span>
              {t(
                'reports.demoWatermark',
                'SYNTHETIC DEMO REPORT — This report was generated from synthetic evaluation datasets.'
              )}
            </span>
          </div>
          <span className="rounded-md bg-amber-200 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-900">
            DEMO
          </span>
        </div>
      )}

      {/* Report Metadata Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs print:border-none print:shadow-none print:p-0">
        <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
          <div>
            <span className="text-gray-400">{t('reports.scope', 'Scope')}:</span>
            <div className="font-bold text-gray-900 capitalize">{report.reportType}</div>
          </div>

          <div>
            <span className="text-gray-400">{t('reports.period', 'Period')}:</span>
            <div className="font-semibold text-gray-900">
              {report.periodStart
                ? `${new Date(report.periodStart).toLocaleDateString()} — ${
                    report.periodEnd ? new Date(report.periodEnd).toLocaleDateString() : 'N/A'
                  }`
                : 'All Time'}
            </div>
          </div>

          <div>
            <span className="text-gray-400">{t('reports.generatedBy', 'Generated By')}:</span>
            <div className="font-semibold text-gray-900">{report.creator?.fullName || 'System User'}</div>
          </div>

          <div>
            <span className="text-gray-400">{t('reports.datasetMode', 'Dataset')}:</span>
            <div className="font-semibold text-gray-900 capitalize">{report.dataMode}</div>
          </div>
        </div>

        {/* Sources count bar */}
        <div className="mt-4 border-t border-gray-100 pt-3 text-[11px] text-gray-500 flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1 font-semibold text-gray-700">
            <Database className="h-3 w-3 text-gray-400" />
            {t('reports.frozenSources', 'Snapshot Sources')}:
          </span>
          <span>{sources.socialPostsCount ?? 0} {t('hub.totalPosts', 'posts')}</span>
          <span>•</span>
          <span>{sources.salesRecordsCount ?? 0} {t('hub.totalOrders', 'sales')}</span>
          <span>•</span>
          <span>{sources.regionalMetricsCount ?? 0} {t('reports.regionalMetrics', 'wilaya metrics')}</span>
          <span>•</span>
          <span>{sources.activeSimulationsCount ?? 0} {t('hub.simulations', 'scenarios')}</span>
        </div>
      </div>

      {/* Snapshot Sections */}

      {/* 1. Geo Section */}
      {snapshot.geo && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs print:border print:shadow-none">
          <div className="mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-gray-900">
              {t('reports.geoSectionTitle', 'Regional Wilaya Performance (Algeria)')}
            </h2>
          </div>

          {snapshot.geo.wilayas && snapshot.geo.wilayas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
                  <tr>
                    <th className="p-2.5 font-semibold">Wilaya</th>
                    <th className="p-2.5 font-semibold">AR</th>
                    <th className="p-2.5 font-semibold">Revenue</th>
                    <th className="p-2.5 font-semibold">Orders</th>
                    <th className="p-2.5 font-semibold">AOV</th>
                    <th className="p-2.5 font-semibold">Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {snapshot.geo.wilayas.slice(0, 15).map((w) => (
                    <tr key={w.code}>
                      <td className="p-2.5 font-semibold text-gray-900">{w.code} - {w.name}</td>
                      <td className="p-2.5 font-arabic">{w.nameAr || '—'}</td>
                      <td className="p-2.5 font-semibold text-emerald-700">
                        {Number(w.revenue || 0).toLocaleString()} DZD
                      </td>
                      <td className="p-2.5">{Number(w.orders || 0).toLocaleString()}</td>
                      <td className="p-2.5">{Number(w.aov || 0).toLocaleString()} DZD</td>
                      <td className="p-2.5">{Number(w.spend || 0).toLocaleString()} DZD</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {snapshot.geo.wilayas.length > 15 && (
                <div className="mt-2 text-center text-[11px] text-gray-400">
                  {t('reports.showingTop', 'Showing top 15 wilayas. Complete data available in CSV export.')}
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-gray-400">
              {t('common.noData', 'No regional metrics captured in this period')}
            </div>
          )}
        </div>
      )}

      {/* 2. Growth Section */}
      {snapshot.growth && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs print:border print:shadow-none">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-gray-900">
              {t('reports.growthSectionTitle', 'Sales Growth & Velocity Timeline')}
            </h2>
          </div>

          {snapshot.growth.timeline && snapshot.growth.timeline.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
                  <tr>
                    <th className="p-2.5 font-semibold">Period</th>
                    <th className="p-2.5 font-semibold">Sales (DZD)</th>
                    <th className="p-2.5 font-semibold">Orders</th>
                    <th className="p-2.5 font-semibold">Prev Sales</th>
                    <th className="p-2.5 font-semibold">Growth (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {snapshot.growth.timeline.map((item) => (
                    <tr key={item.period}>
                      <td className="p-2.5 font-bold text-gray-900">{item.period}</td>
                      <td className="p-2.5 font-semibold text-emerald-700">
                        {Number(item.sales || 0).toLocaleString()} DZD
                      </td>
                      <td className="p-2.5">{item.orders || 0}</td>
                      <td className="p-2.5 text-gray-400">
                        {Number(item.prevSales || 0).toLocaleString()} DZD
                      </td>
                      <td className="p-2.5 font-semibold">
                        {item.salesGrowthPct !== null ? (
                          <span
                            className={item.salesGrowthPct >= 0 ? 'text-emerald-600' : 'text-red-600'}
                          >
                            {item.salesGrowthPct > 0 ? `+${item.salesGrowthPct}%` : `${item.salesGrowthPct}%`}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-gray-400">
              {t('common.noData', 'No growth timeline captured')}
            </div>
          )}
        </div>
      )}

      {/* 3. Scheduler Section */}
      {snapshot.scheduler && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs print:border print:shadow-none">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-purple-600" />
            <h2 className="text-base font-bold text-gray-900">
              {t('reports.schedulerSectionTitle', 'Optimal Publishing Windows')}
            </h2>
          </div>

          {snapshot.scheduler.windows && snapshot.scheduler.windows.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {snapshot.scheduler.windows.map((win, idx) => (
                <div key={idx} className="rounded-lg border border-purple-100 bg-purple-50/40 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">{win.dayName || `Day ${win.day}`}</span>
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700 uppercase">
                      {win.confidence}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-purple-900">
                    {String(win.startHour).padStart(2, '0')}:00 — {String(win.endHour).padStart(2, '0')}:00
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                    <span>{t('reports.avgEngagement', 'Avg Engagement')}:</span>
                    <span className="font-bold text-gray-800">{win.avgEngagement}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-gray-400">
              {t('common.noData', 'No optimal windows identified')}
            </div>
          )}
        </div>
      )}

      {/* 4. Forecast Section */}
      {snapshot.forecast && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs print:border print:shadow-none">
          <div className="mb-4 flex items-center gap-2">
            <LineChart className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-gray-900">
              {t('reports.forecastSectionTitle', 'S-Curve Diffusion Simulations')}
            </h2>
          </div>

          {snapshot.forecast.simulations && snapshot.forecast.simulations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
                  <tr>
                    <th className="p-2.5 font-semibold">Scenario</th>
                    <th className="p-2.5 font-semibold">Capacity (K)</th>
                    <th className="p-2.5 font-semibold">Rate (r)</th>
                    <th className="p-2.5 font-semibold">Inflection (t0)</th>
                    <th className="p-2.5 font-semibold">Duration</th>
                    <th className="p-2.5 font-semibold">Projected Reach</th>
                    <th className="p-2.5 font-semibold">Est. CPR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {snapshot.forecast.simulations.map((sim) => {
                    const a = sim.assumptionsJson || {};
                    const s = sim.scenarioJson?.summary || {};
                    return (
                      <tr key={sim.id}>
                        <td className="p-2.5 font-bold text-gray-900">{sim.name}</td>
                        <td className="p-2.5">{a.K ? Number(a.K).toLocaleString() : '—'}</td>
                        <td className="p-2.5 font-mono">{a.r || '—'}</td>
                        <td className="p-2.5">Day {a.t0}</td>
                        <td className="p-2.5">{sim.durationDays}d</td>
                        <td className="p-2.5 font-bold text-indigo-600">
                          {s.finalValue ? Number(s.finalValue).toLocaleString() : '—'}
                        </td>
                        <td className="p-2.5 font-semibold text-emerald-700">
                          {s.costPerResult ? `${Number(s.costPerResult).toLocaleString()} DZD` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-gray-400">
              {t('common.noData', 'No active simulation scenarios found')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

