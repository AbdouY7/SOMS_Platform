// src/api/system3.js
// Thin wrappers for System 3 API endpoints used by admin pages.
import apiClient from './client.js';

// ── Dashboard ──────────────────────────────────────────────────────────────────
export const dashboardApi = {
  get: () => apiClient.get('/admin/dashboard').then(r => r.data.data),
};

// ── Settings ───────────────────────────────────────────────────────────────────
export const settingsApi = {
  getAll: () => apiClient.get('/admin/settings').then(r => r.data.data),
  update: (key, value) => apiClient.patch(`/admin/settings/${key}`, { value }).then(r => r.data.data),
};

// ── Admin users ────────────────────────────────────────────────────────────────
export const adminUsersApi = {
  list:          (params) => apiClient.get('/admin/users', { params }).then(r => r.data),
  create:        (body)   => apiClient.post('/admin/users', body).then(r => r.data.data),
  update:        (id, body) => apiClient.patch(`/admin/users/${id}`, body).then(r => r.data.data),
  setStatus:     (id, isActive) => apiClient.patch(`/admin/users/${id}/status`, { isActive }).then(r => r.data.data),
  resetPassword: (id)     => apiClient.post(`/admin/users/${id}/reset-password`).then(r => r.data.data),
};

// ── Admin logs ─────────────────────────────────────────────────────────────────
export const adminLogsApi = {
  list: (params) => apiClient.get('/admin/activity-logs', { params }).then(r => r.data),
};

// ── Companies (used by AdminDemoDataPage) ──────────────────────────────────────
export const companiesApi = {
  list: () => apiClient.get('/admin/companies').then(r => r.data.data?.items ?? r.data.data ?? []),
};

// ── Shared error helper ───────────────────────────────────────────────────────
export function getErrorMessage(err) {
  return err?.response?.data?.error?.message
    || err?.message
    || 'An unexpected error occurred';
}
