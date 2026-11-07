// src/api/hub.js — SOMS Hub landing API client
import apiClient from './client.js';

export const hubApi = {
  /**
   * GET /api/hub/summary
   * @param {object} params - { dataMode: 'real' | 'demo' }
   */
  getSummary: (params = {}) =>
    apiClient.get('/hub/summary', { params }).then((r) => r.data.data),
};

