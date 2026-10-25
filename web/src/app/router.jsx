// src/app/router.jsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout.jsx';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { ProtectedRoute } from '../features/auth/ProtectedRoute.jsx';
import { RoleGuard } from '../features/auth/RoleGuard.jsx';
import { NotFound } from '../pages/NotFound.jsx';
import { Forbidden } from '../pages/Forbidden.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { ProfilePage } from '../pages/ProfilePage.jsx';
import { HubPlaceholder } from '../pages/HubPlaceholder.jsx';

const SUPER    = ['super_admin'];
const COMPANY  = ['company_admin', 'analyst', 'viewer'];
const ALL      = [...SUPER, ...COMPANY];

export const router = createBrowserRouter([
  // ── Public routes ──────────────────────────────────────────────────────────
  {
    element: <PublicLayout />,
    children: [
      { path: '/',      element: <Navigate to="/login" replace /> },
      { path: '/login', element: <LoginPage /> },
      // System 2: register, request-access
    ],
  },

  // ── Protected dashboard routes ─────────────────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          // Company routes
          { path: '/hub',                  element: <RoleGuard roles={COMPANY}><HubPlaceholder /></RoleGuard> },
          { path: '/analytics/geo',        element: <RoleGuard roles={ALL}><HubPlaceholder /></RoleGuard> },
          { path: '/analytics/growth',     element: <RoleGuard roles={ALL}><HubPlaceholder /></RoleGuard> },
          { path: '/analytics/scheduler',  element: <RoleGuard roles={ALL}><HubPlaceholder /></RoleGuard> },
          { path: '/forecast',             element: <RoleGuard roles={ALL}><HubPlaceholder /></RoleGuard> },
          { path: '/reports',              element: <RoleGuard roles={ALL}><HubPlaceholder /></RoleGuard> },
          { path: '/data/imports',         element: <RoleGuard roles={COMPANY}><HubPlaceholder /></RoleGuard> },
          { path: '/data/posts',           element: <RoleGuard roles={COMPANY}><HubPlaceholder /></RoleGuard> },
          { path: '/company/settings',     element: <RoleGuard roles={['company_admin']}><HubPlaceholder /></RoleGuard> },

          // Profile (all authenticated users)
          { path: '/profile', element: <ProfilePage /> },

          // Super admin routes
          { path: '/admin/dashboard',  element: <RoleGuard roles={SUPER}><HubPlaceholder /></RoleGuard> },
          { path: '/admin/companies',  element: <RoleGuard roles={SUPER}><HubPlaceholder /></RoleGuard> },
          { path: '/admin/requests',   element: <RoleGuard roles={SUPER}><HubPlaceholder /></RoleGuard> },
          { path: '/admin/users',      element: <RoleGuard roles={SUPER}><HubPlaceholder /></RoleGuard> },
          { path: '/admin/logs',       element: <RoleGuard roles={SUPER}><HubPlaceholder /></RoleGuard> },
          { path: '/admin/settings',   element: <RoleGuard roles={SUPER}><HubPlaceholder /></RoleGuard> },
          { path: '/admin/demo-data',  element: <RoleGuard roles={SUPER}><HubPlaceholder /></RoleGuard> },

          // Default redirect
          { path: '/',  element: <Navigate to="/hub" replace /> },
        ],
      },
    ],
  },

  // ── Error pages ────────────────────────────────────────────────────────────
  { path: '/403', element: <Forbidden /> },
  { path: '*',    element: <NotFound /> },
]);
