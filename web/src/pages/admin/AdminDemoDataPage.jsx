// src/pages/admin/AdminDemoDataPage.jsx  — route: /admin/demo-data
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Sparkles, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { demoApi } from '../../api/imports.js';
import { companiesApi, getErrorMessage } from '../../api/system3.js';

export default function AdminDemoDataPage() {
  const { t } = useTranslation();
  const [pending, setPending] = useState(null); // { action: 'seed' | 'purge', company }

  const { data: companies = [], isLoading, isError, error } = useQuery({
    queryKey: ['companies-options'],
    queryFn: companiesApi.list,
    staleTime: 60_000,
  });

  const run = useMutation({
    mutationFn: ({ action, company }) => (action === 'seed' ? demoApi.seed(company.id) : demoApi.purge(company.id)),
    onSuccess: (r, { action, company }) => {
      if (action === 'seed') {
        if (r.skipped) toast(t('demo.alreadySeeded', '{{name}} already has demo data', { name: company.name }));
        else toast.success(t('demo.seeded', 'Demo data added to {{name}}: {{n}} regional metrics, {{p}} posts, {{s}} sales rows', {
          name: company.name, n: r.regionalMetrics, p: r.socialPosts, s: r.salesRecords,
        }));
      } else {
        toast.success(t('demo.purged', 'Demo data removed from {{name}}: {{n}} rows', {
          name: company.name, n: r.regionalMetrics + r.socialPosts + r.salesRecords,
        }));
      }
      setPending(null);
    },
    onError: (e) => { toast.error(getErrorMessage(e)); setPending(null); },
  });

  const isSeed = pending?.action === 'seed';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('nav.admin.demoData', 'Demo data')}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('demo.hint', 'Add 12 months of synthetic data (all wilayas, 2 platforms) so a company can try the analytics. Purging removes only the demo rows; real data is never touched.')}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : isError ? (
          <p className="p-6 text-sm text-red-600">{getErrorMessage(error)}</p>
        ) : companies.length === 0 ? (
          <EmptyState title={t('demo.noCompanies', 'No active companies')} description={t('demo.noCompaniesHint', 'Approve a company request first.')} />
        ) : (
          <ul className="divide-y divide-gray-100">
            {companies.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <span className="font-medium text-gray-900">{c.name}</span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPending({ action: 'seed', company: c })}>
                    <Sparkles size={14} className="me-1.5" />
                    {t('demo.seed', 'Seed demo data')}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setPending({ action: 'purge', company: c })}>
                    <Trash2 size={14} className="me-1.5" />
                    {t('demo.purge', 'Purge demo data')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!pending}
        title={isSeed ? t('demo.seedTitle', 'Seed demo data?') : t('demo.purgeTitle', 'Purge demo data?')}
        message={
          isSeed
            ? t('demo.seedMessage', 'This adds synthetic data to {{name}}. If demo data already exists, nothing is added.', { name: pending?.company.name })
            : t('demo.purgeMessage', 'This deletes all demo rows of {{name}}. Imported and manual data stays.', { name: pending?.company.name })
        }
        confirmLabel={isSeed ? t('demo.seed', 'Seed demo data') : t('demo.purge', 'Purge demo data')}
        danger={!isSeed}
        loading={run.isPending}
        onConfirm={() => run.mutate(pending)}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
