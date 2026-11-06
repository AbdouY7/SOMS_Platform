// src/features/forecast/useForecast.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { forecastApi } from '../../api/forecast.js';

export function useSimulations({ includeArchived = false } = {}) {
  return useQuery({
    queryKey: ['simulations', { includeArchived }],
    queryFn: () => forecastApi.listSimulations({ includeArchived }),
    staleTime: 30 * 1000,
  });
}

export function useSimulation(id) {
  return useQuery({
    queryKey: ['simulation', id],
    queryFn: () => forecastApi.getSimulation(id),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}

export function useSimulateLive() {
  return useMutation({
    mutationFn: (assumptions) => forecastApi.simulate(assumptions),
  });
}

export function useSaveSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => forecastApi.saveSimulation(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['simulations'] });
    },
  });
}

export function useUpdateSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => forecastApi.updateSimulation(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['simulations'] });
      qc.invalidateQueries({ queryKey: ['simulation', id] });
    },
  });
}

export function useArchiveSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => forecastApi.archiveSimulation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['simulations'] });
    },
  });
}

export function useCompareSimulations() {
  return useMutation({
    mutationFn: (ids) => forecastApi.compareSimulations(ids),
  });
}

export function useCalibrateCurve() {
  return useMutation({
    mutationFn: (data) => forecastApi.calibrateCurve(data),
  });
}

