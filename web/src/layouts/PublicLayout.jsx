// src/layouts/PublicLayout.jsx
// Used by landing page, register, login — minimal chrome with language switcher
import { Outlet } from 'react-router-dom';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher.jsx';

export function PublicLayout() {
  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-white font-bold text-xl tracking-tight">
          <span className="text-blue-400">S</span>OMS
        </span>
        <LanguageSwitcher />
      </header>

      {/* Page content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Outlet />
      </main>
    </div>
  );
}
