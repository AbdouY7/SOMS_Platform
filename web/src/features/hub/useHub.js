// src/features/hub/useHub.js
import { useQuery } from '@tanstack/react-query';
import { hubApi } from '../../api/hub.js';

export function useHubSummary({ dataMode = 'real' } = {}) {
  return useQuery({
    queryKey: ['hub-summary', { dataMode }],
    queryFn: () => hubApi.getSummary({ dataMode }),
    staleTime: 30 * 1000,
  });
}

