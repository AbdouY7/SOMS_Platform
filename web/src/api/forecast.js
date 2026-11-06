// src/api/forecast.js — Forecast & S-Curve Simulation API client
import apiClient from './client.js';

export const forecastApi = {
  /**
   * POST /api/forecast/simulate (live preview, no persistence)
   */
  simulate: (assumptions) =>
    apiClient.post('/forecast/simulate', assumptions).then((r) => r.data.data),

  /**
   * POST /api/forecast/simulations (save new scenario)
   */
  saveSimulation: (data) =>
    apiClient.post('/forecast/simulations', data).then((r) => r.data.data),

  /**
   * GET /api/forecast/simulations (list company scenarios)
   */
  listSimulations: (params = {}) =>
    apiClient.get('/forecast/simulations', { params }).then((r) => r.data.data),

  /**
   * GET /api/forecast/simulations/:id (get single scenario)
   */
  getSimulation: (id) =>
    apiClient.get(`/forecast/simulations/${id}`).then((r) => r.data.data),

  /**
   * PATCH /api/forecast/simulations/:id (update name and/or assumptions)
   */
  updateSimulation: (id, data) =>
    apiClient.patch(`/forecast/simulations/${id}`, data).then((r) => r.data.data),

  /**
   * DELETE /api/forecast/simulations/:id (soft delete / archive)
   */
  archiveSimulation: (id) =>
    apiClient.delete(`/forecast/simulations/${id}`).then((r) => r.data.data),

  /**
   * POST /api/forecast/compare (compare 2-4 scenarios)
   */
  compareSimulations: (ids) =>
    apiClient.post('/forecast/compare', { ids }).then((r) => r.data.data),

  /**
   * POST /api/forecast/calibrate (optional curve fit calibration)
   */
  calibrateCurve: (data) =>
    apiClient.post('/forecast/calibrate', data).then((r) => r.data.data),
};

