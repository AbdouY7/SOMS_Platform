// src/pages/data/SchedulerPage.jsx — route: /analytics/scheduler
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Plus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { DemoBanner } from '../../components/ui/DemoBanner.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { HeatmapGrid } from '../../components/scheduler/HeatmapGrid.jsx';
import { BestWindowsCards } from '../../components/scheduler/BestWindowsCards.jsx';
import { ScheduleItemModal } from '../../components/scheduler/ScheduleItemModal.jsx';
import { useSchedulerAnalysis } from '../../features/scheduler/useScheduler.js';

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'other', label: 'Other' },
];

export default function SchedulerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Filters
  const [platform, setPlatform] = useState('instagram');
  const [dataMode, setDataMode] = useState('real');
  const [contentType, setContentType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [startOnSaturday, setStartOnSaturday] = useState(true); // Algerian work week default

  // Schedule modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const { data, isLoading, isError, error, refetch } = useSchedulerAnalysis({
    platform,
    start: dateFrom || undefined,
    end: dateTo || undefined,
    contentType: contentType || undefined,
    dataMode,
  });

  const cells = data?.cells || [];
  const recommendations = data?.recommendations || [];
  const warnings = data?.warnings || [];
  const sample = data?.sample;
  const metricUsed = data?.metricUsed || 'engagement_rate';

  const hasPosts = sample && sample.totalPosts > 0;

  const handleOpenPlanModal = (slot = null) => {
    setSelectedSlot(slot ? { ...slot, platform } : { platform });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Permanent Demo Banner */}
      {dataMode === 'demo' && <DemoBanner />}

      {/* Top Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="text-blue-600" size={20} />
            <h1 className="text-xl font-bold text-gray-900">{t('nav.scheduler', 'Post Scheduler Analytics')}</h1>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            {t('scheduler.subtitle', 'Determine empirical optimal posting hours and manage your internal publishing calendar.')}
          </p>
        </div>

        {/* Top actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Data Mode Toggle */}
          <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setDataMode('real')}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                dataMode === 'real'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t('geo.realData', 'Real Data')}
            </button>
            <button
              type="button"
              onClick={() => setDataMode('demo')}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                dataMode === 'demo'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t('common.demoData', 'Demo Data')}
            </button>
          </div>

          {/* Go to Plan Page button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/schedule')}
            className="gap-1.5"
          >
            <Calendar size={14} className="text-blue-600" />
            {t('scheduler.viewPlan', 'Editorial Plan')}
          </Button>

          {/* Add to plan shortcut */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenPlanModal()}
            className="gap-1.5"
          >
            <Plus size={14} />
            {t('scheduler.newPlanItem', 'Schedule Post')}
          </Button>
        </div>
      </div>

      {/* Platform Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPlatform(p.id)}
            className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              platform === p.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Secondary Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Content Type Filter */}
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 font-medium"
          >
            <option value="">{t('scheduler.allContentTypes', 'All Content Types')}</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="reel">Reel</option>
            <option value="carousel">Carousel</option>
            <option value="story">Story</option>
          </select>

          {/* Date range inputs */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">{t('common.date', 'Date')}:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs"
            />
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs"
            />
          </div>

          {/* Saturday start toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer text-gray-600 ms-2">
            <input
              type="checkbox"
              checked={startOnSaturday}
              onChange={(e) => setStartOnSaturday(e.target.checked)}
              className="rounded-xs border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>{t('scheduler.startOnSaturday', 'Start week on Saturday (DZ)')}</span>
          </label>
        </div>

        {/* Metric indicator badge */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-[11px]">{t('scheduler.metricUsed', 'Analysis Metric')}:</span>
          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
            {metricUsed === 'engagement_rate'
              ? t('scheduler.engagementRate', 'Engagement Rate (interactions / impressions)')
              : t('scheduler.publicInteractions', 'Public Interactions (likes + comments)')}
          </span>
        </div>
      </div>

      {/* Warnings banner */}
      {warnings.length > 0 && (
        <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-900">
          <AlertTriangle size={16} className="shrink-0 text-amber-600" />
          <span>{warnings.join(' ')}</span>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          <p className="font-semibold">{t('common.error', 'Failed to load scheduler analytics')}</p>
          <p className="mt-1 text-xs">{error?.message}</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-3">
            <RotateCcw size={14} className="me-1.5" />
            {t('common.retry', 'Retry')}
          </Button>
        </div>
      ) : !hasPosts && dataMode === 'real' ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8">
          <EmptyState
            title={t('scheduler.noPostsTitle', 'No posts recorded for {{platform}}', { platform })}
            description={t(
              'scheduler.noPostsDesc',
              'Upload historical post performance data via CSV or manual entry to discover your highest engagement posting hours.'
            )}
            action={
              <div className="flex gap-2">
                <Button onClick={() => navigate('/data/posts')}>
                  <Plus size={16} className="me-1.5" />
                  {t('posts.add', 'Add Post')}
                </Button>
                <Button variant="secondary" onClick={() => setDataMode('demo')}>
                  {t('common.tryDemoData', 'Try Demo Data')}
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <>
          {/* Best Windows Cards */}
          <BestWindowsCards
            recommendations={recommendations}
            onScheduleSlot={(rec) => handleOpenPlanModal({ weekday: rec.weekday, hour: rec.hour })}
          />

          {/* 7x24 Heatmap Grid */}
          <HeatmapGrid
            cells={cells}
            metricUsed={metricUsed}
            minSamplesPerSlot={sample?.minSamplesPerSlot || 5}
            startOnSaturday={startOnSaturday}
            onSelectSlot={(slot) => handleOpenPlanModal(slot)}
          />
        </>
      )}

      {/* Modal for adding planned post item */}
      {isModalOpen && (
        <ScheduleItemModal
          initialSlot={selectedSlot}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}

