// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, LogIn, BarChart3 } from 'lucide-react';
import { useAuth } from '../features/auth/AuthProvider.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher.jsx';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/hub';

  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values) {
    setServerError('');
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'UNAUTHENTICATED') {
        const msg = err.response?.data?.error?.message || '';
        if (msg.toLowerCase().includes('lock')) {
          setServerError(t('auth.accountLocked'));
        } else {
          setServerError(t('auth.invalidCredentials'));
        }
      } else {
        setServerError(t('common.error'));
      }
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
            <BarChart3 size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">SOMS</span>
        </div>
        <LanguageSwitcher />
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fadeIn">

          {/* Card */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-white mb-1">{t('auth.login')}</h1>
              <p className="text-slate-400 text-sm">Social Marketing Services Platform</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              {/* Server error */}
              {serverError && (
                <div
                  role="alert"
                  className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-300 animate-fadeIn"
                >
                  {serverError}
                </div>
              )}

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-sm font-medium text-slate-300">
                  {t('auth.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500
                             outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="email@example.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p role="alert" className="text-xs text-red-400">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <label htmlFor="password" className="text-sm font-medium text-slate-300">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 pe-11 text-sm text-white placeholder:text-slate-500
                               outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p role="alert" className="text-xs text-red-400">{errors.password.message}</p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                className="w-full mt-2"
                id="login-submit-btn"
              >
                <LogIn size={18} />
                {t('auth.login')}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-600 mt-6">
            © {new Date().getFullYear()} SOMS · Graduation Project · Algeria
          </p>
        </div>
      </main>
    </div>
  );
}
