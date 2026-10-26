// src/pages/RegisterSuccessPage.jsx
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, BarChart3, Clock } from 'lucide-react';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher.jsx';

export function RegisterSuccessPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <header className="flex items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
            <BarChart3 size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl">SOMS</span>
        </Link>
        <LanguageSwitcher />
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center animate-fadeIn">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-10 shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">{t('register.success.title')}</h1>
            <p className="text-slate-400 mb-6">{t('register.success.message')}</p>
            <div className="flex items-center gap-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 mb-8 text-left">
              <Clock size={18} className="text-blue-400 flex-shrink-0" />
              <p className="text-sm text-blue-300">{t('register.success.note')}</p>
            </div>
            <Link to="/login"
              className="inline-flex items-center justify-center w-full px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors">
              {t('auth.login')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
