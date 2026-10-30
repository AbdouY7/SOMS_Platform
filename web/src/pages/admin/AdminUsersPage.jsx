// src/pages/admin/AdminUsersPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Search, User, KeyRound, ToggleLeft, ToggleRight, Edit2, Copy, Check } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import apiClient from '../../api/client.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';

const ROLE_COLORS = { super_admin: 'primary', company_admin: 'info', analyst: 'warning', viewer: 'secondary' };

const userSchema = z.object({
  fullName:  z.string().min(1, 'Required'),
  email:     z.string().email(),
  password:  z.string().min(10, 'Min 10 characters').optional().or(z.literal('')),
  role:      z.enum(['super_admin','company_admin','analyst','viewer']),
  companyId: z.string().uuid().optional().or(z.literal('')),
});

function UserForm({ defaultValues, isEdit, companies, onSubmit, loading }) {
  const { t } = useTranslation();
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(isEdit
      ? userSchema.omit({ email: true, password: true })
      : userSchema.extend({ password: z.string().min(10, 'Min 10 characters') })),
    defaultValues,
  });
  const role = watch('role');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label={t('auth.fullName') + ' *'} id="uf-name" error={errors.fullName?.message} {...register('fullName')} />
      {!isEdit && <Input label={t('auth.email') + ' *'} id="uf-email" type="email" error={errors.email?.message} {...register('email')} />}
      {!isEdit && <Input label={t('auth.password') + ' *'} id="uf-pass" type="password" error={errors.password?.message} {...register('password')} />}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">{t('users.role')} *</label>
        <select {...register('role')} className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20">
          {['super_admin','company_admin','analyst','viewer'].map(r => (
            <option key={r} value={r}>{r.replace('_',' ')}</option>
          ))}
        </select>
        {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
      </div>
      {role !== 'super_admin' && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">{t('company.name')}</label>
          <select {...register('companyId')} className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">— Select company —</option>
            {companies?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <Button type="submit" variant="primary" loading={loading} className="w-full">{t('common.save')}</Button>
    </form>
  );
}

// One-time temp password dialog
function TempPasswordDialog({ password, onClose }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Modal open title={t('users.tempPassword')} onClose={onClose}>
      <p className="text-sm text-gray-600 mb-4">{t('users.tempPasswordNote')}</p>
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
        <code className="flex-1 text-sm font-mono text-gray-900">{password}</code>
        <button onClick={copy} className="p-1.5 text-gray-400 hover:text-gray-700">
          {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
        </button>
      </div>
      <Button variant="primary" className="w-full mt-4" onClick={onClose}>{t('common.close')}</Button>
    </Modal>
  );
}

export function AdminUsersPage() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [tempPassword, setTempPassword] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, page],
    queryFn: () => apiClient.get('/admin/users', { params: { search: search || undefined, page, limit: 20 } }).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: companiesData } = useQuery({
    queryKey: ['admin-companies-list'],
    queryFn: () => apiClient.get('/admin/companies', { params: { limit: 100 } }).then(r => r.data.data),
  });

  const inv = () => qc.invalidateQueries({ queryKey: ['admin-users'] });

  const create = useMutation({
    mutationFn: (d) => apiClient.post('/admin/users', d),
    onSuccess: () => { toast.success(t('users.created')); setShowCreate(false); inv(); },
    onError: (e) => toast.error(e.response?.data?.error?.message || t('common.error')),
  });

  const update = useMutation({
    mutationFn: ({ id, ...d }) => apiClient.patch(`/admin/users/${id}`, d),
    onSuccess: () => { toast.success(t('users.updated')); setEditTarget(null); inv(); },
    onError: (e) => toast.error(e.response?.data?.error?.message || t('common.error')),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, isActive }) => apiClient.patch(`/admin/users/${id}/status`, { isActive }),
    onSuccess: () => { toast.success(t('common.saved')); setToggleTarget(null); inv(); },
    onError: (e) => toast.error(e.response?.data?.error?.message || t('common.error')),
  });

  const resetPwd = useMutation({
    mutationFn: (id) => apiClient.post(`/admin/users/${id}/reset-password`),
    onSuccess: (r) => setTempPassword(r.data.data.tempPassword),
    onError: (e) => toast.error(e.response?.data?.error?.message || t('common.error')),
  });

  const items = data?.data ?? [];
  const meta  = data?.meta ?? {};

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{t('users.title')}</h1>
        <Button variant="primary" onClick={() => setShowCreate(true)} id="create-user-btn">
          <Plus size={16} /> {t('users.create')}
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={t('common.search')}
          className="w-full rounded-lg border border-gray-200 ps-9 pe-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={User} message={t('users.empty')} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[t('auth.fullName'), t('auth.email'), t('users.role'), t('company.name'), t('common.status'), ''].map(h => (
                  <th key={h} className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.fullName}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3"><Badge variant={ROLE_COLORS[u.role]}>{u.role.replace('_',' ')}</Badge></td>
                  <td className="px-4 py-3 text-gray-500">{u.company?.name || '—'}</td>
                  <td className="px-4 py-3"><Badge variant={u.isActive ? 'success' : 'danger'}>{u.isActive ? t('common.active') : t('common.inactive')}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditTarget(u)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title={t('common.edit')}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => resetPwd.mutate(u.id)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded" title={t('users.resetPassword')}>
                        <KeyRound size={14} />
                      </button>
                      <button
                        disabled={u.id === me?.id}
                        onClick={() => setToggleTarget(u)}
                        className={`p-1.5 rounded disabled:opacity-30 disabled:cursor-not-allowed ${u.isActive ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
                        title={u.isActive ? t('common.deactivate') : t('common.activate')}>
                        {u.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta.total > meta.limit && (
        <Pagination page={page} total={meta.total} limit={meta.limit} onChange={setPage} className="mt-4" />
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t('users.create')}>
        <UserForm companies={companiesData} onSubmit={(d) => create.mutate(d)} loading={create.isPending} />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={t('users.edit')}>
        {editTarget && (
          <UserForm isEdit companies={companiesData} defaultValues={{ fullName: editTarget.fullName, role: editTarget.role, companyId: editTarget.companyId ?? '' }}
            onSubmit={(d) => update.mutate({ id: editTarget.id, ...d })} loading={update.isPending} />
        )}
      </Modal>

      {toggleTarget && (
        <ConfirmDialog open
          title={toggleTarget.isActive ? t('users.deactivateTitle') : t('users.activateTitle')}
          message={toggleTarget.isActive ? t('users.deactivateWarning') : t('users.activateMessage')}
          variant={toggleTarget.isActive ? 'danger' : 'primary'}
          confirmLabel={toggleTarget.isActive ? t('common.deactivate') : t('common.activate')}
          onConfirm={() => setStatus.mutate({ id: toggleTarget.id, isActive: !toggleTarget.isActive })}
          onCancel={() => setToggleTarget(null)} />
      )}

      {tempPassword && <TempPasswordDialog password={tempPassword} onClose={() => setTempPassword(null)} />}
    </div>
  );
}
