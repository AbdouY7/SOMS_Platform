// src/app/router.jsx
import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout.jsx';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { ProtectedRoute } from '../features/auth/ProtectedRoute.jsx';
import { RoleGuard } from '../features/auth/RoleGuard.jsx';
import { NotFound } from '../pages/NotFound.jsx';
import { Forbidden } from '../pages/Forbidden.jsx';
import { LandingPage } from '../pages/LandingPage.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { RegisterPage } from '../pages/RegisterPage.jsx';
import { RegisterSuccessPage } from '../pages/RegisterSuccessPage.jsx';
import { ProfilePage } from '../pages/ProfilePage.jsx';
import { HubPlaceholder } from '../pages/HubPlaceholder.jsx';
// System 2
import { AdminRequestsPage } from '../pages/admin/AdminRequestsPage.jsx';
import { AdminCompaniesPage } from '../pages/admin/AdminCompaniesPage.jsx';
import { CompanySettingsPage } from '../pages/company/CompanySettingsPage.jsx';
// System 3
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage.jsx';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage.jsx';
import { AdminLogsPage } from '../pages/admin/AdminLogsPage.jsx';
import { AdminSettingsPage } from '../pages/admin/AdminSettingsPage.jsx';
import { CompanyUsersPage } from '../pages/company/CompanyUsersPage.jsx';
import { CompanyActivityPage } from '../pages/company/CompanyActivityPage.jsx';

const SUPER   = ['super_admin'];
const COMPANY = ['company_admin', 'analyst', 'viewer'];
const ALL     = [...SUPER, ...COMPANY];

export const router = createBrowserRouter([
  // ── Public routes ──────────────────────────────────────────────────────────
  {
    element: <PublicLayout />,
    children: [
      { path: '/',                 element: <LandingPage /> },
      { path: '/login',            element: <LoginPage /> },
      { path: '/register',         element: <RegisterPage /> },
      { path: '/register/success', element: <RegisterSuccessPage /> },
    ],
  },

  // ── Protected dashboard routes ─────────────────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          // Company analytics routes
          { path: '/hub',                  element: <RoleGuard roles={COMPANY}><HubPlaceholder /></RoleGuard> },
          { path: '/analytics/geo',        element: <RoleGuard roles={ALL}><HubPlaceholder /></RoleGuard> },
          { path: '/analytics/growth',     element: <RoleGuard roles={ALL}><HubPlaceholder /></RoleGuard> },
          { path: '/analytics/scheduler',  element: <RoleGuard roles={ALL}><HubPlaceholder /></RoleGuard> },
          { path: '/forecast',             element: <RoleGuard roles={ALL}><HubPlaceholder /></RoleGuard> },
          { path: '/reports',              element: <RoleGuard roles={ALL}><HubPlaceholder /></RoleGuard> },
          { path: '/data/imports',         element: <RoleGuard roles={COMPANY}><HubPlaceholder /></RoleGuard> },
          { path: '/data/posts',           element: <RoleGuard roles={COMPANY}><HubPlaceholder /></RoleGuard> },
          // Company management (System 2 & 3)
          { path: '/company/settings',     element: <RoleGuard roles={['company_admin']}><CompanySettingsPage /></RoleGuard> },
          { path: '/company/users',        element: <RoleGuard roles={['company_admin']}><CompanyUsersPage /></RoleGuard> },
          { path: '/company/activity',     element: <RoleGuard roles={COMPANY}><CompanyActivityPage /></RoleGuard> },
          // Profile (all authenticated)
          { path: '/profile',              element: <ProfilePage /> },
          // Super admin routes (System 2 & 3)
          { path: '/admin/dashboard',      element: <RoleGuard roles={SUPER}><AdminDashboardPage /></RoleGuard> },
          { path: '/admin/companies',      element: <RoleGuard roles={SUPER}><AdminCompaniesPage /></RoleGuard> },
          { path: '/admin/requests',       element: <RoleGuard roles={SUPER}><AdminRequestsPage /></RoleGuard> },
          { path: '/admin/users',          element: <RoleGuard roles={SUPER}><AdminUsersPage /></RoleGuard> },
          { path: '/admin/logs',           element: <RoleGuard roles={SUPER}><AdminLogsPage /></RoleGuard> },
          { path: '/admin/settings',       element: <RoleGuard roles={SUPER}><AdminSettingsPage /></RoleGuard> },
          { path: '/admin/demo-data',      element: <RoleGuard roles={SUPER}><HubPlaceholder /></RoleGuard> },
        ],
      },
    ],
  },

  // ── Error pages ────────────────────────────────────────────────────────────
  { path: '/403', element: <Forbidden /> },
  { path: '*',    element: <NotFound /> },
]);
