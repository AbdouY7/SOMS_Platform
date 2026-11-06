// src/features/growth/useGrowth.js
import { useQuery } from '@tanstack/react-query';
import { growthApi } from '../../api/growth.js';

export function useGrowthSummary({
  start,
  end,
  granularity = 'month',
  metric = 'orders',
  dataMode = 'real',
}) {
  return useQuery({
    queryKey: ['growth-summary', { start, end, granularity, metric, dataMode }],
    queryFn: () => growthApi.summary({ start, end, granularity, metric, dataMode }),
    staleTime: 60 * 1000,
  });
}

export function useGrowthOpportunities({
  start,
  end,
  dataMode = 'real',
  weights,
}) {
  return useQuery({
    queryKey: ['growth-opportunities', { start, end, dataMode, weights }],
    queryFn: () => {
      const params = { start, end, dataMode };
      if (weights) {
        params.weights = JSON.stringify(weights);
      }
      return growthApi.opportunities(params);
    },
    staleTime: 60 * 1000,
  });
}

