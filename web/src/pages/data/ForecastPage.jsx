// src/pages/data/ForecastPage.jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Plus,
  BarChart2,
  Calendar,
  DollarSign,
  Trash2,
  ExternalLink,
  CheckSquare,
  Square,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSimulations, useArchiveSimulation } from '../../features/forecast/useForecast.js';
import { Button } from '../../components/ui/Button.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';

export default function ForecastPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [selectedIds, setSelectedIds] = useState([]);
  const [archiveTargetId, setArchiveTargetId] = useState(null);

  const { data: simulations, isLoading, isError } = useSimulations();
  const archiveMutation = useArchiveSimulation();

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 4) {
        toast.error(t('forecast.maxCompareLimit', 'You can compare at most 4 scenarios'));
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleCompare = () => {
    if (selectedIds.length < 2) {
      toast.error(t('forecast.minCompareLimit', 'Select at least 2 scenarios to compare'));
      return;
    }
    navigate(`/forecast/compare?ids=${selectedIds.join(',')}`);
  };

  const confirmArchive = async () => {
    if (!archiveTargetId) return;
    try {
      await archiveMutation.mutateAsync(archiveTargetId);
      toast.success(t('forecast.scenarioArchived', 'Scenario archived successfully'));
      setSelectedIds((prev) => prev.filter((id) => id !== archiveTargetId));
    } catch {
      toast.error(t('forecast.archiveFailed', 'Failed to archive scenario'));
    } finally {
      setArchiveTargetId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              {t('forecast.pageTitle', 'Campaign Diffusion Forecast')}
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {t('forecast.pageSubtitle', 'Stochastic S-Curve diffusion simulations for Algerian marketing campaigns')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.length >= 2 && (
            <Button
              onClick={handleCompare}
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              <BarChart2 className="h-4 w-4" />
              {t('forecast.compareSelected', 'Compare Selected ({{count}})', { count: selectedIds.length })}
            </Button>
          )}

          <Button
            onClick={() => navigate('/forecast/new')}
            className="bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            {t('forecast.newScenario', 'New Scenario')}
          </Button>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs text-indigo-900">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
          <span>
            {t(
              'forecast.disclaimerNotice',
              'S-Curve forecasts represent mathematical probability models based on baseline assumptions. Real campaign performance depends on creative quality, seasonal events, and platform algorithm shifts.'
            )}
          </span>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          {t('forecast.loadError', 'Failed to load scenarios. Please try again.')}
        </div>
      )}

      {/* Scenarios Grid */}
      {!isLoading && !isError && simulations && simulations.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {simulations.map((sim) => {
            const isSelected = selectedIds.includes(sim.id);
            const scenario = sim.scenarioJson || {};
            const summary = scenario.summary || {};
            const assumptions = sim.assumptionsJson || {};

            return (
              <div
                key={sim.id}
                className={`relative flex flex-col justify-between rounded-xl border bg-white p-5 shadow-xs transition-all hover:shadow-md ${
                  isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-gray-200'
                }`}
              >
                <div>
                  {/* Card Header with Checkbox */}
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleSelect(sim.id)}
                      className="text-gray-400 hover:text-indigo-600 focus:outline-hidden"
                      title={t('forecast.selectForComparison', 'Select for comparison')}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-5 w-5 text-indigo-600" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>

                    <div className="flex-1 truncate">
                      <h3 className="truncate text-base font-bold text-gray-900" title={sim.name}>
                        {sim.name}
                      </h3>
                      <span className="text-xs text-gray-400">
                        {new Date(sim.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setArchiveTargetId(sim.id)}
                      className="text-gray-400 hover:text-red-500 focus:outline-hidden"
                      title={t('common.delete', 'Delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Parameters Grid */}
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-3 text-xs">
                    <div>
                      <span className="text-gray-400">{t('forecast.capacityK', 'Capacity (K)')}:</span>
                      <div className="font-semibold text-gray-800">
                        {assumptions.K ? Number(assumptions.K).toLocaleString() : '—'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">{t('forecast.growthRateR', 'Growth rate (r)')}:</span>
                      <div className="font-semibold text-gray-800">
                        {assumptions.r ? assumptions.r : '—'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">{t('forecast.durationDays', 'Duration')}:</span>
                      <div className="font-semibold text-gray-800">
                        {sim.durationDays} {t('forecast.days', 'days')}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">{t('forecast.budget', 'Budget')}:</span>
                      <div className="font-semibold text-gray-800">
                        {sim.budget ? `${Number(sim.budget).toLocaleString()} DZD` : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Summary Outcome */}
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs">
                    <div>
                      <span className="text-gray-500">{t('forecast.projectedReach', 'Projected Reach')}:</span>
                      <div className="text-sm font-bold text-indigo-600">
                        {summary.finalValue ? Number(summary.finalValue).toLocaleString() : '—'}
                      </div>
                    </div>

                    {summary.costPerResult !== undefined && summary.costPerResult !== null && (
                      <div className="text-end">
                        <span className="text-gray-500">{t('forecast.cpr', 'Est. CPR')}:</span>
                        <div className="text-sm font-bold text-emerald-600">
                          {Number(summary.costPerResult).toLocaleString()} DZD
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Open in Simulator button */}
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/forecast/${sim.id}`)}
                    className="w-full text-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {t('forecast.openInSimulator', 'Open in Simulator')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && simulations && simulations.length === 0 && (
        <EmptyState
          icon={TrendingUp}
          title={t('forecast.noScenariosTitle', 'No forecast scenarios yet')}
          description={t(
            'forecast.noScenariosDesc',
            'Create your first S-Curve diffusion scenario to predict campaign audience penetration and saturation velocity.'
          )}
          actionLabel={t('forecast.newScenario', 'New Scenario')}
          onAction={() => navigate('/forecast/new')}
        />
      )}

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(archiveTargetId)}
        title={t('forecast.confirmArchiveTitle', 'Archive Simulation Scenario')}
        description={t(
          'forecast.confirmArchiveDesc',
          'Are you sure you want to archive this scenario? It will be removed from your active simulations.'
        )}
        confirmLabel={t('common.archive', 'Archive')}
        confirmVariant="danger"
        onConfirm={confirmArchive}
        onCancel={() => setArchiveTargetId(null)}
      />
    </div>
  );
}

