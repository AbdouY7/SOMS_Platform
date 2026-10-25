// src/layouts/PublicLayout.jsx
// Thin wrapper for public pages — LoginPage controls its own full-screen layout.
import { Outlet } from 'react-router-dom';

export function PublicLayout() {
  return <Outlet />;
}
