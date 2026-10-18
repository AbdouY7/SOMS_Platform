// src/app/router.jsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout.jsx';
import { AuthLayout } from '../layouts/AuthLayout.jsx';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { NotFound } from '../pages/NotFound.jsx';
import { Forbidden } from '../pages/Forbidden.jsx';
import { HubPlaceholder } from '../pages/HubPlaceholder.jsx';

// System 1 will add: LoginPage, ProfilePage, ProtectedRoute, RoleGuard
// System 2 will add: RegisterPage, AdminRequestsPage, etc.

export const router = createBrowserRouter([
  // ── Public routes (landing, login, register)
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <Navigate to="/hub" replace /> },
      // System 1: { path: '/login', element: <LoginPage /> }
      // System 2: { path: '/register', element: <RegisterPage /> }
    ],
  },

  // ── Auth-only routes (password reset)
  {
    element: <AuthLayout />,
    children: [
      // System 1: { path: '/forgot-password', element: <ForgotPasswordPage /> }
      // System 1: { path: '/reset-password/:token', element: <ResetPasswordPage /> }
    ],
  },

  // ── Dashboard routes (requires auth)
  {
    element: <DashboardLayout />,
    children: [
      { path: '/hub',                  element: <HubPlaceholder /> },
      { path: '/analytics/geo',        element: <HubPlaceholder /> },
      { path: '/analytics/growth',     element: <HubPlaceholder /> },
      { path: '/analytics/scheduler',  element: <HubPlaceholder /> },
      { path: '/forecast',             element: <HubPlaceholder /> },
      { path: '/reports',              element: <HubPlaceholder /> },
      { path: '/data/imports',         element: <HubPlaceholder /> },
      { path: '/data/posts',           element: <HubPlaceholder /> },
      { path: '/profile',              element: <HubPlaceholder /> },
      { path: '/company/settings',     element: <HubPlaceholder /> },
      { path: '/admin/dashboard',      element: <HubPlaceholder /> },
      { path: '/admin/companies',      element: <HubPlaceholder /> },
      { path: '/admin/requests',       element: <HubPlaceholder /> },
      { path: '/admin/users',          element: <HubPlaceholder /> },
      { path: '/admin/logs',           element: <HubPlaceholder /> },
      { path: '/admin/settings',       element: <HubPlaceholder /> },
      { path: '/admin/demo-data',      element: <HubPlaceholder /> },
      { path: '/schedule',             element: <HubPlaceholder /> },
    ],
  },

  // ── Error pages
  { path: '/403', element: <Forbidden /> },
  { path: '*',    element: <NotFound /> },
]);
