// src/pages/data/ForecastSimulatorPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Save, CheckCircle, Sliders, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useSimulation,
  useSimulateLive,
  useSaveSimulation,
  useUpdateSimulation,
} from '../../features/forecast/useForecast.js';
import { SCurveChart } from '../../components/forecast/SCurveChart.jsx';
import { MilestoneCards } from '../../components/forecast/MilestoneCards.jsx';
import { AssumptionsForm } from '../../components/forecast/AssumptionsForm.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';

const DEFAULT_ASSUMPTIONS = {
  targetAudience: 100000,
  K: 35000,
  r: 0.22,
  t0: 14,
  durationDays: 30,
  startDate: new Date().toISOString().slice(0, 10),
  budget: 100000,
};

export default function ForecastSimulatorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [name, setName] = useState('');
  const [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS);
  const [previewResult, setPreviewResult] = useState(null);
  const [showDaily, setShowDaily] = useState(true);
  const [showBands, setShowBands] = useState(true);

  // Queries & Mutations
  const { data: existingSim, isLoading: isLoadingSim } = useSimulation(id);
  const simulateLiveMutation = useSimulateLive();
  const saveMutation = useSaveSimulation();
  const updateMutation = useUpdateSimulation();

  // Populate if editing
  useEffect(() => {
    if (existingSim) {
      setName(existingSim.name || '');
      if (existingSim.assumptionsJson) {
        setAssumptions(existingSim.assumptionsJson);
      }
      if (existingSim.scenarioJson) {
        setPreviewResult(existingSim.scenarioJson);
      }
    }
  }, [existingSim]);

  // Debounced auto-preview when assumptions change
  const debounceTimer = useRef(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      if (
        assumptions.K > 0 &&
        assumptions.targetAudience >= assumptions.K &&
        assumptions.r > 0 &&
        assumptions.durationDays > 0
      ) {
        try {
          const res = await simulateLiveMutation.mutateAsync(assumptions);
          setPreviewResult(res);
        } catch {
          // Silent catch on debounce validation fail
        }
      }
    }, 400);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [assumptions]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t('forecast.nameRequired', 'Please enter a scenario name'));
      return;
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id,
          data: { name, assumptions },
        });
        toast.success(t('forecast.updatedSuccess', 'Scenario updated successfully'));
      } else {
        const saved = await saveMutation.mutateAsync({
          name,
          assumptions,
        });
        toast.success(t('forecast.savedSuccess', 'Scenario saved successfully'));
        navigate(`/forecast/${saved.id}`, { replace: true });
      }
    } catch {
      toast.error(t('forecast.saveError', 'Failed to save scenario'));
    }
  };

  if (isEditing && isLoadingSim) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const series = previewResult?.series || [];
  const milestones = previewResult?.milestones || {};
  const summary = previewResult?.summary || {};
  const warnings = previewResult?.warnings || [];

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/forecast')}
            className="p-2"
            title={t('common.back', 'Back')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing
                ? t('forecast.editScenarioTitle', 'Scenario Simulator: {{name}}', { name })
                : t('forecast.newScenarioTitle', 'Interactive Diffusion Simulator')}
            </h1>
            <p className="text-xs text-gray-500">
              {t(
                'forecast.simulatorSubtitle',
                'Calibrate adoption dynamics with stochastic noise bands and milestone checkpoints'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || updateMutation.isPending}
            className="bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending || updateMutation.isPending
              ? t('common.saving', 'Saving...')
              : isEditing
              ? t('forecast.updateScenario', 'Update Scenario')
              : t('forecast.saveScenario', 'Save Scenario')}
          </Button>
        </div>
      </div>

      {/* Main Grid: Left = Assumptions, Right = Visualizations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: 5 cols */}
        <div className="space-y-4 lg:col-span-5">
          <AssumptionsForm
            values={assumptions}
            onChange={setAssumptions}
            onPresetSelect={setAssumptions}
            showNameField={true}
            nameValue={name}
            onNameChange={setName}
            onSubmit={handleSave}
            isSaving={saveMutation.isPending || updateMutation.isPending}
          />
        </div>

        {/* Right Column: 7 cols */}
        <div className="space-y-6 lg:col-span-7">
          {/* Chart Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-xs">
            <span className="text-xs font-semibold text-gray-700">
              {t('forecast.chartControls', 'Visualization Layers')}:
            </span>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-gray-600">
                <input
                  type="checkbox"
                  checked={showDaily}
                  onChange={(e) => setShowDaily(e.target.checked)}
                  className="rounded-sm text-emerald-600"
                />
                <span>{t('forecast.showDailyLine', 'Daily Additions')}</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-gray-600">
                <input
                  type="checkbox"
                  checked={showBands}
                  onChange={(e) => setShowBands(e.target.checked)}
                  className="rounded-sm text-indigo-600"
                />
                <span>{t('forecast.showStochasticBand', 'Stochastic Bands (P10-P90)')}</span>
              </label>

              {simulateLiveMutation.isPending && (
                <span className="flex items-center gap-1 text-[11px] text-indigo-600">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  {t('forecast.computing', 'Simulating...')}
                </span>
              )}
            </div>
          </div>

          {/* S-Curve Chart */}
          <SCurveChart
            series={series}
            milestones={milestones}
            showDaily={showDaily}
            showBands={showBands}
          />

          {/* Milestones & Key Metrics */}
          <MilestoneCards
            milestones={milestones}
            summary={summary}
            warnings={warnings}
          />
        </div>
      </div>
    </div>
  );
}

