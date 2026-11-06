// src/features/scheduler/useScheduler.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulerApi } from '../../api/scheduler.js';

export function useSchedulerAnalysis({
  platform = 'instagram',
  start,
  end,
  contentType,
  dataMode = 'real',
  metric = 'auto',
}) {
  return useQuery({
    queryKey: ['scheduler-analysis', { platform, start, end, contentType, dataMode, metric }],
    queryFn: () => schedulerApi.getAnalysis({ platform, start, end, contentType, dataMode, metric }),
    staleTime: 60 * 1000,
    enabled: Boolean(platform),
  });
}

export function useScheduleItems({ start, end, platform, status } = {}) {
  return useQuery({
    queryKey: ['schedule-items', { start, end, platform, status }],
    queryFn: () => schedulerApi.listItems({ start, end, platform, status }),
    staleTime: 30 * 1000,
  });
}

export function useCreateScheduleItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => schedulerApi.createItem(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-items'] });
    },
  });
}

export function useUpdateScheduleItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => schedulerApi.updateItem(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-items'] });
    },
  });
}

export function useDeleteScheduleItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => schedulerApi.deleteItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-items'] });
    },
  });
}

