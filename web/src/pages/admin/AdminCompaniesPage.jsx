// src/pages/admin/AdminCompaniesPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Search, Building2, Users, ToggleLeft, ToggleRight, Edit2 } from 'lucide-react';
import apiClient from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';

const companySchema = z.object({
  name:               z.string().min(1, 'Required').max(150),
  registrationNumber: z.string().max(50).optional(),
  industry:           z.string().max(100).optional(),
  email:              z.string().email().optional().or(z.literal('')),
  phone:              z.string().max(30).optional(),
  address:            z.string().max(500).optional(),
});

function CompanyForm({ defaultValues, onSubmit, loading }) {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(companySchema),
    defaultValues,
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label={t('company.name') + ' *'} id="co-name" error={errors.name?.message} {...register('name')} />
      <div className="grid grid-cols-2 gap-4">
        <Input label={t('company.registrationNumber')} id="co-reg" error={errors.registrationNumber?.message} {...register('registrationNumber')} />
        <Input label={t('company.industry')} id="co-industry" error={errors.industry?.message} {...register('industry')} />
        <Input label={t('auth.email')} id="co-email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label={t('company.phone')} id="co-phone" error={errors.phone?.message} {...register('phone')} />
      </div>
      <Input label={t('company.address')} id="co-address" error={errors.address?.message} {...register('address')} />
      <Button type="submit" variant="primary" loading={loading} className="w-full">{t('common.save')}</Button>
    </form>
  );
}

export function AdminCompaniesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-companies', search, statusFilter, page],
    queryFn: () => apiClient.get('/admin/companies', {
      params: { search: search || undefined, status: statusFilter || undefined, page, limit: 20 },
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const create = useMutation({
    mutationFn: (d) => apiClient.post('/admin/companies', d),
    onSuccess: () => { toast.success(t('company.created')); setShowCreate(false); qc.invalidateQueries({ queryKey: ['admin-companies'] }); },
    onError: (e) => toast.error(e.response?.data?.error?.message || t('common.error')),
  });

  const update = useMutation({
    mutationFn: ({ id, ...d }) => apiClient.patch(`/admin/companies/${id}`, d),
    onSuccess: () => { toast.success(t('company.updated')); setEditTarget(null); qc.invalidateQueries({ queryKey: ['admin-companies'] }); },
    onError: (e) => toast.error(e.response?.data?.error?.message || t('common.error')),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }) => apiClient.patch(`/admin/companies/${id}/status`, { status }),
    onSuccess: () => { toast.success(t('common.saved')); setToggleTarget(null); qc.invalidateQueries({ queryKey: ['admin-companies'] }); },
    onError: (e) => toast.error(e.response?.data?.error?.message || t('common.error')),
  });

  const items = data?.data ?? [];
  const meta  = data?.meta ?? {};

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{t('nav.admin.companies')}</h1>
        <Button variant="primary" onClick={() => setShowCreate(true)} id="create-company-btn">
          <Plus size={16} /> {t('company.add')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('common.search')}
            className="w-full rounded-lg border border-gray-200 ps-9 pe-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20">
          <option value="">{t('common.allStatuses')}</option>
          <option value="active">{t('common.active')}</option>
          <option value="inactive">{t('common.inactive')}</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={Building2} message={t('company.empty')} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[t('company.name'), t('company.industry'), t('company.registrationNumber'), t('common.users'), t('common.status'), ''].map(h => (
                  <th key={h} className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.industry || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{c.registrationNumber || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-gray-500">
                      <Users size={13} /> {c._count?.users ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={c.status === 'active' ? 'success' : 'danger'}>
                      {t(`common.${c.status}`)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditTarget(c)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title={t('common.edit')}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setToggleTarget(c)}
                        className={`p-1.5 rounded ${c.status === 'active' ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
                        title={c.status === 'active' ? t('common.deactivate') : t('common.activate')}>
                        {c.status === 'active' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
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

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t('company.add')}>
        <CompanyForm onSubmit={(d) => create.mutate(d)} loading={create.isPending} />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={t('company.edit')}>
        {editTarget && (
          <CompanyForm defaultValues={editTarget}
            onSubmit={(d) => update.mutate({ id: editTarget.id, ...d })}
            loading={update.isPending} />
        )}
      </Modal>

      {/* Activate / Deactivate confirm */}
      {toggleTarget && (
        <ConfirmDialog
          open
          title={toggleTarget.status === 'active' ? t('company.deactivateTitle') : t('company.activateTitle')}
          message={toggleTarget.status === 'active' ? t('company.deactivateWarning') : t('company.activateMessage')}
          variant={toggleTarget.status === 'active' ? 'danger' : 'primary'}
          confirmLabel={toggleTarget.status === 'active' ? t('common.deactivate') : t('common.activate')}
          onConfirm={() => setStatus.mutate({ id: toggleTarget.id, status: toggleTarget.status === 'active' ? 'inactive' : 'active' })}
          onCancel={() => setToggleTarget(null)}
        />
      )}
    </div>
  );
}
