// src/pages/data/ImportDetailPage.jsx  — route: /data/imports/:id
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Download, Undo2 } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { ImportErrorTable } from '../../components/data/ImportErrorTable.jsx';
import { ImportTypeBadge, ImportStatusBadge } from '../../components/data/ImportBadges.jsx';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { importsApi } from '../../api/imports.js';
import { getErrorMessage } from '../../api/system3.js';
import { formatDateTime } from '../../lib/dates.js';

export default function ImportDetailPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: imp, isLoading, isError, error } = useQuery({
    queryKey: ['import', id],
    queryFn: () => importsApi.getDetail(id),
  });

  const rollbackMutation = useMutation({
    mutationFn: () => importsApi.rollback(id),
    onSuccess: (r) => {
      toast.success(t('data.rolledBack', 'Import rolled back: {{n}} rows removed', { n: r.deleted }));
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ['import', id] });
      qc.invalidateQueries({ queryKey: ['imports'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const csvMutation = useMutation({
    mutationFn: () => importsApi.downloadErrorsCsv(id),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (isError) return <p className="text-sm text-red-600">{getErrorMessage(error)}</p>;

  const canRollback = user?.role === 'company_admin' && imp.status === 'completed';
  const hasErrors = imp.rejectedRows > 0 || imp.errors.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/data/imports" className="text-sm text-blue-600 hover:text-blue-700">
          {t('data.backToImports', 'Back to imports')}
        </Link>
        <h1 className="mt-1 truncate text-xl font-semibold text-gray-900">{imp.fileName}</h1>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
          <div><dt className="text-gray-500">{t('data.type', 'Type')}</dt><dd className="mt-1"><ImportTypeBadge type={imp.type} /></dd></div>
          <div><dt className="text-gray-500">{t('data.statusLabel', 'Status')}</dt><dd className="mt-1"><ImportStatusBadge status={imp.status} /></dd></div>
          <div><dt className="text-gray-500">{t('data.totalRows', 'Total rows')}</dt><dd className="mt-1 font-semibold tabular-nums text-gray-900">{imp.totalRows}</dd></div>
          <div><dt className="text-gray-500">{t('data.accepted', 'Accepted')}</dt><dd className="mt-1 font-semibold tabular-nums text-green-600">{imp.acceptedRows}</dd></div>
          <div><dt className="text-gray-500">{t('data.rejected', 'Rejected')}</dt><dd className={`mt-1 font-semibold tabular-nums ${imp.rejectedRows ? 'text-red-600' : 'text-gray-900'}`}>{imp.rejectedRows}</dd></div>
          <div><dt className="text-gray-500">{t('data.date', 'Date')}</dt><dd className="mt-1 text-gray-900">{formatDateTime(imp.createdAt, i18n.language)}</dd></div>
        </dl>
        <p className="mt-4 text-sm text-gray-500">
          {t('data.importedBy', 'Imported by')} {imp.uploaderName ?? '—'}
        </p>

        {(hasErrors || canRollback) && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            {hasErrors && (
              <Button variant="secondary" onClick={() => csvMutation.mutate()} loading={csvMutation.isPending}>
                <Download size={16} className="me-1.5" />
                {t('data.downloadErrors', 'Download errors CSV')}
              </Button>
            )}
            {canRollback && (
              <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                <Undo2 size={16} className="me-1.5" />
                {t('data.rollback', 'Roll back import')}
              </Button>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-gray-900">{t('data.errors', 'Errors')}</h2>
        {imp.errors.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
            {t('data.noErrors', 'No errors were recorded for this import.')}
          </p>
        ) : (
          <>
            <ImportErrorTable errors={imp.errors} />
            {imp.errors.length >= 500 && (
              <p className="text-xs text-gray-500">{t('data.errorsCapped', 'Showing the first 500 errors. The CSV download has every stored error.')}</p>
            )}
          </>
        )}
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title={t('data.rollbackTitle', 'Roll back this import?')}
        message={t('data.rollbackMessage', 'All rows added by this import will be deleted. Rows that this import updated (upsert) are deleted too. This cannot be undone.')}
        confirmLabel={t('data.rollback', 'Roll back import')}
        danger
        loading={rollbackMutation.isPending}
        onConfirm={() => rollbackMutation.mutate()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
