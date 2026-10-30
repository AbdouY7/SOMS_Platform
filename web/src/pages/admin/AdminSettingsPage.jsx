// src/pages/admin/AdminSettingsPage.jsx
// Three cards (General, Thresholds, Opportunity weights), each with its own Save button.
// Save sends PATCH /api/admin/settings/:key for every changed field in that card.
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { settingsApi, getErrorMessage } from '../../api/system3.js';

const GENERAL_KEYS = ['default_language', 'allow_registration'];
const THRESHOLDS = [
  { key: 'import_max_file_mb', label: 'Import max file size (MB)', min: 1, max: 50 },
  { key: 'import_max_rows', label: 'Import max rows', min: 100, max: 500000 },
  { key: 'scheduler_min_posts_per_slot', label: 'Scheduler: min posts per slot', min: 1 },
  { key: 'scheduler_min_total_posts', label: 'Scheduler: min total posts', min: 1 },
  { key: 'growth_min_periods', label: 'Growth: min periods', min: 2 },
];
const WEIGHTS = [
  { key: 'demand_growth', label: 'Demand growth' },
  { key: 'conversion_rate', label: 'Conversion rate' },
  { key: 'leads_volume', label: 'Leads volume' },
  { key: 'cac', label: 'CAC' },
  { key: 'margin', label: 'Profit margin' },
];
const LANGUAGES = [
  { value: 'ar', label: 'العربية' },
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
];

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function Card({ title, onSave, saving, disabled, dirty, children }) {
  const { t } = useTranslation();
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <header className="border-b border-gray-100 px-5 py-4">
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </header>
      <div className="space-y-4 px-5 py-5">{children}</div>
      <footer className="flex justify-end border-t border-gray-100 px-5 py-3">
        <Button onClick={onSave} loading={saving} disabled={disabled || !dirty}>
          {t('common.save', 'Save changes')}
        </Button>
      </footer>
    </section>
  );
}

function NumberField({ label, value, min, max, onChange }) {
  const id = `n-${label}`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <label htmlFor={id} className="text-sm text-gray-700">{label}</label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-end text-sm tabular-nums focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

export default function AdminSettingsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({ queryKey: ['admin-settings'], queryFn: settingsApi.getAll });
  const [draft, setDraft] = useState(null);

  useEffect(() => { if (data) setDraft(data); }, [data]);

  const saveKeys = useMutation({
    mutationFn: (keys) => Promise.all(keys.map((k) => settingsApi.update(k, draft[k]))),
    onSuccess: () => {
      toast.success(t('settings.saved', 'Settings saved'));
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const weightSum = useMemo(
    () => (draft ? WEIGHTS.reduce((s, w) => s + (Number(draft.opportunity_weights?.[w.key]) || 0), 0) : 0),
    [draft]
  );

  if (isLoading || !draft) {
    return isError
      ? <p className="text-sm text-red-600">{getErrorMessage(error)}</p>
      : <div className="flex justify-center py-24"><Spinner /></div>;
  }

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const dirtyKeys = (keys) => keys.filter((k) => !same(draft[k], data[k]));
  const thresholdKeys = THRESHOLDS.map((x) => x.key);
  const weightsValid = Math.round(weightSum * 100) / 100 === 100;
  const thresholdsValid = THRESHOLDS.every(
    ({ key, min, max }) => Number.isInteger(draft[key]) && draft[key] >= min && (max == null || draft[key] <= max)
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">{t('settings.title', 'System Settings')}</h1>

      {/* General */}
      <Card
        title={t('settings.general', 'General')}
        dirty={dirtyKeys(GENERAL_KEYS).length > 0}
        saving={saveKeys.isPending}
        onSave={() => saveKeys.mutate(dirtyKeys(GENERAL_KEYS))}
      >
        <fieldset>
          <legend className="mb-2 text-sm text-gray-700">{t('settings.defaultLanguage', 'Default language')}</legend>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <label
                key={l.value}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
                  draft.default_language === l.value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="default_language"
                  value={l.value}
                  checked={draft.default_language === l.value}
                  onChange={() => set('default_language', l.value)}
                  className="accent-blue-600"
                />
                {l.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-700">{t('settings.allowRegistration', 'Allow registration')}</p>
            <p className="text-xs text-gray-500">{t('settings.allowRegistrationHint', 'Shows the public registration form.')}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={draft.allow_registration}
            aria-label={t('settings.allowRegistration', 'Allow registration')}
            onClick={() => set('allow_registration', !draft.allow_registration)}
            className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${draft.allow_registration ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                draft.allow_registration ? 'start-[22px]' : 'start-0.5'
              }`}
            />
          </button>
        </div>
      </Card>

      {/* Thresholds */}
      <Card
        title={t('settings.thresholds', 'Thresholds')}
        dirty={dirtyKeys(thresholdKeys).length > 0}
        disabled={!thresholdsValid}
        saving={saveKeys.isPending}
        onSave={() => saveKeys.mutate(dirtyKeys(thresholdKeys))}
      >
        {THRESHOLDS.map(({ key, label, min, max }) => (
          <NumberField
            key={key}
            label={t(`settings.keys.${key}`, label)}
            value={draft[key]}
            min={min}
            max={max}
            onChange={(v) => set(key, v)}
          />
        ))}
        {!thresholdsValid && (
          <p className="text-sm text-red-600">{t('settings.thresholdError', 'Enter whole numbers within the allowed range.')}</p>
        )}
      </Card>

      {/* Opportunity weights */}
      <Card
        title={t('settings.weights', 'Opportunity Weights')}
        dirty={dirtyKeys(['opportunity_weights']).length > 0}
        disabled={!weightsValid}
        saving={saveKeys.isPending}
        onSave={() => saveKeys.mutate(['opportunity_weights'])}
      >
        {WEIGHTS.map(({ key, label }) => (
          <NumberField
            key={key}
            label={`${t(`settings.weightKeys.${key}`, label)} (%)`}
            value={draft.opportunity_weights?.[key] ?? 0}
            min={0}
            max={100}
            onChange={(v) => set('opportunity_weights', { ...draft.opportunity_weights, [key]: v })}
          />
        ))}
        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <p
            className={`text-sm font-medium tabular-nums ${weightsValid ? 'text-green-600' : 'text-red-600'}`}
            role="status"
          >
            {t('settings.weightSum', { sum: weightSum, defaultValue: 'Total: {{sum}}/100' })}
          </p>
          {!weightsValid && (
            <p className="text-xs text-red-600">{t('settings.weightError', 'Weights must sum to exactly 100')}</p>
          )}
        </div>
      </Card>
    </div>
  );
}
