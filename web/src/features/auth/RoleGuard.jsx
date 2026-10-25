// src/features/auth/RoleGuard.jsx
// Renders children only if the current user has one of the allowed roles.
// Shows 403 page otherwise. Must be inside ProtectedRoute.

import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider.jsx';

export function RoleGuard({ roles, children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (!roles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return children;
}
