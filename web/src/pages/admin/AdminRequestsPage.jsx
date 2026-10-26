// src/pages/admin/AdminRequestsPage.jsx
// Super-admin: review pending / approved / rejected company requests.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  CheckCircle2, XCircle, ChevronRight, Search,
  Building2, Mail, Phone, Clock, User,
} from 'lucide-react';
import apiClient from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';

const STATUS_TABS = ['pending', 'approved', 'rejected'];
const STATUS_VARIANT = { pending: 'warning', approved: 'success', rejected: 'danger' };

const rejectSchema = z.object({
  note: z.string().min(1, 'Note is required for rejection').max(500),
});

// ── Detail Drawer ─────────────────────────────────────────────────────────────
function RequestDrawer({ req, onClose, onDecide }) {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(rejectSchema) });

  if (!req) return null;
  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative ms-auto w-full max-w-lg h-full bg-white shadow-2xl overflow-y-auto flex flex-col animate-slideIn">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-semibold text-gray-900">{req.companyName}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <XCircle size={20} />
          </button>
        </div>
        <div className="flex-1 p-6 space-y-4">
          {[
            { label: t('company.industry'), value: req.industry },
            { label: t('company.registrationNumber'), value: req.registrationNumber },
            { label: t('register.applicantInfo'), value: req.applicantFullName, Icon: User },
            { label: t('auth.email'), value: req.applicantEmail, Icon: Mail },
            { label: t('company.phone'), value: req.contactPhone, Icon: Phone },
            { label: t('common.submittedAt'), value: new Date(req.createdAt).toLocaleString(), Icon: Clock },
          ].filter(f => f.value).map(({ label, value, Icon }) => (
            <div key={label} className="flex items-start gap-3">
              {Icon && <Icon size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />}
              <div>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm text-gray-800">{value}</p>
              </div>
            </div>
          ))}
          {req.decisionNote && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">{t('requests.decisionNote')}</p>
              <p className="text-sm text-gray-700">{req.decisionNote}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {req.status === 'pending' && (
          <div className="p-6 border-t space-y-4">
            <Button variant="primary" className="w-full" onClick={() => onDecide(req, 'approved', '')}
              id={`approve-${req.id}`}>
              <CheckCircle2 size={16} /> {t('requests.approve')}
            </Button>
            <form onSubmit={handleSubmit((d) => onDecide(req, 'rejected', d.note))}>
              <textarea
                {...register('note')}
                rows={3}
                placeholder={t('requests.noteRequired')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 mb-2"
              />
              {errors.note && <p className="text-xs text-red-500 mb-2">{errors.note.message}</p>}
              <Button variant="danger" type="submit" className="w-full" id={`reject-${req.id}`}>
                <XCircle size={16} /> {t('requests.reject')}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function AdminRequestsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-requests', tab, search, page],
    queryFn: () => apiClient.get('/admin/requests', {
      params: { status: tab, search: search || undefined, page, limit: 20 },
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const decide = useMutation({
    mutationFn: ({ id, decision, note }) =>
      apiClient.patch(`/admin/requests/${id}`, { decision, note }),
    onSuccess: (_, { decision }) => {
      toast.success(decision === 'approved' ? t('requests.approved') : t('requests.rejected'));
      qc.invalidateQueries({ queryKey: ['admin-requests'] });
      setSelected(null);
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || t('common.error')),
  });

  const items = data?.data ?? [];
  const meta  = data?.meta ?? {};

  return (
    <div className="animate-fadeIn">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">{t('nav.admin.requests')}</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-5 gap-1">
        {STATUS_TABS.map((s) => (
          <button key={s} onClick={() => { setTab(s); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize
              ${tab === s ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t(`requests.status.${s}`)}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={t('common.search')}
          className="w-full rounded-lg border border-gray-200 ps-9 pe-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={Building2} message={t('requests.empty')} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[t('company.name'), t('register.applicantInfo'), t('auth.email'), t('common.date'), t('common.status'), ''].map(h => (
                  <th key={h} className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.companyName}</td>
                  <td className="px-4 py-3 text-gray-600">{r.applicantFullName}</td>
                  <td className="px-4 py-3 text-gray-500">{r.applicantEmail}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[r.status]}>{t(`requests.status.${r.status}`)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(r)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
                      {t('common.view')} <ChevronRight size={14} />
                    </button>
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

      <RequestDrawer req={selected} onClose={() => setSelected(null)}
        onDecide={(req, decision, note) => decide.mutate({ id: req.id, decision, note })} />
    </div>
  );
}
