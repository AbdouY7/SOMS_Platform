// src/pages/data/SchedulePlanPage.jsx — route: /schedule
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  Clock,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  Check,
  CalendarClock,
} from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ScheduleItemModal } from '../../components/scheduler/ScheduleItemModal.jsx';
import {
  useScheduleItems,
  useUpdateScheduleItem,
  useDeleteScheduleItem,
} from '../../features/scheduler/useScheduler.js';

export default function SchedulePlanPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Filters
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const { data: items = [], isLoading, isError } = useScheduleItems({
    platform: platformFilter || undefined,
    status: statusFilter || undefined,
  });

  const updateMutation = useUpdateScheduleItem();
  const deleteMutation = useDeleteScheduleItem();

  const handleStatusChange = async (id, newStatus) => {
    await updateMutation.mutateAsync({ id, data: { status: newStatus } });
  };

  const handleDelete = async (id) => {
    if (window.confirm(t('common.confirmDelete', 'Delete this planned item?'))) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const formatDateTime = (isoStr) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString(i18n.language === 'ar' ? 'ar-DZ' : 'fr-DZ', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="text-blue-600" size={20} />
            <h1 className="text-xl font-bold text-gray-900">{t('scheduler.planTitle', 'Editorial Schedule Plan')}</h1>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            {t('scheduler.planSubtitle', 'Organize and manage upcoming social publications across platforms.')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/analytics/scheduler')}
            className="gap-1.5"
          >
            <CalendarClock size={14} className="text-purple-600" />
            {t('scheduler.viewAnalytics', 'Timing Analytics')}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus size={14} />
            {t('scheduler.newPlanItem', 'Schedule Post')}
          </Button>
        </div>
      </div>

      {/* Internal Plan Guidance Notice */}
      <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900">
        <AlertCircle size={16} className="mt-0.5 shrink-0 text-blue-600" />
        <span>
          {t('scheduler.planDisclaimer', 'Internal planner only: SOMS does not publish automatically to Instagram, Facebook or other channels. Use this schedule to coordinate campaign dates and creatives with your marketing team.')}
        </span>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs shadow-xs">
        <div className="flex items-center gap-3">
          {/* Platform filter */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700"
          >
            <option value="">{t('common.allPlatforms', 'All Platforms')}</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="tiktok">TikTok</option>
            <option value="other">Other</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700"
          >
            <option value="">{t('common.allStatuses', 'All Statuses')}</option>
            <option value="planned">{t('scheduler.status.planned', 'Planned')}</option>
            <option value="done">{t('scheduler.status.done', 'Done / Published')}</option>
            <option value="cancelled">{t('scheduler.status.cancelled', 'Cancelled')}</option>
          </select>
        </div>

        <span className="text-gray-400 text-xs">
          {items.length} {t('scheduler.scheduledCount', 'scheduled posts')}
        </span>
      </div>

      {/* Items List */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : isError ? (
          <p className="p-6 text-center text-xs text-red-600">{t('common.error', 'Failed to load schedule')}</p>
        ) : items.length === 0 ? (
          <EmptyState
            title={t('scheduler.emptyPlanTitle', 'No posts scheduled')}
            description={t('scheduler.emptyPlanHint', 'Plan your next campaign posts by setting target publication dates and content briefs.')}
            action={
              <Button
                onClick={() => {
                  setEditingItem(null);
                  setIsModalOpen(true);
                }}
              >
                <Plus size={16} className="me-1.5" />
                {t('scheduler.newPlanItem', 'Schedule Post')}
              </Button>
            }
          />
        ) : (
          <table className="w-full text-start text-xs">
            <thead className="border-b border-gray-200 bg-gray-50/70 font-semibold text-gray-600">
              <tr>
                <th className="px-4 py-3 text-start">{t('scheduler.plannedFor', 'Planned For')}</th>
                <th className="px-4 py-3 text-start">{t('scheduler.platform', 'Platform')}</th>
                <th className="px-4 py-3 text-start">{t('scheduler.postTitle', 'Title & Brief')}</th>
                <th className="px-4 py-3 text-start">{t('scheduler.contentType', 'Type')}</th>
                <th className="px-4 py-3 text-center">{t('common.status', 'Status')}</th>
                <th className="px-4 py-3 text-end">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                  {/* Date & Time */}
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="text-gray-400" />
                      <span>{formatDateTime(item.plannedAt)}</span>
                    </div>
                  </td>

                  {/* Platform */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="capitalize font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md text-[11px]">
                      {item.platform}
                    </span>
                  </td>

                  {/* Title & Notes */}
                  <td className="px-4 py-3">
                    <div className="max-w-md">
                      <p className="font-bold text-gray-900">{item.title}</p>
                      {item.notes && <p className="text-gray-500 text-[11px] truncate mt-0.5">{item.notes}</p>}
                    </div>
                  </td>

                  {/* Content Type */}
                  <td className="px-4 py-3 whitespace-nowrap capitalize text-gray-500">
                    {item.contentType || '—'}
                  </td>

                  {/* Status Toggle Dropdown */}
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border-0 cursor-pointer ${
                        item.status === 'done'
                          ? 'bg-emerald-50 text-emerald-700'
                          : item.status === 'cancelled'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      <option value="planned">{t('scheduler.status.planned', 'Planned')}</option>
                      <option value="done">{t('scheduler.status.done', 'Done')}</option>
                      <option value="cancelled">{t('scheduler.status.cancelled', 'Cancelled')}</option>
                    </select>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-end whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setIsModalOpen(true);
                        }}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                        title={t('common.edit', 'Edit')}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                        title={t('common.delete', 'Delete')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <ScheduleItemModal
          initialData={editingItem}
          onClose={() => {
            setIsModalOpen(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}

