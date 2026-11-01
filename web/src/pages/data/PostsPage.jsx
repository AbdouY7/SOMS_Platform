// src/pages/data/PostsPage.jsx  — route: /data/posts
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { DataSourceBadge } from '../../components/data/DataSourceBadge.jsx';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { PLATFORMS, CONTENT_TYPES } from '../../features/data/constants.js';
import { postsApi } from '../../api/imports.js';
import { getErrorMessage } from '../../api/system3.js';
import { formatDateTime } from '../../lib/dates.js';

const METRICS = ['likes', 'comments', 'shares', 'views', 'clicks'];
const nf = new Intl.NumberFormat();

// <input type="datetime-local"> works in local time; the API stores an instant.
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function PostsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const canWrite = ['company_admin', 'analyst'].includes(user?.role);

  const [platform, setPlatform] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);       // { post? }
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => setPage(1), [platform, dateFrom, dateTo]);

  const params = {
    page,
    limit: 15,
    ...(platform && { platform }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['posts', params],
    queryFn: () => postsApi.list(params),
    placeholderData: (prev) => prev,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['posts'] });

  const deleteMutation = useMutation({
    mutationFn: (id) => postsApi.remove(id),
    onSuccess: () => { toast.success(t('posts.deleted', 'Post deleted')); setToDelete(null); refresh(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const dateInput = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">{t('posts.title', 'Social posts')}</h1>
        {canWrite && (
          <Button onClick={() => setForm({})}>
            <Plus size={16} className="me-1.5" />
            {t('posts.add', 'Add post')}
          </Button>
        )}
      </div>

      <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:grid-cols-3">
        <Select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          options={[{ value: '', label: t('posts.allPlatforms', 'All platforms') }, ...PLATFORMS.map((p) => ({ value: p, label: p }))]}
        />
        <label className="text-xs text-gray-500">
          {t('logs.from', 'From')}
          <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className={`${dateInput} mt-1`} />
        </label>
        <label className="text-xs text-gray-500">
          {t('logs.to', 'To')}
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className={`${dateInput} mt-1`} />
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : isError ? (
          <p className="p-6 text-sm text-red-600">{getErrorMessage(error)}</p>
        ) : items.length === 0 ? (
          <EmptyState
            title={t('posts.empty', 'No posts found')}
            description={t('posts.emptyHint', 'Add a post by hand or import a CSV file.')}
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t('posts.platform', 'Platform')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('posts.publishedAt', 'Published')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('posts.contentType', 'Content type')}</th>
                {METRICS.map((m) => <th key={m} className="px-4 py-3 text-end font-medium">{t(`posts.${m}`, m)}</th>)}
                <th className="px-4 py-3 text-start font-medium">{t('posts.source', 'Source')}</th>
                {canWrite && <th className="px-4 py-3 text-end font-medium">{t('users.actions', 'Actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><Badge variant="info">{p.platform}</Badge></td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatDateTime(p.publishedAt, i18n.language)}</td>
                  <td className="px-4 py-3 text-gray-600">{p.contentType ?? '—'}</td>
                  {METRICS.map((m) => <td key={m} className="px-4 py-3 text-end tabular-nums text-gray-900">{nf.format(p[m] ?? 0)}</td>)}
                  <td className="px-4 py-3"><DataSourceBadge source={p.sourceType} /></td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button" aria-label={t('posts.edit', 'Edit post')} title={t('posts.edit', 'Edit post')}
                          onClick={() => setForm({ post: p })}
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button" aria-label={t('posts.delete', 'Delete post')} title={t('posts.delete', 'Delete post')}
                          onClick={() => setToDelete(p)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={setPage} />
      )}

      {form && (
        <PostFormModal
          key={form.post?.id ?? 'new'}
          post={form.post}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); refresh(); }}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        title={t('posts.deleteTitle', 'Delete this post?')}
        message={t('posts.deleteMessage', 'The post is removed from your data and from the analytics. This cannot be undone.')}
        confirmLabel={t('posts.delete', 'Delete post')}
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function PostFormModal({ post, onClose, onSaved }) {
  const { t } = useTranslation();
  const editing = !!post;

  const [v, setV] = useState({
    platform: post?.platform ?? 'facebook',
    externalPostId: post?.externalPostId ?? '',
    publishedAt: toLocalInput(post?.publishedAt),
    contentType: post?.contentType ?? '',
    likes: post?.likes ?? 0,
    comments: post?.comments ?? 0,
    shares: post?.shares ?? 0,
    views: post?.views ?? 0,
    clicks: post?.clicks ?? 0,
  });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        platform: v.platform,
        externalPostId: v.externalPostId.trim() || null,
        publishedAt: new Date(v.publishedAt).toISOString(),
        contentType: v.contentType || null,
        ...Object.fromEntries(METRICS.map((m) => [m, Number(v[m]) || 0])),
      };
      return editing ? postsApi.update(post.id, body) : postsApi.create(body);
    },
    onSuccess: () => { toast.success(editing ? t('posts.updated', 'Post updated') : t('posts.created', 'Post added')); onSaved(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function submit(e) {
    e.preventDefault();
    const next = {};
    if (!v.publishedAt) next.publishedAt = t('posts.errors.date', 'Choose the publish date and time');
    else if (new Date(v.publishedAt).getTime() > Date.now()) next.publishedAt = t('posts.errors.future', 'The publish date cannot be in the future');
    METRICS.forEach((m) => {
      const n = Number(v[m]);
      if (!Number.isInteger(n) || n < 0) next[m] = t('posts.errors.metric', 'Enter a whole number, 0 or more');
    });
    setErrors(next);
    if (Object.keys(next).length === 0) mutation.mutate();
  }

  return (
    <Modal open onClose={onClose} title={editing ? t('posts.edit', 'Edit post') : t('posts.add', 'Add post')}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t('posts.platform', 'Platform') + ' *'}
            value={v.platform}
            onChange={set('platform')}
            options={PLATFORMS.map((p) => ({ value: p, label: p }))}
          />
          <Select
            label={t('posts.contentType', 'Content type')}
            value={v.contentType}
            onChange={set('contentType')}
            options={[{ value: '', label: '—' }, ...CONTENT_TYPES.map((c) => ({ value: c, label: c }))]}
          />
        </div>
        <Input
          label={t('posts.externalPostId', 'External post ID (optional)')}
          value={v.externalPostId}
          onChange={set('externalPostId')}
        />
        <Input
          label={t('posts.publishedAt', 'Published') + ' *'}
          type="datetime-local"
          value={v.publishedAt}
          onChange={set('publishedAt')}
          error={errors.publishedAt}
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {METRICS.map((m) => (
            <Input
              key={m}
              label={t(`posts.${m}`, m)}
              type="number"
              min={0}
              inputMode="numeric"
              value={v[m]}
              onChange={set(m)}
              error={errors[m]}
            />
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
          <Button type="submit" loading={mutation.isPending}>{editing ? t('common.save', 'Save changes') : t('posts.add', 'Add post')}</Button>
        </div>
      </form>
    </Modal>
  );
}
