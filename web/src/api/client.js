// src/api/client.js
// Axios instance with base URL, access token injection, and 401 silent-refresh + retry.
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,          // send httpOnly refresh-token cookie
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach access token from memory ──────────────────────
apiClient.interceptors.request.use((config) => {
  const token = typeof window.__getAccessToken === 'function'
    ? window.__getAccessToken()
    : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: 401 → silent refresh → retry once ──────────────────
let isRefreshing = false;
let refreshQueue = [];                 // pending requests during refresh

function processQueue(error, token = null) {
  refreshQueue.forEach((cb) => {
    if (error) cb.reject(error);
    else cb.resolve(token);
  });
  refreshQueue = [];
}

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // Only intercept 401s, skip refresh endpoint itself to avoid loops
    if (
      err.response?.status === 401 &&
      !original._retried &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        // Queue the request until refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        });
      }

      original._retried = true;
      isRefreshing = true;

      try {
        const { data } = await apiClient.post('/auth/refresh');
        const newToken = data.data.accessToken;

        // Update the in-memory token via the registered setter
        if (typeof window.__setAccessToken === 'function') {
          window.__setAccessToken(newToken);
        }

        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        // Dispatch a custom event so AuthProvider can clear user state
        window.dispatchEvent(new Event('auth:session-expired'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default apiClient;
