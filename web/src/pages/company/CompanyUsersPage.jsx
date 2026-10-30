// src/pages/company/CompanyUsersPage.jsx
// company_admin: manages users of their own company only.
// Reuses the same design as AdminUsersPage but with a scoped API and restricted role options.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Search, User, ToggleLeft, ToggleRight, Edit2 } from 'lucide-react';
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

const ROLE_COLORS = { company_admin: 'info', analyst: 'warning', viewer: 'secondary' };
const COMPANY_ROLES = ['company_admin', 'analyst', 'viewer'];

const companyUserSchema = z.object({
  fullName: z.string().min(1, 'Required'),
  email:    z.string().email(),
  password: z.string().min(10, 'Min 10 characters'),
  role:     z.enum(['company_admin', 'analyst', 'viewer']),
});

const editCompanyUserSchema = z.object({
  fullName: z.string().min(1, 'Required').optional(),
  role:     z.enum(['company_admin', 'analyst', 'viewer']).optional(),
});

function CompanyUserForm({ defaultValues, isEdit, onSubmit, loading }) {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(isEdit ? editCompanyUserSchema : companyUserSchema),
    defaultValues,
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label={t('auth.fullName') + ' *'} id="cuf-name" error={errors.fullName?.message} {...register('fullName')} />
      {!isEdit && <>
        <Input label={t('auth.email') + ' *'} id="cuf-email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label={t('auth.password') + ' *'} id="cuf-pass" type="password" error={errors.password?.message} {...register('password')} />
      </>}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">{t('users.role')} *</label>
        <select {...register('role')} className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20">
          {COMPANY_ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
        </select>
        {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
      </div>
      <Button type="submit" variant="primary" loading={loading} className="w-full">{t('common.save')}</Button>
    </form>
  );
}

export function CompanyUsersPage() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['company-users', search, page],
    queryFn: () => apiClient.get('/company/users', { params: { search: search || undefined, page, limit: 20 } }).then(r => r.data),
    keepPreviousData: true,
  });

  const inv = () => qc.invalidateQueries({ queryKey: ['company-users'] });

  const create = useMutation({
    mutationFn: (d) => apiClient.post('/company/users', d),
    onSuccess: () => { toast.success(t('users.created')); setShowCreate(false); inv(); },
    onError: (e) => toast.error(e.response?.data?.error?.message || t('common.error')),
  });

  const update = useMutation({
    mutationFn: ({ id, ...d }) => apiClient.patch(`/company/users/${id}`, d),
    onSuccess: () => { toast.success(t('users.updated')); setEditTarget(null); inv(); },
    onError: (e) => toast.error(e.response?.data?.error?.message || t('common.error')),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, isActive }) => apiClient.patch(`/company/users/${id}/status`, { isActive }),
    onSuccess: () => { toast.success(t('common.saved')); setToggleTarget(null); inv(); },
    onError: (e) => toast.error(e.response?.data?.error?.message || t('common.error')),
  });

  const items = data?.data ?? [];
  const meta  = data?.meta ?? {};

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{t('users.title')}</h1>
        <Button variant="primary" onClick={() => setShowCreate(true)} id="create-company-user-btn">
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
                {[t('auth.fullName'), t('auth.email'), t('users.role'), t('common.status'), ''].map(h => (
                  <th key={h} className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.fullName}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3"><Badge variant={ROLE_COLORS[u.role] ?? 'secondary'}>{u.role.replace('_',' ')}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={u.isActive ? 'success' : 'danger'}>{u.isActive ? t('common.active') : t('common.inactive')}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditTarget(u)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                        <Edit2 size={14} />
                      </button>
                      <button
                        disabled={u.id === me?.id}
                        onClick={() => setToggleTarget(u)}
                        className={`p-1.5 rounded disabled:opacity-30 disabled:cursor-not-allowed ${u.isActive ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}>
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
        <CompanyUserForm onSubmit={(d) => create.mutate(d)} loading={create.isPending} />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={t('users.edit')}>
        {editTarget && (
          <CompanyUserForm isEdit defaultValues={{ fullName: editTarget.fullName, role: editTarget.role }}
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
    </div>
  );
}
