// src/components/forecast/AssumptionsForm.jsx
import { useTranslation } from 'react-i18next';
import { Sparkles, Sliders, Calendar, DollarSign, Users, Target, Activity } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';

export function AssumptionsForm({
  values,
  onChange,
  onPresetSelect,
  onSubmit,
  isSaving = false,
  showNameField = true,
  nameValue = '',
  onNameChange,
  className = '',
}) {
  const { t } = useTranslation();

  const handleFieldChange = (field, val) => {
    onChange({
      ...values,
      [field]: val,
    });
  };

  const presets = [
    {
      id: 'massiliya',
      name: t('forecast.presetMassiliya', 'Massiliya (Aggressive)'),
      color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
      data: {
        targetAudience: values.targetAudience || 100000,
        K: 45000,
        r: 0.35,
        t0: 10,
        durationDays: 30,
        budget: 150000,
      },
    },
    {
      id: 'equilibrée',
      name: t('forecast.presetEquilibree', 'Équilibrée (Balanced)'),
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
      data: {
        targetAudience: values.targetAudience || 100000,
        K: 30000,
        r: 0.20,
        t0: 15,
        durationDays: 45,
        budget: 90000,
      },
    },
    {
      id: 'classique',
      name: t('forecast.presetClassique', 'Classique (Conservative)'),
      color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
      data: {
        targetAudience: values.targetAudience || 100000,
        K: 15000,
        r: 0.12,
        t0: 25,
        durationDays: 60,
        budget: 40000,
      },
    },
  ];

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-xs ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-gray-900">
            {t('forecast.assumptionsTitle', 'Scenario Assumptions')}
          </h3>
        </div>
      </div>

      {/* Preset Quick Buttons */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-gray-500 flex items-center gap-1 mb-2">
          <Sparkles className="h-3 w-3 text-amber-500" />
          {t('forecast.presetsLabel', 'Scenario Archetypes')}
        </label>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPresetSelect && onPresetSelect(p.data)}
              className={`rounded-lg border px-2.5 py-1.5 text-center text-xs font-medium transition-colors ${p.color}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (onSubmit) onSubmit();
        }}
        className="space-y-3"
      >
        {showNameField && (
          <div>
            <label className="text-xs font-semibold text-gray-700">
              {t('forecast.scenarioName', 'Scenario Name')} *
            </label>
            <Input
              type="text"
              required
              value={nameValue}
              onChange={(e) => onNameChange && onNameChange(e.target.value)}
              placeholder={t('forecast.scenarioNamePlaceholder', 'e.g. Ramadan 2026 Boost')}
              className="mt-1"
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Target Audience */}
          <div>
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-gray-400" />
              {t('forecast.targetAudience', 'Target Audience')}
            </label>
            <Input
              type="number"
              min="1"
              required
              value={values.targetAudience ?? ''}
              onChange={(e) => handleFieldChange('targetAudience', Number(e.target.value))}
              className="mt-1"
            />
          </div>

          {/* Capacity Ceiling K */}
          <div>
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              <Target className="h-3.5 w-3.5 text-indigo-500" />
              {t('forecast.capacityK', 'Capacity (K)')}
            </label>
            <Input
              type="number"
              min="1"
              max={values.targetAudience || 10000000}
              required
              value={values.K ?? ''}
              onChange={(e) => handleFieldChange('K', Number(e.target.value))}
              className="mt-1"
            />
          </div>

          {/* Growth rate r */}
          <div>
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-emerald-500" />
              {t('forecast.growthRateR', 'Growth Rate (r/day)')}
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max="5.0"
              required
              value={values.r ?? ''}
              onChange={(e) => handleFieldChange('r', Number(e.target.value))}
              className="mt-1"
            />
          </div>

          {/* Inflection t0 */}
          <div>
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-blue-500" />
              {t('forecast.inflectionT0', 'Inflection Day (t0)')}
            </label>
            <Input
              type="number"
              step="0.5"
              min="0"
              required
              value={values.t0 ?? ''}
              onChange={(e) => handleFieldChange('t0', Number(e.target.value))}
              className="mt-1"
            />
          </div>

          {/* Campaign Duration */}
          <div>
            <label className="text-xs font-semibold text-gray-700">
              {t('forecast.durationDays', 'Duration (Days)')}
            </label>
            <Input
              type="number"
              min="1"
              max="365"
              required
              value={values.durationDays ?? ''}
              onChange={(e) => handleFieldChange('durationDays', Number(e.target.value))}
              className="mt-1"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="text-xs font-semibold text-gray-700">
              {t('forecast.startDate', 'Start Date')}
            </label>
            <Input
              type="date"
              required
              value={values.startDate ?? ''}
              onChange={(e) => handleFieldChange('startDate', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        {/* Budget */}
        <div>
          <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-amber-500" />
            {t('forecast.budgetDZD', 'Campaign Budget (DZD - Optional)')}
          </label>
          <Input
            type="number"
            min="0"
            value={values.budget ?? ''}
            onChange={(e) => handleFieldChange('budget', e.target.value ? Number(e.target.value) : null)}
            placeholder="e.g. 100000"
            className="mt-1"
          />
        </div>

        {onSubmit && (
          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSaving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSaving ? t('common.saving', 'Saving...') : t('forecast.saveScenario', 'Save Scenario')}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

