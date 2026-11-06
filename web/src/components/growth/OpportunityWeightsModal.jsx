// src/components/growth/OpportunityWeightsModal.jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button.jsx';

const DEFAULT_WEIGHTS = {
  demandGrowth: 30,
  conversionRate: 25,
  leadsVolume: 20,
  cac: 15,
  margin: 10,
};

export function OpportunityWeightsModal({
  currentWeights = DEFAULT_WEIGHTS,
  onApply,
  onClose,
}) {
  const { t } = useTranslation();
  const [weights, setWeights] = useState({ ...currentWeights });

  const total = Object.values(weights).reduce((a, b) => a + Number(b || 0), 0);
  const isValid = total === 100;

  const handleChange = (key, val) => {
    const num = Math.max(0, Math.min(100, Number(val) || 0));
    setWeights((prev) => ({ ...prev, [key]: num }));
  };

  const handleReset = () => {
    setWeights({ ...DEFAULT_WEIGHTS });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {t('growth.weightsTitle', 'Opportunity Scoring Weights')}
            </h3>
            <p className="text-xs text-gray-500">
              {t('growth.weightsSubtitle', 'Customize how wilaya expansion potential is weighted')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-3.5">
          {[
            { key: 'demandGrowth', label: t('growth.weights.demandGrowth', 'Demand / Orders Growth'), desc: '30%' },
            { key: 'conversionRate', label: t('growth.weights.conversionRate', 'Conversion Rate'), desc: '25%' },
            { key: 'leadsVolume', label: t('growth.weights.leadsVolume', 'Audience / Traffic Volume'), desc: '20%' },
            { key: 'cac', label: t('growth.weights.cac', 'Acquisition Cost (CAC - lower is better)'), desc: '15%' },
            { key: 'margin', label: t('growth.weights.margin', 'Profit Margin'), desc: '10%' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <label htmlFor={`weight-${key}`} className="text-xs font-medium text-gray-700">
                {label}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id={`weight-${key}`}
                  type="number"
                  min="0"
                  max="100"
                  value={weights[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-16 rounded-md border border-gray-300 px-2 py-1 text-end text-xs font-bold text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-gray-400">%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Total indicator */}
        <div
          className={`mt-5 flex items-center justify-between rounded-lg p-3 text-xs font-semibold ${
            isValid ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {isValid ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{t('settings.weightSum', { sum: total })}</span>
          </div>
          {!isValid && (
            <span className="text-[11px] font-normal">
              {t('settings.weightError', 'Must sum to 100')}
            </span>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-3">
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-gray-500">
            <RotateCcw size={14} />
            {t('common.reset', 'Reset')}
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!isValid}
              onClick={() => {
                onApply(weights);
                onClose();
              }}
            >
              {t('common.apply', 'Apply Weights')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

