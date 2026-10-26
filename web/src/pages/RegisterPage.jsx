// src/pages/RegisterPage.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, Building2, User, Mail, Phone, Lock } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher.jsx';
import { Button } from '../components/ui/Button.jsx';
import apiClient from '../api/client.js';

const schema = z.object({
  companyName:        z.string().min(1, 'Required').max(150),
  registrationNumber: z.string().max(50).optional(),
  industry:           z.string().max(100).optional(),
  contactPhone:       z.string().max(30).optional(),
  applicantFullName:  z.string().min(1, 'Required').max(120),
  applicantEmail:     z.string().email('Invalid email'),
  password:           z.string().min(10, 'Minimum 10 characters'),
  confirmPassword:    z.string().min(1, 'Required'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

function Field({ label, id, error, type = 'text', Icon, register }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-300">{label}</label>
      <div className="relative">
        {Icon && <Icon size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" />}
        <input
          id={id}
          type={type}
          className={`w-full rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm text-white placeholder:text-slate-500
                      outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                      ${Icon ? 'ps-9 pe-4' : 'px-4'}`}
          {...register}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const submit = useMutation({
    mutationFn: (data) => apiClient.post('/public/company-requests', data),
    onSuccess: () => navigate('/register/success'),
    onError: (err) => {
      const code = err.response?.data?.error?.code;
      const msg  = err.response?.data?.error?.message;
      if (code === 'CONFLICT') toast.error(msg || t('common.conflict'));
      else toast.error(t('common.error'));
    },
  });

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
            <BarChart3 size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl">SOMS</span>
        </Link>
        <LanguageSwitcher />
      </header>

      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-2xl animate-fadeIn">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white">{t('register.title')}</h1>
              <p className="text-slate-400 text-sm mt-1">{t('register.subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit((d) => submit.mutate(d))} noValidate className="space-y-5">
              {/* Company info */}
              <div className="border-b border-white/10 pb-5">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Building2 size={14} /> {t('register.companyInfo')}
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label={t('company.name')} id="companyName" Icon={Building2}
                    error={errors.companyName?.message} register={register('companyName')} />
                  <Field label={t('company.registrationNumber')} id="registrationNumber"
                    error={errors.registrationNumber?.message} register={register('registrationNumber')} />
                  <Field label={t('company.industry')} id="industry"
                    error={errors.industry?.message} register={register('industry')} />
                  <Field label={t('company.phone')} id="contactPhone" Icon={Phone}
                    error={errors.contactPhone?.message} register={register('contactPhone')} />
                </div>
              </div>

              {/* Applicant info */}
              <div className="border-b border-white/10 pb-5">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <User size={14} /> {t('register.applicantInfo')}
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Field label={t('auth.fullName')} id="applicantFullName" Icon={User}
                      error={errors.applicantFullName?.message} register={register('applicantFullName')} />
                  </div>
                  <Field label={t('auth.email')} id="applicantEmail" type="email" Icon={Mail}
                    error={errors.applicantEmail?.message} register={register('applicantEmail')} />
                </div>
              </div>

              {/* Password */}
              <div>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Lock size={14} /> {t('auth.password')}
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label={t('auth.password')} id="password" type="password" Icon={Lock}
                    error={errors.password?.message} register={register('password')} />
                  <Field label={t('auth.changePassword.confirm')} id="confirmPassword" type="password" Icon={Lock}
                    error={errors.confirmPassword?.message} register={register('confirmPassword')} />
                </div>
              </div>

              <Button type="submit" variant="primary" size="lg" loading={submit.isPending}
                className="w-full" id="register-submit-btn">
                {t('register.submit')}
              </Button>

              <p className="text-center text-sm text-slate-400">
                {t('register.alreadyHaveAccount')}{' '}
                <Link to="/login" className="text-blue-400 hover:text-blue-300">{t('auth.login')}</Link>
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
