// src/components/scheduler/HeatmapGrid.jsx
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Plus } from 'lucide-react';

const WEEKDAYS_STANDARD = [
  { index: 0, key: 'mon', label: 'Mon' },
  { index: 1, key: 'tue', label: 'Tue' },
  { index: 2, key: 'wed', label: 'Wed' },
  { index: 3, key: 'thu', label: 'Thu' },
  { index: 4, key: 'fri', label: 'Fri' },
  { index: 5, key: 'sat', label: 'Sat' },
  { index: 6, key: 'sun', label: 'Sun' },
];

const WEEKDAYS_ALGERIA = [
  { index: 5, key: 'sat', label: 'Sat' },
  { index: 6, key: 'sun', label: 'Sun' },
  { index: 0, key: 'mon', label: 'Mon' },
  { index: 1, key: 'tue', label: 'Tue' },
  { index: 2, key: 'wed', label: 'Wed' },
  { index: 3, key: 'thu', label: 'Thu' },
  { index: 4, key: 'fri', label: 'Fri' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function HeatmapGrid({
  cells = [],
  metricUsed = 'engagement_rate',
  minSamplesPerSlot = 5,
  startOnSaturday = false,
  onSelectSlot,
}) {
  const { t, i18n } = useTranslation();
  const [hoveredCell, setHoveredCell] = useState(null);

  const weekdays = startOnSaturday ? WEEKDAYS_ALGERIA : WEEKDAYS_STANDARD;

  // Cell lookup map
  const cellMap = useMemo(() => {
    const map = new Map();
    cells.forEach((c) => {
      map.set(`${c.weekday}-${c.hour}`, c);
    });
    return map;
  }, [cells]);

  // Max value for scaling
  const maxVal = useMemo(() => {
    let max = 0;
    cells.forEach((c) => {
      if (c.postCount >= minSamplesPerSlot && c.median > max) {
        max = c.median;
      }
    });
    return max || 1;
  }, [cells, minSamplesPerSlot]);

  const getCellBg = (cell) => {
    if (!cell || cell.postCount === 0) return 'bg-gray-50';
    if (cell.postCount < minSamplesPerSlot) return 'bg-gray-100 border border-dashed border-gray-300';

    const ratio = Math.min(1, Math.max(0.1, cell.median / maxVal));
    if (ratio < 0.25) return 'bg-blue-100 text-blue-900';
    if (ratio < 0.5) return 'bg-blue-300 text-blue-950';
    if (ratio < 0.75) return 'bg-blue-500 text-white';
    return 'bg-blue-700 text-white font-bold';
  };

  const unit = metricUsed === 'engagement_rate' ? '%' : '';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-gray-900">
            {t('scheduler.heatmapTitle', 'Posting Time Heatmap')} (Africa/Algiers UTC+1)
          </h3>
          <p className="text-xs text-gray-500">
            {t('scheduler.heatmapSubtitle', 'Median engagement by hour and weekday. Darker cells indicate higher performance.')}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-xs bg-gray-50 border border-gray-200" />
            <span>0</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-xs bg-gray-100 border border-dashed border-gray-300" />
            <span>{t('scheduler.underMinSlot', '< {{min}} posts', { min: minSamplesPerSlot })}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-xs bg-blue-100" />
            <span className="inline-block h-3 w-3 rounded-xs bg-blue-300" />
            <span className="inline-block h-3 w-3 rounded-xs bg-blue-500" />
            <span className="inline-block h-3 w-3 rounded-xs bg-blue-700" />
            <span className="ms-1">{t('scheduler.peak', 'Peak')}</span>
          </div>
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto">
        <div className="min-w-[680px]">
          {/* Hour labels */}
          <div className="grid grid-cols-[60px_repeat(24,1fr)] gap-1 text-center text-[10px] font-semibold text-gray-400 pb-1">
            <div />
            {HOURS.map((h) => (
              <div key={h} className="truncate">
                {h}
              </div>
            ))}
          </div>

          {/* Days and cells */}
          <div className="space-y-1">
            {weekdays.map((day) => (
              <div key={day.key} className="grid grid-cols-[60px_repeat(24,1fr)] gap-1 items-center">
                <span className="text-xs font-semibold text-gray-700 pe-2">
                  {t(`scheduler.days.${day.key}`, day.label)}
                </span>

                {HOURS.map((h) => {
                  const cell = cellMap.get(`${day.index}-${h}`);
                  const count = cell?.postCount || 0;
                  const median = cell?.median || 0;
                  const isUnderMin = count > 0 && count < minSamplesPerSlot;

                  return (
                    <div
                      key={h}
                      onMouseEnter={() => setHoveredCell({ day: day.label, hour: h, count, median, isUnderMin })}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => onSelectSlot && onSelectSlot({ weekday: day.index, hour: h })}
                      className={`group relative flex h-7 items-center justify-center rounded-xs transition-all cursor-pointer ${getCellBg(
                        cell
                      )} hover:ring-2 hover:ring-blue-600 hover:z-10`}
                      title={`${day.label} ${h}:00 - ${count} posts - ${median}${unit}`}
                    >
                      {count >= minSamplesPerSlot && median > 0 && (
                        <span className="text-[9px] tabular-nums opacity-90 group-hover:opacity-100">
                          {median < 10 ? median.toFixed(1) : Math.round(median)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live hover status bar */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs">
        <div className="flex items-center gap-2 text-gray-600">
          <Clock size={14} className="text-blue-600" />
          {hoveredCell ? (
            <span>
              <strong>
                {hoveredCell.day} at {String(hoveredCell.hour).padStart(2, '0')}:00
              </strong>
              :{' '}
              {hoveredCell.count === 0
                ? t('common.noData', 'No posts published')
                : `${hoveredCell.count} ${t('data.posts', 'posts')} — median ${hoveredCell.median}${unit} ${
                    hoveredCell.isUnderMin ? `(${t('scheduler.sampleTooSmall', 'sample below threshold')})` : ''
                  }`}
            </span>
          ) : (
            <span className="text-gray-400">
              {t('scheduler.hoverHint', 'Hover over any slot for details, or click to add a planned post.')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

