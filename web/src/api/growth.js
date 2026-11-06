// src/api/growth.js — Growth analytics API client
import apiClient from './client.js';

export const growthApi = {
  /**
   * GET /api/analytics/growth/summary
   * @param {object} params - { start, end, granularity, metric, dataMode }
   */
  summary: (params = {}) =>
    apiClient.get('/analytics/growth/summary', { params }).then((r) => r.data.data),

  /**
   * GET /api/analytics/growth/opportunities
   * @param {object} params - { start, end, dataMode, weights }
   */
  opportunities: (params = {}) =>
    apiClient.get('/analytics/growth/opportunities', { params }).then((r) => r.data.data),
};

