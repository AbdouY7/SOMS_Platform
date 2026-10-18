// src/layouts/DashboardLayout.jsx
// Sidebar + topbar + content area. RTL-ready using logical CSS properties.
// System 1 will add AuthProvider/ProtectedRoute wrappers.
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Globe, TrendingUp, CalendarDays, LineChart,
  FileText, Upload, FileImage, Settings, User, LogOut,
  ChevronLeft, ChevronRight, Menu, X, Building2,
  Users, ClipboardList, Sliders, Database,
} from 'lucide-react';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher.jsx';
import { clsx } from 'clsx';

// Navigation items filtered by role (UX only — server enforces RBAC)
const NAV_COMPANY = [
  { to: '/hub',                key: 'nav.hub',       Icon: LayoutDashboard },
  { to: '/analytics/geo',      key: 'nav.geo',       Icon: Globe },
  { to: '/analytics/growth',   key: 'nav.growth',    Icon: TrendingUp },
  { to: '/analytics/scheduler',key: 'nav.scheduler', Icon: CalendarDays },
  { to: '/forecast',           key: 'nav.forecast',  Icon: LineChart },
  { to: '/reports',            key: 'nav.reports',   Icon: FileText },
  { to: '/data/imports',       key: 'nav.imports',   Icon: Upload },
  { to: '/data/posts',         key: 'nav.posts',     Icon: FileImage },
];

const NAV_ADMIN = [
  { to: '/admin/dashboard',  key: 'nav.admin.dashboard', Icon: LayoutDashboard },
  { to: '/admin/companies',  key: 'nav.admin.companies', Icon: Building2 },
  { to: '/admin/requests',   key: 'nav.admin.requests',  Icon: ClipboardList },
  { to: '/admin/users',      key: 'nav.admin.users',     Icon: Users },
  { to: '/admin/logs',       key: 'nav.admin.logs',      Icon: FileText },
  { to: '/admin/settings',   key: 'nav.admin.settings',  Icon: Sliders },
  { to: '/admin/demo-data',  key: 'nav.admin.demoData',  Icon: Database },
];

function NavItem({ to, icon: Icon, label, collapsed }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150',
          isActive
            ? 'bg-blue-600/20 text-blue-400 font-medium'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        )
      }
      title={collapsed ? label : undefined}
    >
      <Icon size={18} className="flex-shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

export function DashboardLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Placeholder: System 1 will provide real user from AuthProvider
  const user = null;
  const isAdmin = user?.role === 'super_admin';
  const navItems = isAdmin ? NAV_ADMIN : NAV_COMPANY;

  const isRtl = i18n.language === 'ar';
  const CollapseIcon = isRtl
    ? collapsed ? ChevronLeft : ChevronRight
    : collapsed ? ChevronRight : ChevronLeft;

  const sidebar = (
    <aside
      className={clsx(
        'flex flex-col h-full bg-slate-900 border-e border-slate-800 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={clsx('flex items-center px-4 py-5 border-b border-slate-800',
        collapsed ? 'justify-center' : 'gap-3')}>
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          S
        </div>
        {!collapsed && (
          <span className="text-white font-bold text-lg tracking-tight">OMS</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5" aria-label="Main navigation">
        {navItems.map(({ to, key, Icon }) => (
          <NavItem key={to} to={to} icon={Icon} label={t(key)} collapsed={collapsed} />
        ))}
      </nav>

      {/* Bottom: profile, settings, collapse */}
      <div className="p-2 space-y-0.5 border-t border-slate-800">
        <NavItem to="/profile" icon={User} label={t('nav.profile')} collapsed={collapsed} />
        {!isAdmin && (
          <NavItem to="/company/settings" icon={Settings} label={t('nav.settings')} collapsed={collapsed} />
        )}
        <button
          onClick={() => {/* System 1: logout */}}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-red-400 transition-colors"
          title={collapsed ? t('nav.logout') : undefined}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>{t('nav.logout')}</span>}
        </button>
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center justify-center py-2 text-slate-500 hover:text-slate-300 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <CollapseIcon size={16} />
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">{sidebar}</div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 h-full">{sidebar}</div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-4 md:px-6 h-14 bg-white border-b border-gray-200 flex-shrink-0">
          <button
            className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {/* System 1 will add user menu here */}
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
              ?
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
