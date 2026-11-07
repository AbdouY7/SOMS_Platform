// src/api/reports.js — Reports API client
import apiClient from './client.js';

export const reportsApi = {
  /**
   * GET /api/reports
   * @param {object} params - { type, dataMode, page, limit }
   */
  listReports: (params = {}) =>
    apiClient.get('/reports', { params }).then((r) => r.data),

  /**
   * GET /api/reports/:id
   * @param {string} id
   */
  getReport: (id) =>
    apiClient.get(`/reports/${id}`).then((r) => r.data.data),

  /**
   * POST /api/reports
   * @param {object} data - { type, title, start, end, filters, dataMode }
   */
  createReport: (data) =>
    apiClient.post('/reports', data).then((r) => r.data.data),

  /**
   * DELETE /api/reports/:id
   * @param {string} id
   */
  deleteReport: (id) =>
    apiClient.delete(`/reports/${id}`).then((r) => r.data.data),

  /**
   * Downloads CSV file directly using authenticated axios instance
   * @param {string} id
   * @param {string} [filename]
   */
  downloadCsv: async (id, filename = `report-${id}.csv`) => {
    const response = await apiClient.get(`/reports/${id}/export.csv`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};

