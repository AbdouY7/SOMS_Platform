// src/components/scheduler/ScheduleItemModal.jsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { useCreateScheduleItem, useUpdateScheduleItem } from '../../features/scheduler/useScheduler.js';

export function ScheduleItemModal({
  initialData = null,
  initialSlot = null,
  onClose,
}) {
  const { t } = useTranslation();
  const isEditing = Boolean(initialData?.id);

  const createMutation = useCreateScheduleItem();
  const updateMutation = useUpdateScheduleItem();

  // Calculate default planned datetime if initialSlot provided
  const getDefaultDate = () => {
    if (initialData?.plannedAt) {
      return new Date(initialData.plannedAt).toISOString().slice(0, 16);
    }
    const d = new Date();
    d.setDate(d.getDate() + 1);
    if (initialSlot && initialSlot.hour !== undefined) {
      d.setHours(initialSlot.hour, 0, 0, 0);
    } else {
      d.setHours(14, 0, 0, 0);
    }
    return d.toISOString().slice(0, 16);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      platform: initialData?.platform || initialSlot?.platform || 'instagram',
      plannedAt: getDefaultDate(),
      title: initialData?.title || '',
      contentType: initialData?.contentType || 'image',
      notes: initialData?.notes || '',
      status: initialData?.status || 'planned',
    },
  });

  const onSubmit = async (values) => {
    const payload = {
      platform: values.platform,
      plannedAt: new Date(values.plannedAt).toISOString(),
      title: values.title,
      contentType: values.contentType || null,
      notes: values.notes || null,
      status: values.status,
    };

    if (isEditing) {
      await updateMutation.mutateAsync({ id: initialData.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onClose();
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-blue-600" />
            <h3 className="text-base font-bold text-gray-900">
              {isEditing ? t('scheduler.editPlanItem', 'Edit Planned Post') : t('scheduler.newPlanItem', 'Schedule New Post')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          {/* Internal plan notice */}
          <div className="flex items-start gap-2 rounded-lg bg-blue-50/70 p-3 text-xs text-blue-800 border border-blue-100">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-blue-600" />
            <span>
              {t('scheduler.planNotice', 'This is an internal editorial plan for your marketing team. The platform never publishes automatically.')}
            </span>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {t('scheduler.postTitle', 'Post Title / Brief')} *
            </label>
            <input
              type="text"
              {...register('title', { required: 'Title is required', maxLength: 150 })}
              placeholder={t('scheduler.titlePlaceholder', 'e.g. Summer Skincare Routine Reel')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
          </div>

          {/* Platform and Content Type */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t('scheduler.platform', 'Platform')} *
              </label>
              <select
                {...register('platform', { required: true })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="tiktok">TikTok</option>
                <option value="other">{t('common.other', 'Other')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t('scheduler.contentType', 'Content Type')}
              </label>
              <select
                {...register('contentType')}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="reel">Reel</option>
                <option value="carousel">Carousel</option>
                <option value="story">Story</option>
                <option value="text">Text</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Planned At & Status */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t('scheduler.plannedDateTime', 'Planned Date & Time')} *
              </label>
              <input
                type="datetime-local"
                {...register('plannedAt', { required: true })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t('common.status', 'Status')}
              </label>
              <select
                {...register('status')}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="planned">{t('scheduler.status.planned', 'Planned')}</option>
                <option value="done">{t('scheduler.status.done', 'Done / Published')}</option>
                <option value="cancelled">{t('scheduler.status.cancelled', 'Cancelled')}</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {t('scheduler.notes', 'Notes & Creative Guidelines (optional)')}
            </label>
            <textarea
              rows={3}
              {...register('notes')}
              placeholder={t('scheduler.notesPlaceholder', 'Include caption drafts, hashtags or influencer mentions...')}
              className="w-full rounded-lg border border-gray-300 p-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <Button variant="secondary" size="sm" type="button" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={isLoading}>
              {isEditing ? t('common.save', 'Save Changes') : t('scheduler.createPlanItem', 'Add to Plan')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

