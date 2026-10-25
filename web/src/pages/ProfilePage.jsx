// src/pages/ProfilePage.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { User, Lock, Shield } from 'lucide-react';
import { useAuth } from '../features/auth/AuthProvider.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Select } from '../components/ui/Select.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import apiClient from '../api/client.js';
import { applyLanguage } from '../i18n/index.js';

// ── Schemas ───────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  fullName: z.string().min(1, 'Name is required').max(120),
  preferredLanguage: z.enum(['ar', 'fr', 'en']),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password required'),
    newPassword: z.string().min(10, 'Min 10 characters'),
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'New password must differ from current',
    path: ['newPassword'],
  });

// ── Role badge variant ────────────────────────────────────────────────────────

const ROLE_VARIANT = {
  super_admin:   'danger',
  company_admin: 'primary',
  analyst:       'success',
  viewer:        'default',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, refreshUser, logout } = useAuth();
  const [tab, setTab] = useState('profile');

  // ── Profile form ──────────────────────────────────────────────────────────
  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName ?? '',
      preferredLanguage: user?.preferredLanguage ?? 'ar',
    },
  });

  const updateProfile = useMutation({
    mutationFn: (data) => apiClient.patch('/auth/me', data),
    onSuccess: async (res) => {
      await refreshUser();
      const lang = res.data.data.preferredLanguage;
      if (lang) {
        i18n.changeLanguage(lang);
        applyLanguage(lang);
      }
      toast.success('Profile updated');
    },
    onError: () => toast.error(t('common.error')),
  });

  // ── Password form ─────────────────────────────────────────────────────────
  const passwordForm = useForm({ resolver: zodResolver(passwordSchema) });

  const changePassword = useMutation({
    mutationFn: (data) =>
      apiClient.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    onSuccess: async () => {
      toast.success('Password changed. Please log in again.');
      await logout();
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message;
      toast.error(msg || t('common.error'));
    },
  });

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-2xl flex-shrink-0">
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full rounded-full object-cover" />
            : user.fullName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{user.fullName}</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
          <Badge variant={ROLE_VARIANT[user.role] ?? 'default'} className="mt-1">
            {user.role.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-1">
        {[
          { id: 'profile', label: t('nav.profile'), Icon: User },
          { id: 'password', label: t('auth.changePassword.title'), Icon: Lock },
          { id: 'permissions', label: 'Permissions', Icon: Shield },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px
              ${tab === id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ────────────────────────────────────────────────────── */}
      {tab === 'profile' && (
        <form
          onSubmit={profileForm.handleSubmit((d) => updateProfile.mutate(d))}
          className="space-y-5"
        >
          <Input
            label="Full Name"
            id="profile-full-name"
            error={profileForm.formState.errors.fullName?.message}
            {...profileForm.register('fullName')}
          />
          <Select
            label={t('common.language', { defaultValue: 'Language' })}
            id="profile-language"
            options={[
              { value: 'ar', label: 'العربية' },
              { value: 'fr', label: 'Français' },
              { value: 'en', label: 'English' },
            ]}
            error={profileForm.formState.errors.preferredLanguage?.message}
            {...profileForm.register('preferredLanguage')}
          />
          <Button
            type="submit"
            variant="primary"
            loading={updateProfile.isPending}
            id="profile-save-btn"
          >
            {t('common.save')}
          </Button>
        </form>
      )}

      {/* ── Password tab ───────────────────────────────────────────────────── */}
      {tab === 'password' && (
        <form
          onSubmit={passwordForm.handleSubmit((d) => changePassword.mutate(d))}
          className="space-y-5"
        >
          <Input
            label={t('auth.changePassword.current')}
            id="pw-current"
            type="password"
            autoComplete="current-password"
            error={passwordForm.formState.errors.currentPassword?.message}
            {...passwordForm.register('currentPassword')}
          />
          <Input
            label={t('auth.changePassword.new')}
            id="pw-new"
            type="password"
            autoComplete="new-password"
            error={passwordForm.formState.errors.newPassword?.message}
            {...passwordForm.register('newPassword')}
          />
          <Input
            label={t('auth.changePassword.confirm')}
            id="pw-confirm"
            type="password"
            autoComplete="new-password"
            error={passwordForm.formState.errors.confirmPassword?.message}
            {...passwordForm.register('confirmPassword')}
          />
          <Button
            type="submit"
            variant="danger"
            loading={changePassword.isPending}
            id="pw-change-btn"
          >
            {t('auth.changePassword.title')}
          </Button>
        </form>
      )}

      {/* ── Permissions tab ────────────────────────────────────────────────── */}
      {tab === 'permissions' && (
        <div className="space-y-2">
          {(user.permissions ?? []).length === 0
            ? <p className="text-sm text-gray-500">{t('common.noData')}</p>
            : (user.permissions ?? []).map((p) => (
                <div
                  key={p}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 text-sm text-gray-700"
                >
                  <Shield size={14} className="text-blue-500 flex-shrink-0" />
                  {p}
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
