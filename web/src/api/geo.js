// src/api/geo.js — Geo analytics API client
import apiClient from './client.js';

export const geoApi = {
  /**
   * GET /api/analytics/geo
   * Returns aggregated metrics per wilaya.
   * @param {object} params - { metric, dateFrom, dateTo, dataMode }
   */
  list: (params = {}) =>
    apiClient.get('/analytics/geo', { params }).then((r) => r.data.data),

  /**
   * GET /api/analytics/geo/:wilayaCode
   * Returns full detail + trend series for one wilaya.
   * @param {string} code - 2-digit wilaya code e.g. "16"
   * @param {object} params - { metric, dateFrom, dateTo, dataMode }
   */
  detail: (code, params = {}) =>
    apiClient.get(`/analytics/geo/${code}`, { params }).then((r) => r.data.data),

  /**
   * GET /api/analytics/geo/compare
   * Returns side-by-side data for 2–4 wilayas.
   * @param {object} params - { codes, metric, dateFrom, dateTo, dataMode }
   */
  compare: (params = {}) =>
    apiClient.get('/analytics/geo/compare', { params }).then((r) => r.data.data),
};

