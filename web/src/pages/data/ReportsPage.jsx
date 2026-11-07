// src/pages/data/ReportsPage.jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Download,
  Eye,
  Trash2,
  Calendar,
  Sparkles,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useReports, useDeleteReport } from '../../features/reports/useReports.js';
import { reportsApi } from '../../api/reports.js';
import { Button } from '../../components/ui/Button.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';

export default function ReportsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [typeFilter, setTypeFilter] = useState('');
  const [dataModeFilter, setDataModeFilter] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const { data, isLoading, isError } = useReports({
    type: typeFilter || undefined,
    dataMode: dataModeFilter || undefined,
  });

  const deleteMutation = useDeleteReport();

  const reports = data?.data || data?.reports || [];

  const handleDownloadCsv = async (id, title) => {
    try {
      await reportsApi.downloadCsv(id, `soms-${title || 'report'}.csv`);
      toast.success(t('reports.downloadSuccess', 'Report CSV downloaded successfully'));
    } catch {
      toast.error(t('reports.downloadError', 'Failed to download CSV'));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteMutation.mutateAsync(deleteTargetId);
      toast.success(t('reports.deletedSuccess', 'Report deleted successfully'));
    } catch {
      toast.error(t('reports.deleteError', 'Failed to delete report'));
    } finally {
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-gray-700" />
            <h1 className="text-2xl font-bold text-gray-900">{t('reports.pageTitle', 'Generated Reports')}</h1>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {t(
              'reports.pageSubtitle',
              'Frozen, reproducible analytical snapshots with Arabic-compatible UTF-8 BOM CSV exports'
            )}
          </p>
        </div>

        <Button
          onClick={() => navigate('/reports/new')}
          className="bg-blue-600 text-white hover:bg-blue-700 text-xs"
        >
          <Plus className="h-4 w-4" />
          {t('reports.generateNew', 'New Report')}
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-xs text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-600">{t('reports.moduleFilter', 'Type')}:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:outline-hidden"
          >
            <option value="">{t('common.all', 'All Modules')}</option>
            <option value="combined">{t('reports.typeCombined', 'Combined')}</option>
            <option value="geo">{t('nav.geo', 'Geo Analytics')}</option>
            <option value="growth">{t('nav.growth', 'Growth')}</option>
            <option value="scheduler">{t('nav.scheduler', 'Scheduler')}</option>
            <option value="forecast">{t('nav.forecast', 'Forecast')}</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-600">{t('reports.modeFilter', 'Mode')}:</span>
          <select
            value={dataModeFilter}
            onChange={(e) => setDataModeFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:outline-hidden"
          >
            <option value="">{t('common.all', 'All Modes')}</option>
            <option value="real">{t('common.realData', 'Real Data')}</option>
            <option value="demo">{t('common.demoData', 'Demo Data')}</option>
          </select>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          {t('reports.loadError', 'Failed to load reports. Please try again.')}
        </div>
      )}

      {/* Reports Table */}
      {!isLoading && !isError && reports.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
              <tr>
                <th className="p-3 font-semibold">{t('reports.title', 'Report Title')}</th>
                <th className="p-3 font-semibold">{t('reports.type', 'Type')}</th>
                <th className="p-3 font-semibold">{t('reports.mode', 'Mode')}</th>
                <th className="p-3 font-semibold">{t('reports.period', 'Period')}</th>
                <th className="p-3 font-semibold">{t('reports.generated', 'Generated')}</th>
                <th className="p-3 font-semibold text-end">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {reports.map((r) => {
                const isDemo = r.dataMode === 'demo';
                return (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-bold text-gray-900">
                      <button
                        type="button"
                        onClick={() => navigate(`/reports/${r.id}`)}
                        className="hover:text-blue-600 text-start"
                      >
                        {r.title}
                      </button>
                    </td>

                    <td className="p-3 capitalize">
                      <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
                        {r.reportType === 'combined' ? (
                          <Layers className="h-3 w-3 text-purple-600" />
                        ) : (
                          <FileText className="h-3 w-3 text-blue-600" />
                        )}
                        {r.reportType}
                      </span>
                    </td>

                    <td className="p-3">
                      {isDemo ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                          <Sparkles className="h-2.5 w-2.5" /> DEMO
                        </span>
                      ) : (
                        <span className="text-gray-500 font-medium">Real</span>
                      )}
                    </td>

                    <td className="p-3 text-gray-500">
                      {r.periodStart
                        ? `${new Date(r.periodStart).toLocaleDateString()} — ${
                            r.periodEnd ? new Date(r.periodEnd).toLocaleDateString() : 'N/A'
                          }`
                        : '—'}
                    </td>

                    <td className="p-3 text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-3 text-end">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDownloadCsv(r.id, r.title)}
                          className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-100"
                          title={t('common.download', 'Export CSV')}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/reports/${r.id}`)}
                          className="rounded-md border border-gray-200 p-1.5 text-blue-600 hover:bg-blue-50"
                          title={t('common.view', 'View Report')}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetId(r.id)}
                          className="rounded-md border border-gray-200 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50"
                          title={t('common.delete', 'Delete')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && reports.length === 0 && (
        <EmptyState
          icon={FileText}
          title={t('reports.noReportsTitle', 'No reports generated yet')}
          description={t(
            'reports.noReportsDesc',
            'Generate a new report to freeze multi-channel analytical findings into reproducible snapshots and export Excel-ready CSV files.'
          )}
          actionLabel={t('reports.generateNew', 'New Report')}
          onAction={() => navigate('/reports/new')}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTargetId)}
        title={t('reports.confirmDeleteTitle', 'Delete Report')}
        description={t(
          'reports.confirmDeleteDesc',
          'Are you sure you want to delete this report snapshot? This action cannot be undone.'
        )}
        confirmLabel={t('common.delete', 'Delete')}
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}

