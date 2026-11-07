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
// System 4
import ImportsPage       from '../pages/data/ImportsPage.jsx';
import ImportWizardPage  from '../pages/data/ImportWizardPage.jsx';
import ImportDetailPage  from '../pages/data/ImportDetailPage.jsx';
import PostsPage         from '../pages/data/PostsPage.jsx';
import AdminDemoDataPage from '../pages/admin/AdminDemoDataPage.jsx';
// System 5
import GeoAnalyticsPage  from '../pages/data/GeoAnalyticsPage.jsx';
// System 6
import GrowthAnalyticsPage from '../pages/data/GrowthAnalyticsPage.jsx';
// System 7
import SchedulerPage    from '../pages/data/SchedulerPage.jsx';
import SchedulePlanPage from '../pages/data/SchedulePlanPage.jsx';
// System 8
import ForecastPage from '../pages/data/ForecastPage.jsx';
import ForecastSimulatorPage from '../pages/data/ForecastSimulatorPage.jsx';
import ForecastComparePage from '../pages/data/ForecastComparePage.jsx';
// System 9
import HubPage from '../pages/data/HubPage.jsx';
import ReportsPage from '../pages/data/ReportsPage.jsx';
import ReportWizardPage from '../pages/data/ReportWizardPage.jsx';
import ReportViewerPage from '../pages/data/ReportViewerPage.jsx';

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
          { path: '/hub',                  element: <RoleGuard roles={COMPANY}><HubPage /></RoleGuard> },
          { path: '/analytics/geo',        element: <RoleGuard roles={ALL}><GeoAnalyticsPage /></RoleGuard> },
          { path: '/analytics/growth',     element: <RoleGuard roles={ALL}><GrowthAnalyticsPage /></RoleGuard> },
          { path: '/analytics/scheduler',  element: <RoleGuard roles={ALL}><SchedulerPage /></RoleGuard> },
          { path: '/schedule',             element: <RoleGuard roles={COMPANY}><SchedulePlanPage /></RoleGuard> },
          { path: '/forecast',             element: <RoleGuard roles={ALL}><ForecastPage /></RoleGuard> },
          { path: '/forecast/new',         element: <RoleGuard roles={['company_admin', 'analyst', ...SUPER]}><ForecastSimulatorPage /></RoleGuard> },
          { path: '/forecast/compare',     element: <RoleGuard roles={ALL}><ForecastComparePage /></RoleGuard> },
          { path: '/forecast/:id',         element: <RoleGuard roles={ALL}><ForecastSimulatorPage /></RoleGuard> },
          { path: '/reports',              element: <RoleGuard roles={ALL}><ReportsPage /></RoleGuard> },
          { path: '/reports/new',          element: <RoleGuard roles={['company_admin', 'analyst', ...SUPER]}><ReportWizardPage /></RoleGuard> },
          { path: '/reports/:id',          element: <RoleGuard roles={ALL}><ReportViewerPage /></RoleGuard> },
          { path: '/data/imports',         element: <RoleGuard roles={COMPANY}><ImportsPage /></RoleGuard> },
          { path: '/data/imports/new',      element: <RoleGuard roles={COMPANY}><ImportWizardPage /></RoleGuard> },
          { path: '/data/imports/:id',      element: <RoleGuard roles={COMPANY}><ImportDetailPage /></RoleGuard> },
          { path: '/data/posts',            element: <RoleGuard roles={COMPANY}><PostsPage /></RoleGuard> },
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
          { path: '/admin/demo-data',      element: <RoleGuard roles={SUPER}><AdminDemoDataPage /></RoleGuard> },
        ],
      },
    ],
  },

  // ── Error pages ────────────────────────────────────────────────────────────
  { path: '/403', element: <Forbidden /> },
  { path: '*',    element: <NotFound /> },
]);
