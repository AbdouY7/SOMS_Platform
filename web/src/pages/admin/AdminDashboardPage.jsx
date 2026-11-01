// src/pages/admin/AdminDashboardPage.jsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, ClipboardList, Users, UserCheck } from 'lucide-react';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { dashboardApi, getErrorMessage } from '../../api/system3.js';
import { timeAgo } from '../../lib/dates.js';
import { ActionIcon, actionChipClass, actorLabel } from '../../features/logs/actions.jsx';

function KpiCard({ label, value, Icon, tone }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5">
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon size={20} aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-semibold tabular-nums text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const { t, i18n } = useTranslation();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: dashboardApi.get,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (isError) return <p className="text-sm text-red-600">{getErrorMessage(error)}</p>;

  const requests = data.pendingRequestsPreview ?? [];
  const activity = data.recentActivity ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">{t('nav.admin.dashboard', 'Dashboard')}</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t('dashboard.activeCompanies', 'Active Companies')} value={data.activeCompanies} Icon={Building2} tone="bg-blue-50 text-blue-600" />
        <KpiCard label={t('dashboard.pendingRequests', 'Pending Requests')} value={data.pendingRequests} Icon={ClipboardList} tone="bg-amber-50 text-amber-600" />
        <KpiCard label={t('dashboard.totalUsers', 'Total Users')} value={data.totalUsers} Icon={Users} tone="bg-violet-50 text-violet-600" />
        <KpiCard label={t('dashboard.activeUsers', 'Active Users')} value={data.activeUsers} Icon={UserCheck} tone="bg-green-50 text-green-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending requests */}
        <section className="rounded-xl border border-gray-200 bg-white">
          <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold text-gray-900">{t('dashboard.pendingRequests', 'Pending Requests')}</h2>
            <Link to="/admin/requests" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              {t('dashboard.viewAll', 'View all')}
            </Link>
          </header>
          {requests.length === 0 ? (
            <EmptyState title={t('dashboard.noRequests', 'No pending requests')} description={t('dashboard.noRequestsHint', 'New company requests will show up here.')} />
          ) : (
            <ul className="divide-y divide-gray-100">
              {requests.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{r.companyName ?? r.name ?? r.email}</p>
                    {r.email && <p className="truncate text-xs text-gray-500">{r.email}</p>}
                  </div>
                  <span className="flex-shrink-0 text-xs text-gray-400">{timeAgo(r.createdAt, i18n.language)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent activity */}
        <section className="rounded-xl border border-gray-200 bg-white">
          <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold text-gray-900">{t('dashboard.recentActivity', 'Recent Activity')}</h2>
            <Link to="/admin/logs" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              {t('dashboard.viewAll', 'View all')}
            </Link>
          </header>
          {activity.length === 0 ? (
            <EmptyState title={t('logs.noLogs', 'No activity recorded')} />
          ) : (
            <ul className="divide-y divide-gray-100">
              {activity.map((log) => (
                <li key={log.id} className="flex items-start gap-3 px-5 py-3">
                  <span className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${actionChipClass(log.action)}`}>
                    <ActionIcon action={log.action} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{log.action}</p>
                    <p className="truncate text-xs text-gray-500">
                      {actorLabel(log)}{log.company?.name ? ` · ${log.company.name}` : ''}
                    </p>
                  </div>
                  <time dateTime={log.createdAt} className="flex-shrink-0 text-xs text-gray-400">
                    {timeAgo(log.createdAt, i18n.language)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
