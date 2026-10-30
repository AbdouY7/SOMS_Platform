// src/pages/company/CompanyActivityPage.jsx
// Company-scoped activity log — company_admin, analyst, viewer can view.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Activity } from 'lucide-react';
import apiClient from '../../api/client.js';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { Badge } from '../../components/ui/Badge.jsx';

const ACTION_COLOR = {
  'auth.login': 'success', 'auth.logout': 'secondary', 'auth.login_failed': 'danger',
  'user.created': 'info', 'user.updated': 'info', 'user.status_changed': 'warning',
  'user.password_reset': 'warning', 'company.updated': 'primary', 'settings.updated': 'primary',
};

function LogRow({ log }) {
  const [open, setOpen] = useState(false);
  const color = ACTION_COLOR[log.action] ?? 'secondary';
  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
        <td className="px-4 py-3"><Badge variant={color}>{log.action}</Badge></td>
        <td className="px-4 py-3 text-sm text-gray-700">{log.actor?.fullName ?? '—'}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{log.entityType ?? '—'}</td>
        <td className="px-4 py-3 text-gray-400">{log.ip ?? '—'}</td>
        <td className="px-4 py-3 text-gray-400">
          {log.metadata ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
        </td>
      </tr>
      {open && log.metadata && (
        <tr>
          <td colSpan={6} className="px-4 pb-3 bg-gray-50">
            <pre className="text-xs text-gray-600 bg-white border border-gray-100 rounded p-3 overflow-x-auto">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

export function CompanyActivityPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['company-activity', action, dateFrom, dateTo, page],
    queryFn: () => apiClient.get('/company/activity-logs', {
      params: { action: action || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, page, limit: 25 },
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const items = data?.data ?? [];
  const meta  = data?.meta ?? {};

  return (
    <div className="animate-fadeIn">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">{t('logs.title')}</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}
          placeholder={t('logs.action')}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 w-40" />
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={Activity} message={t('logs.noLogs')} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[t('common.date'), t('logs.action'), t('logs.actor'), t('logs.entity'), 'IP', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((log) => <LogRow key={log.id} log={log} />)}
            </tbody>
          </table>
        </div>
      )}

      {meta.total > meta.limit && (
        <Pagination page={page} total={meta.total} limit={meta.limit} onChange={setPage} className="mt-4" />
      )}
    </div>
  );
}
