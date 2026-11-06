// src/components/forecast/MilestoneCards.jsx
import { useTranslation } from 'react-i18next';
import { Flag, Zap, CheckCircle2, AlertTriangle, Coins, TrendingUp } from 'lucide-react';

export function MilestoneCards({ milestones = {}, summary = {}, warnings = [], className = '' }) {
  const { t } = useTranslation();

  const p10 = milestones.p10 || {};
  const p50 = milestones.p50 || {};
  const p90 = milestones.p90 || {};

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Warnings banner */}
      {warnings && warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{t('forecast.warningsTitle', 'Simulation Warnings')}</span>
          </div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-amber-700">
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Milestone Cards Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* P10 Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">{t('forecast.p10Title', 'P10 — Early Adopters (10%)')}</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Flag className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-gray-900">
              {p10.day !== null && p10.day !== undefined ? `${t('forecast.day', 'Day')} ${p10.day}` : '—'}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
              <span>{t('forecast.targetVolume', 'Target')}:</span>
              <span className="font-semibold text-gray-700">
                {p10.target !== undefined ? Number(p10.target).toLocaleString() : '—'}
              </span>
            </div>
            {p10.reached ? (
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> {t('forecast.reachedInCampaign', 'Reached')}
              </span>
            ) : (
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
                <AlertTriangle className="h-3 w-3" /> {t('forecast.notReached', 'Exceeds duration')}
              </span>
            )}
          </div>
        </div>

        {/* P50 Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">{t('forecast.p50Title', 'P50 — Peak Velocity (50%)')}</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Zap className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-gray-900">
              {p50.day !== null && p50.day !== undefined ? `${t('forecast.day', 'Day')} ${p50.day}` : '—'}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
              <span>{t('forecast.inflectionK', 'Inflection')}:</span>
              <span className="font-semibold text-gray-700">
                {p50.target !== undefined ? Number(p50.target).toLocaleString() : '—'}
              </span>
            </div>
            {p50.reached ? (
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> {t('forecast.reachedInCampaign', 'Reached')}
              </span>
            ) : (
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
                <AlertTriangle className="h-3 w-3" /> {t('forecast.notReached', 'Exceeds duration')}
              </span>
            )}
          </div>
        </div>

        {/* P90 Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">{t('forecast.p90Title', 'P90 — Saturation (90%)')}</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-50 text-purple-600">
              <TrendingUp className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-gray-900">
              {p90.day !== null && p90.day !== undefined ? `${t('forecast.day', 'Day')} ${p90.day}` : '—'}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
              <span>{t('forecast.saturationCeiling', 'Ceiling')}:</span>
              <span className="font-semibold text-gray-700">
                {p90.target !== undefined ? Number(p90.target).toLocaleString() : '—'}
              </span>
            </div>
            {p90.reached ? (
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> {t('forecast.reachedInCampaign', 'Reached')}
              </span>
            ) : (
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
                <AlertTriangle className="h-3 w-3" /> {t('forecast.notReached', 'Exceeds duration')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
          <span className="text-[11px] text-gray-500">{t('forecast.finalReach', 'Final Projected Reach')}</span>
          <div className="mt-1 text-base font-bold text-gray-900">
            {summary.finalValue !== undefined ? Number(summary.finalValue).toLocaleString() : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
          <span className="text-[11px] text-gray-500">{t('forecast.capacityRealized', 'Capacity Realized')}</span>
          <div className="mt-1 text-base font-bold text-gray-900">
            {summary.pctOfK !== undefined ? `${summary.pctOfK}%` : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
          <span className="text-[11px] text-gray-500">{t('forecast.campaignDuration', 'Campaign Duration')}</span>
          <div className="mt-1 text-base font-bold text-gray-900">
            {summary.durationDays !== undefined ? `${summary.durationDays} ${t('forecast.days', 'days')}` : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
          <span className="text-[11px] text-gray-500">{t('forecast.costPerResult', 'Cost Per Result')}</span>
          <div className="mt-1 flex items-center gap-1 text-base font-bold text-emerald-700">
            <Coins className="h-4 w-4" />
            <span>
              {summary.costPerResult !== undefined && summary.costPerResult !== null
                ? `${Number(summary.costPerResult).toLocaleString()} DZD`
                : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

