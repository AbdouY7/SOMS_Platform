// src/pages/LandingPage.jsx
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, Globe, TrendingUp, CalendarDays, LineChart, FileText, ArrowRight, Building2 } from 'lucide-react';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher.jsx';

const MODULES = [
  { Icon: BarChart3,   key: 'landing.modules.hub',       color: 'bg-blue-100 text-blue-700' },
  { Icon: Globe,       key: 'landing.modules.geo',       color: 'bg-emerald-100 text-emerald-700' },
  { Icon: TrendingUp,  key: 'landing.modules.growth',    color: 'bg-purple-100 text-purple-700' },
  { Icon: CalendarDays,key: 'landing.modules.scheduler', color: 'bg-orange-100 text-orange-700' },
  { Icon: LineChart,   key: 'landing.modules.forecast',  color: 'bg-rose-100 text-rose-700' },
  { Icon: FileText,    key: 'landing.modules.reports',   color: 'bg-sky-100 text-sky-700' },
];

export function LandingPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
      {/* Navbar */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
            <BarChart3 size={20} className="text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">SOMS</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link to="/login"
            className="px-4 py-2 rounded-lg border border-white/20 text-sm font-medium hover:bg-white/10 transition-colors">
            {t('auth.login')}
          </Link>
          <Link to="/register"
            className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium hover:bg-blue-500 transition-colors">
            {t('landing.requestAccess')}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-4xl mx-auto text-center px-4 pt-20 pb-16 animate-fadeIn">
          <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 rounded-full px-4 py-1.5 text-sm text-blue-300 mb-6">
            <Building2 size={14} />
            {t('landing.badge')}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent leading-tight">
            {t('landing.headline')}
          </h1>
          <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
            {t('landing.subheadline')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 font-semibold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20">
              {t('landing.requestAccess')} <ArrowRight size={18} />
            </Link>
            <Link to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 font-medium hover:bg-white/5 transition-colors">
              {t('auth.login')}
            </Link>
          </div>
        </section>

        {/* Module cards */}
        <section className="max-w-4xl mx-auto px-4 pb-20">
          <h2 className="text-center text-white/50 text-sm font-medium uppercase tracking-widest mb-8">
            {t('landing.modules.title')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {MODULES.map(({ Icon, key, color }) => (
              <div key={key}
                className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-colors backdrop-blur-sm">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                  <Icon size={20} />
                </div>
                <h3 className="font-semibold text-sm">{t(key)}</h3>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="text-center py-6 text-xs text-slate-600 border-t border-white/5">
        © {new Date().getFullYear()} SOMS · Social Marketing Services · Algeria
      </footer>
    </div>
  );
}
