// src/features/reports/useReports.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '../../api/reports.js';

export function useReports(params = {}) {
  return useQuery({
    queryKey: ['reports', params],
    queryFn: () => reportsApi.listReports(params),
    staleTime: 30 * 1000,
  });
}

export function useReport(id) {
  return useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.getReport(id),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => reportsApi.createReport(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['hub-summary'] });
    },
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => reportsApi.deleteReport(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['hub-summary'] });
    },
  });
}

