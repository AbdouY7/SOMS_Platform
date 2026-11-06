// src/api/scheduler.js — Scheduler API client
import apiClient from './client.js';

export const schedulerApi = {
  /**
   * GET /api/analytics/scheduler
   * @param {object} params - { platform, start, end, contentType, dataMode, metric }
   */
  getAnalysis: (params = {}) =>
    apiClient.get('/analytics/scheduler', { params }).then((r) => r.data.data),

  /**
   * GET /api/schedule/items
   * @param {object} params - { start, end, platform, status }
   */
  listItems: (params = {}) =>
    apiClient.get('/schedule/items', { params }).then((r) => r.data.data),

  /**
   * POST /api/schedule/items
   * @param {object} data
   */
  createItem: (data) =>
    apiClient.post('/schedule/items', data).then((r) => r.data.data),

  /**
   * PATCH /api/schedule/items/:id
   * @param {string} id
   * @param {object} data
   */
  updateItem: (id, data) =>
    apiClient.patch(`/schedule/items/${id}`, data).then((r) => r.data.data),

  /**
   * DELETE /api/schedule/items/:id
   * @param {string} id
   */
  deleteItem: (id) =>
    apiClient.delete(`/schedule/items/${id}`).then((r) => r.data.data),
};

