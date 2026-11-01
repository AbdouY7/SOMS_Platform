// src/pages/data/ImportsPage.jsx  — route: /data/imports
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { ImportTypeBadge, ImportStatusBadge } from '../../components/data/ImportBadges.jsx';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { importsApi } from '../../api/imports.js';
import { getErrorMessage } from '../../api/system3.js';
import { formatDateTime } from '../../lib/dates.js';

export default function ImportsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const canImport = ['company_admin', 'analyst'].includes(user?.role);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['imports', page],
    queryFn: () => importsApi.list({ page, limit: 15 }),
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">{t('data.imports', 'Data imports')}</h1>
        {canImport && (
          <Button onClick={() => navigate('/data/imports/new')}>
            <Plus size={16} className="me-1.5" />
            {t('data.newImport', 'New import')}
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : isError ? (
          <p className="p-6 text-sm text-red-600">{getErrorMessage(error)}</p>
        ) : items.length === 0 ? (
          <EmptyState
            title={t('data.noImports', 'No imports yet')}
            description={t('data.noImportsHint', 'Upload a CSV file to bring your own data into the platform.')}
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t('data.fileName', 'File name')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('data.type', 'Type')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('data.statusLabel', 'Status')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('data.accepted', 'Accepted')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('data.rejected', 'Rejected')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('data.date', 'Date')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('data.importedBy', 'Imported by')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((imp) => (
                <tr
                  key={imp.id}
                  onClick={() => navigate(`/data/imports/${imp.id}`)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="max-w-[16rem] truncate px-4 py-3 font-medium text-gray-900">
                    <button
                      type="button"
                      className="max-w-full truncate text-start hover:text-blue-700 focus:outline-none focus-visible:underline"
                      onClick={(e) => { e.stopPropagation(); navigate(`/data/imports/${imp.id}`); }}
                    >
                      {imp.fileName}
                    </button>
                  </td>
                  <td className="px-4 py-3"><ImportTypeBadge type={imp.type} /></td>
                  <td className="px-4 py-3"><ImportStatusBadge status={imp.status} /></td>
                  <td className="px-4 py-3 text-end tabular-nums text-gray-900">{imp.acceptedRows}</td>
                  <td className={`px-4 py-3 text-end tabular-nums ${imp.rejectedRows > 0 ? 'text-red-600' : 'text-gray-500'}`}>{imp.rejectedRows}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDateTime(imp.createdAt, i18n.language)}</td>
                  <td className="px-4 py-3 text-gray-600">{imp.uploaderName ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={setPage} />
      )}
    </div>
  );
}
