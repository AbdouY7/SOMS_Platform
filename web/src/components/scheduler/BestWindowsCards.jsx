// src/components/scheduler/BestWindowsCards.jsx
import { useTranslation } from 'react-i18next';
import { Calendar, Plus, Award, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button.jsx';

const WEEKDAYS_MAP = {
  0: 'Monday',
  1: 'Tuesday',
  2: 'Wednesday',
  3: 'Thursday',
  4: 'Friday',
  5: 'Saturday',
  6: 'Sunday',
};

export function BestWindowsCards({ recommendations = [], onScheduleSlot }) {
  const { t } = useTranslation();

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-xs text-xs text-gray-500">
        <AlertCircle size={20} className="shrink-0 text-amber-500" />
        <div>
          <p className="font-semibold text-gray-800">
            {t('scheduler.noRecommendationsTitle', 'No conclusive window recommendations yet')}
          </p>
          <p className="mt-0.5 text-gray-400">
            {t(
              'scheduler.noRecommendationsHint',
              'Prescriptive recommendations require a minimum sample of published posts to prevent misleading advice.'
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Award className="text-amber-500" size={18} />
        <h3 className="text-sm font-bold text-gray-900">
          {t('scheduler.recommendedWindows', 'Optimal Posting Windows')}
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((rec, idx) => {
          const dayName = WEEKDAYS_MAP[rec.weekday] || `Day ${rec.weekday}`;
          const timeFormatted = `${String(rec.hour).padStart(2, '0')}:00`;

          return (
            <div
              key={`${rec.weekday}-${rec.hour}`}
              className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    #{idx + 1} {t('scheduler.bestWindow', 'Window')}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      rec.confidence === 'high'
                        ? 'bg-emerald-50 text-emerald-700'
                        : rec.confidence === 'medium'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {t(`scheduler.confidence.${rec.confidence}`, rec.confidence.toUpperCase())}
                  </span>
                </div>

                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-gray-900">{dayName}</span>
                  <span className="text-sm font-semibold text-blue-600">{timeFormatted}</span>
                </div>

                <p className="mt-2 text-xs text-gray-500 leading-relaxed">{rec.reason}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onScheduleSlot && onScheduleSlot(rec)}
                  className="w-full gap-1.5 text-xs text-blue-700 hover:bg-blue-50"
                >
                  <Plus size={14} />
                  {t('scheduler.addToPlan', 'Add to Plan')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

