// src/api/client.js
// Axios instance with base URL and interceptor placeholders.
// The 401 interceptor (silent refresh) is completed in System 1.
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,          // send httpOnly refresh-token cookie
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach access token from memory (set by AuthProvider in System 1)
apiClient.interceptors.request.use((config) => {
  // AuthProvider will register this via setAccessTokenGetter()
  const token = typeof window.__getAccessToken === 'function'
    ? window.__getAccessToken()
    : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor placeholder (completed in System 1 with silent refresh + retry)
apiClient.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

export default apiClient;
