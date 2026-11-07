// src/pages/data/ReportWizardPage.jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Layers,
  Globe,
  TrendingUp,
  CalendarDays,
  LineChart,
  Calendar,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateReport } from '../../features/reports/useReports.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';

export default function ReportWizardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createMutation = useCreateReport();

  const [type, setType] = useState('combined');
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [end, setEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [dataMode, setDataMode] = useState('real');
  const [platform, setPlatform] = useState('all');

  const reportModules = [
    {
      id: 'combined',
      title: t('reports.typeCombined', 'Executive Combined'),
      desc: t('reports.descCombined', 'All analytics modules consolidated into a comprehensive snapshot'),
      icon: Layers,
      color: 'border-purple-200 bg-purple-50/50 text-purple-700',
    },
    {
      id: 'geo',
      title: t('nav.geo', 'Geo Analytics'),
      desc: t('reports.descGeo', 'Regional performance and wilaya-level conversions across Algeria'),
      icon: Globe,
      color: 'border-blue-200 bg-blue-50/50 text-blue-700',
    },
    {
      id: 'growth',
      title: t('nav.growth', 'Growth & Expansion'),
      desc: t('reports.descGrowth', 'Timeline sales velocity, period comparisons, and opportunities'),
      icon: TrendingUp,
      color: 'border-emerald-200 bg-emerald-50/50 text-emerald-700',
    },
    {
      id: 'scheduler',
      title: t('nav.scheduler', 'Post Scheduler'),
      desc: t('reports.descScheduler', 'Optimal posting windows and engagement distribution heatmaps'),
      icon: CalendarDays,
      color: 'border-amber-200 bg-amber-50/50 text-amber-700',
    },
    {
      id: 'forecast',
      title: t('nav.forecast', 'S-Curve Forecast'),
      desc: t('reports.descForecast', 'Stochastic diffusion simulation trajectories and milestones'),
      icon: LineChart,
      color: 'border-indigo-200 bg-indigo-50/50 text-indigo-700',
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error(t('reports.titleRequired', 'Please enter a report title'));
      return;
    }

    try {
      const payload = {
        type,
        title: title.trim(),
        start: type !== 'forecast' ? start : undefined,
        end: type !== 'forecast' ? end : undefined,
        dataMode,
        filters: {
          platform: platform !== 'all' ? platform : undefined,
        },
      };

      const report = await createMutation.mutateAsync(payload);
      toast.success(t('reports.createdSuccess', 'Report generated successfully'));
      navigate(`/reports/${report.id}`);
    } catch {
      toast.error(t('reports.createError', 'Failed to generate report'));
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top Bar */}
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
          <h1 className="text-2xl font-bold text-gray-900">{t('reports.wizardTitle', 'Generate Analytical Report')}</h1>
          <p className="mt-1 text-xs text-gray-500">
            {t('reports.wizardSubtitle', 'Select report type, time frame, and dataset mode to freeze a reproducible snapshot')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Module Archetype Selection */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
          <h2 className="mb-3 text-sm font-bold text-gray-900">
            1. {t('reports.selectType', 'Select Report Scope')}
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reportModules.map((m) => {
              const Icon = m.icon;
              const isSelected = type === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setType(m.id)}
                  className={`relative cursor-pointer rounded-xl border p-4 transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/30 ring-2 ring-blue-500/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${m.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {isSelected && <CheckCircle className="h-4 w-4 text-blue-600" />}
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-gray-900">{m.title}</h3>
                  <p className="mt-1 text-xs text-gray-500">{m.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Metadata & Time Period */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900">
            2. {t('reports.configureParameters', 'Report Details & Date Range')}
          </h2>

          <div>
            <label className="text-xs font-semibold text-gray-700">
              {t('reports.reportTitle', 'Report Title')} *
            </label>
            <Input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q2 2026 Marketing Performance & Saturation Analysis"
              className="mt-1"
            />
          </div>

          {type !== 'forecast' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  {t('reports.startDate', 'Start Date')}
                </label>
                <Input
                  type="date"
                  required
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  {t('reports.endDate', 'End Date')}
                </label>
                <Input
                  type="date"
                  required
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Data Mode & Platform */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
            <div>
              <label className="text-xs font-semibold text-gray-700">
                {t('reports.dataMode', 'Dataset Source')}
              </label>
              <select
                value={dataMode}
                onChange={(e) => setDataMode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 focus:outline-hidden"
              >
                <option value="real">{t('common.realData', 'Real Data (Production Imports)')}</option>
                <option value="demo">{t('common.demoData', 'Synthetic Demo Data')}</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700">
                {t('reports.platformFilter', 'Target Platform')}
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 focus:outline-hidden"
              >
                <option value="all">{t('common.allPlatforms', 'All Platforms')}</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/reports')}
            className="text-xs"
          >
            {t('common.cancel', 'Cancel')}
          </Button>

          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-blue-600 text-white hover:bg-blue-700 text-xs"
          >
            <FileText className="h-4 w-4" />
            {createMutation.isPending
              ? t('reports.generating', 'Compiling Snapshot...')
              : t('reports.generateReport', 'Generate & Save Report')}
          </Button>
        </div>
      </form>
    </div>
  );
}

