// src/pages/admin/AdminLogsPage.jsx
// Super-admin: full audit log with filters for company, actor, action, date range.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Activity, Search } from 'lucide-react';
import apiClient from '../../api/client.js';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { Badge } from '../../components/ui/Badge.jsx';

const ACTION_COLORS = {
  'auth.login': 'success',
  'auth.logout': 'secondary',
  'auth.login_failed': 'danger',
  'user.created': 'info',
  'user.updated': 'info',
  'user.role_changed': 'warning',
  'user.status_changed': 'warning',
  'user.password_reset': 'warning',
  'company.created': 'primary',
  'company.updated': 'primary',
  'company.status_changed': 'danger',
  'request.created': 'secondary',
  'request.approved': 'success',
  'request.rejected': 'danger',
  'settings.updated': 'primary',
};

const ALL_ACTIONS = Object.keys(ACTION_COLORS);

function LogRow({ log }) {
  const [open, setOpen] = useState(false);
  const color = ACTION_COLORS[log.action] ?? 'secondary';

  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => log.metadata && setOpen(o => !o)}
      >
        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap font-mono">
          {new Date(log.createdAt).toLocaleString()}
        </td>
        <td className="px-4 py-3">
          <Badge variant={color} className="text-xs">{log.action}</Badge>
        </td>
        <td className="px-4 py-3 text-sm text-gray-700">
          {log.actor ? (
            <span title={log.actor.email}>{log.actor.fullName}</span>
          ) : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {log.entityType ?? <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {log.company?.name ?? <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3 text-xs text-gray-400 font-mono">
          {log.ip ?? '—'}
        </td>
        <td className="px-4 py-3 w-6">
          {log.metadata
            ? (open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-300" />)
            : null}
        </td>
      </tr>
      {open && log.metadata && (
        <tr className="bg-gray-50">
          <td colSpan={7} className="px-4 pb-3 pt-0">
            <pre className="text-xs text-gray-600 bg-white border border-gray-100 rounded-lg p-3 overflow-x-auto leading-relaxed">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

export function AdminLogsPage() {
  const { t } = useTranslation();
  const [page, setPage]       = useState(1);
  const [action, setAction]   = useState('');
  const [actor, setActor]     = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]   = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-logs', action, actor, dateFrom, dateTo, page],
    queryFn: () => apiClient.get('/admin/activity-logs', {
      params: {
        action:   action   || undefined,
        actor:    actor    || undefined,
        dateFrom: dateFrom || undefined,
        dateTo:   dateTo   || undefined,
        page,
        limit: 25,
      },
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const items = data?.data ?? [];
  const meta  = data?.meta ?? {};

  return (
    <div className="animate-fadeIn">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">{t('logs.title')}</h1>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-5 bg-white border border-gray-200 rounded-xl p-4">
        {/* Action dropdown */}
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[180px]"
          id="logs-action-filter"
        >
          <option value="">{t('logs.action')} — {t('common.filter')}</option>
          {ALL_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        {/* Actor search */}
        <div className="relative">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={actor}
            onChange={(e) => { setActor(e.target.value); setPage(1); }}
            placeholder={t('logs.actor')}
            className="rounded-lg border border-gray-200 ps-8 pe-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 w-40"
            id="logs-actor-filter"
          />
        </div>

        {/* Date range */}
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
          id="logs-date-from"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
          id="logs-date-to"
        />

        {/* Clear */}
        {(action || actor || dateFrom || dateTo) && (
          <button
            onClick={() => { setAction(''); setActor(''); setDateFrom(''); setDateTo(''); setPage(1); }}
            className="text-sm text-gray-400 hover:text-gray-700 px-2"
          >
            ✕ {t('common.filter')}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={Activity} message={t('logs.noLogs')} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[t('common.date'), t('logs.action'), t('logs.actor'), t('logs.entity'), t('company.name'), 'IP', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(log => <LogRow key={log.id} log={log} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {meta.total > meta.limit && (
        <Pagination page={page} total={meta.total} limit={meta.limit} onChange={setPage} className="mt-4" />
      )}
    </div>
  );
}
