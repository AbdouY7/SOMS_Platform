// src/features/auth/ProtectedRoute.jsx
// Redirects to /login if not authenticated.
// Shows a full-page spinner while the silent refresh is in progress.

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';

export function ProtectedRoute() {
  const { isAuthenticated, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <PageSpinner />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
