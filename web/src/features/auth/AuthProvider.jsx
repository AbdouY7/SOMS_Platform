// src/features/auth/AuthProvider.jsx
// Keeps the access token in memory (never in localStorage).
// On mount, attempts a silent refresh to restore session.
// Registers window.__getAccessToken so the axios client can read it.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import apiClient from '../../api/client.js';
import { applyLanguage } from '../../i18n/index.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // null = not loaded yet
  const [ready, setReady] = useState(false);    // true once silent refresh attempted
  const accessTokenRef = useRef(null);

  // Register the getter so axios interceptor can read the token
  useEffect(() => {
    window.__getAccessToken = () => accessTokenRef.current;
    return () => { delete window.__getAccessToken; };
  }, []);

  // ── Silent refresh on mount ────────────────────────────────────────────────
  useEffect(() => {
    silentRefresh().finally(() => setReady(true));
  }, []);

  const silentRefresh = useCallback(async () => {
    try {
      const { data } = await apiClient.post('/auth/refresh');
      accessTokenRef.current = data.data.accessToken;
      const u = data.data.user;
      setUser(u);
      // Apply saved language preference
      if (u?.preferredLanguage) {
        applyLanguage(u.preferredLanguage);
      }
      return true;
    } catch {
      accessTokenRef.current = null;
      setUser(null);
      return false;
    }
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    accessTokenRef.current = data.data.accessToken;
    const u = data.data.user;
    setUser(u);
    if (u?.preferredLanguage) applyLanguage(u.preferredLanguage);
    return u;
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch { /* ignore */ }
    accessTokenRef.current = null;
    setUser(null);
  }, []);

  // ── Update local user cache after profile edits ────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/auth/me');
      setUser(data.data);
    } catch { /* ignore */ }
  }, []);

  const value = {
    user,
    ready,
    isAuthenticated: !!user,
    login,
    logout,
    silentRefresh,
    refreshUser,
    accessTokenRef,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
