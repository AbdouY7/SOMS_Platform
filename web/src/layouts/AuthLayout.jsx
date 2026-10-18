// src/layouts/AuthLayout.jsx
// Centered card layout for auth-related pages (password reset, etc.)
import { Outlet } from 'react-router-dom';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher.jsx';

export function AuthLayout() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>
      <Outlet />
    </div>
  );
}
