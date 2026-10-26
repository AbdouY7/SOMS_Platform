// src/pages/company/CompanySettingsPage.jsx
// company_admin: edit own company profile and upload/replace logo.
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Upload, Building2, Image as ImageIcon } from 'lucide-react';
import apiClient from '../../api/client.js';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { useAuth } from '../../features/auth/AuthProvider.jsx';

const schema = z.object({
  name:     z.string().min(1, 'Required').max(150),
  industry: z.string().max(100).optional(),
  email:    z.string().email().optional().or(z.literal('')),
  phone:    z.string().max(30).optional(),
  address:  z.string().max(500).optional(),
});

export function CompanySettingsPage() {
  const { t } = useTranslation();
  const { refreshUser } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef(null);

  const { data: companyData, isLoading } = useQuery({
    queryKey: ['own-company'],
    queryFn: () => apiClient.get('/company').then(r => r.data.data),
  });

  const company = companyData;

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(schema),
    values: company ? {
      name: company.name ?? '',
      industry: company.industry ?? '',
      email: company.email ?? '',
      phone: company.phone ?? '',
      address: company.address ?? '',
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (d) => apiClient.patch('/company', d),
    onSuccess: () => {
      toast.success(t('company.updated'));
      qc.invalidateQueries({ queryKey: ['own-company'] });
      reset();
    },
    onError: (e) => toast.error(e.response?.data?.error?.message || t('common.error')),
  });

  const logoMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('image', file);
      return apiClient.post('/company/logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success(t('company.logoUpdated'));
      qc.invalidateQueries({ queryKey: ['own-company'] });
    },
    onError: (e) => toast.error(e.response?.data?.error?.message || t('common.error')),
  });

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (file) logoMutation.mutate(file);
  }

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      <h1 className="text-xl font-semibold text-gray-900 mb-8">{t('nav.settings')}</h1>

      {/* Logo section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-medium text-gray-700 mb-4 flex items-center gap-2">
          <ImageIcon size={16} /> {t('company.logo')}
        </h2>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 flex-shrink-0 overflow-hidden">
            {company?.logoUrl ? (
              <img src={company.logoUrl} alt="Company logo" className="w-full h-full object-contain" />
            ) : (
              <Building2 size={32} className="text-gray-300" />
            )}
          </div>
          <div>
            <Button variant="outline" onClick={() => fileRef.current?.click()} loading={logoMutation.isPending}
              id="upload-logo-btn">
              <Upload size={15} /> {t('company.uploadLogo')}
            </Button>
            <p className="text-xs text-gray-400 mt-1.5">JPEG, PNG or WebP · max {import.meta.env.VITE_MAX_UPLOAD_MB || 5} MB</p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
              onChange={onFileChange} className="hidden" aria-label="Upload logo" />
          </div>
        </div>
      </div>

      {/* Company info form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-medium text-gray-700 mb-5 flex items-center gap-2">
          <Building2 size={16} /> {t('company.info')}
        </h2>
        <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
          <Input label={`${t('company.name')} *`} id="cs-name" error={errors.name?.message} {...register('name')} />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label={t('company.industry')} id="cs-industry" error={errors.industry?.message} {...register('industry')} />
            <Input label={t('company.phone')} id="cs-phone" error={errors.phone?.message} {...register('phone')} />
            <Input label={t('auth.email')} id="cs-email" type="email" error={errors.email?.message} {...register('email')} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="cs-address" className="text-sm font-medium text-gray-700">{t('company.address')}</label>
            <textarea id="cs-address" rows={3} {...register('address')}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={updateMutation.isPending}
              disabled={!isDirty} id="cs-save-btn">
              {t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
