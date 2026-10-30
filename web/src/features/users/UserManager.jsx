// src/features/users/UserManager.jsx
// Shared user-management UI. mode="admin"  → all companies, can reset passwords.
//                              mode="company" → own company only, no company column.
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Pencil, KeyRound, Power, Plus, Search, Copy, Check } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { usersApi, companiesApi, getErrorMessage } from '../../api/system3.js';

const ALL_ROLES = ['super_admin', 'company_admin', 'analyst', 'viewer'];
const COMPANY_ROLES = ['company_admin', 'analyst', 'viewer'];
const ROLE_BADGE = { super_admin: 'danger', company_admin: 'info', analyst: 'success', viewer: 'neutral' };

function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export function UserManager({ mode }) {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const isAdminMode = mode === 'admin';
  const api = usersApi(mode);
  const roles = isAdminMode ? ALL_ROLES : COMPANY_ROLES;

  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);        // { mode: 'create' } | { mode: 'edit', user }
  const [tempPassword, setTempPassword] = useState(null); // { user, value }

  const debouncedSearch = useDebounced(search);
  useEffect(() => setPage(1), [debouncedSearch, companyId, role, status]);

  const params = {
    page,
    limit: 15,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(companyId && { companyId }),
    ...(role && { role }),
    ...(status && { isActive: status === 'active' }),
  };

  const usersQuery = useQuery({
    queryKey: ['users', mode, params],
    queryFn: () => api.list(params),
    placeholderData: (prev) => prev,
  });

  const companiesQuery = useQuery({
    queryKey: ['companies-options'],
    queryFn: companiesApi.list,
    enabled: isAdminMode,
    staleTime: 5 * 60_000,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['users', mode] });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.setStatus(id, isActive),
    onSuccess: (_d, v) => {
      toast.success(v.isActive ? t('users.activated', 'User activated') : t('users.deactivated', 'User deactivated'));
      refresh();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const resetMutation = useMutation({
    mutationFn: (u) => api.resetPassword(u.id).then((r) => ({ user: u, value: r.tempPassword })),
    onSuccess: (r) => { setTempPassword(r); refresh(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const items = usersQuery.data?.items ?? [];
  const pagination = usersQuery.data?.pagination;
  const companyOptions = companiesQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">{t('users.title', 'Users')}</h1>
        <Button onClick={() => setForm({ mode: 'create' })}>
          <Plus size={16} className="me-1.5" />
          {t('users.create', 'Create user')}
        </Button>
      </div>

      {/* Filters */}
      <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('users.search', 'Search name or email')}
            aria-label={t('users.search', 'Search name or email')}
            className="w-full rounded-lg border border-gray-300 py-2 ps-9 pe-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {isAdminMode && (
          <Select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            options={[{ value: '', label: t('users.allCompanies', 'All companies') },
              ...companyOptions.map((c) => ({ value: c.id, label: c.name }))]}
          />
        )}
        <Select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={[{ value: '', label: t('users.allRoles', 'All roles') },
            ...roles.map((r) => ({ value: r, label: t(`users.roles.${r}`, r) }))]}
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: '', label: t('users.allStatuses', 'All statuses') },
            { value: 'active', label: t('users.status.active', 'Active') },
            { value: 'inactive', label: t('users.status.inactive', 'Inactive') },
          ]}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        {usersQuery.isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : usersQuery.isError ? (
          <p className="p-6 text-sm text-red-600">{getErrorMessage(usersQuery.error)}</p>
        ) : items.length === 0 ? (
          <EmptyState title={t('users.empty', 'No users found')} description={t('users.emptyHint', 'Try changing the filters or create a user.')} />
        ) : (
          <table className="w-full text-start text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t('users.name', 'Name')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('users.email', 'Email')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('users.role', 'Role')}</th>
                {isAdminMode && <th className="px-4 py-3 text-start font-medium">{t('users.company', 'Company')}</th>}
                <th className="px-4 py-3 text-start font-medium">{t('users.statusLabel', 'Status')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('users.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((u) => {
                const isSelf = u.id === me?.id;
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.fullName}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3"><Badge variant={ROLE_BADGE[u.role]}>{t(`users.roles.${u.role}`, u.role)}</Badge></td>
                    {isAdminMode && <td className="px-4 py-3 text-gray-600">{u.company?.name ?? '—'}</td>}
                    <td className="px-4 py-3">
                      <Badge variant={u.isActive ? 'success' : 'neutral'}>
                        {u.isActive ? t('users.status.active', 'Active') : t('users.status.inactive', 'Inactive')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton label={t('users.edit', 'Edit user')} onClick={() => setForm({ mode: 'edit', user: u })}>
                          <Pencil size={16} />
                        </IconButton>
                        {isAdminMode && (
                          <IconButton
                            label={t('users.resetPassword', 'Reset password')}
                            disabled={resetMutation.isPending}
                            onClick={() => resetMutation.mutate(u)}
                          >
                            <KeyRound size={16} />
                          </IconButton>
                        )}
                        <IconButton
                          label={u.isActive ? t('users.deactivate', 'Deactivate') : t('users.activate', 'Activate')}
                          disabled={(isSelf && u.isActive) || statusMutation.isPending}
                          title={isSelf && u.isActive ? t('users.cannotDeactivateSelf', 'You cannot deactivate your own account') : undefined}
                          tone={u.isActive ? 'danger' : 'success'}
                          onClick={() => statusMutation.mutate({ id: u.id, isActive: !u.isActive })}
                        >
                          <Power size={16} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={setPage} />
      )}

      {form && (
        <UserFormModal
          key={form.user?.id ?? 'new'}
          state={form}
          roles={roles}
          isAdminMode={isAdminMode}
          companies={companyOptions}
          meId={me?.id}
          api={api}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); refresh(); }}
        />
      )}

      {tempPassword && (
        <TempPasswordModal data={tempPassword} onClose={() => setTempPassword(null)} />
      )}
    </div>
  );
}

function IconButton({ label, tone, children, ...rest }) {
  const tones = {
    danger: 'hover:bg-red-50 hover:text-red-600',
    success: 'hover:bg-green-50 hover:text-green-600',
  };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`rounded-lg p-2 text-gray-500 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone] ?? 'hover:bg-gray-100 hover:text-gray-800'}`}
      {...rest}
    >
      {children}
    </button>
  );
}

function UserFormModal({ state, roles, isAdminMode, companies, meId, api, onClose, onSaved }) {
  const { t } = useTranslation();
  const editing = state.mode === 'edit';
  const target = state.user;
  const isSelf = editing && target.id === meId;

  const [values, setValues] = useState({
    fullName: target?.fullName ?? '',
    email: target?.email ?? '',
    password: '',
    role: target?.role ?? (isAdminMode ? 'company_admin' : 'viewer'),
    companyId: target?.companyId ?? '',
  });
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const showCompany = isAdminMode && values.role !== 'super_admin';

  const mutation = useMutation({
    mutationFn: () => {
      if (!editing) {
        return api.create({
          fullName: values.fullName.trim(),
          email: values.email.trim(),
          password: values.password,
          role: values.role,
          ...(isAdminMode && { companyId: showCompany ? values.companyId : null }),
        });
      }
      const body = {};
      if (values.fullName.trim() !== target.fullName) body.fullName = values.fullName.trim();
      if (values.role !== target.role) body.role = values.role;
      if (isAdminMode) {
        const nextCompany = showCompany ? values.companyId : null;
        if (nextCompany !== (target.companyId ?? null)) body.companyId = nextCompany;
      }
      return api.update(target.id, body);
    },
    onSuccess: () => {
      toast.success(editing ? t('users.updated', 'User updated') : t('users.created', 'User created'));
      onSaved();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function submit(e) {
    e.preventDefault();
    const next = {};
    if (values.fullName.trim().length < 2) next.fullName = t('users.errors.name', 'Enter the full name');
    if (!editing) {
      if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) next.email = t('users.errors.email', 'Enter a valid email address');
      if (values.password.length < 8) next.password = t('users.errors.password', 'Use at least 8 characters');
    }
    if (showCompany && !values.companyId) next.companyId = t('users.errors.company', 'Choose a company');
    setErrors(next);
    if (Object.keys(next).length === 0) mutation.mutate();
  }

  return (
    <Modal open onClose={onClose} title={editing ? t('users.edit', 'Edit user') : t('users.create', 'Create user')}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label={t('users.fullName', 'Full name') + ' *'} value={values.fullName} onChange={set('fullName')} error={errors.fullName} />
        {!editing && (
          <>
            <Input label={t('users.email', 'Email') + ' *'} type="email" value={values.email} onChange={set('email')} error={errors.email} />
            <Input label={t('users.password', 'Password') + ' *'} type="password" autoComplete="new-password" value={values.password} onChange={set('password')} error={errors.password} />
          </>
        )}
        <Select
          label={t('users.role', 'Role') + ' *'}
          value={values.role}
          onChange={set('role')}
          disabled={isSelf}
          options={roles.map((r) => ({ value: r, label: t(`users.roles.${r}`, r) }))}
        />
        {isSelf && <p className="-mt-2 text-xs text-gray-500">{t('users.cannotChangeOwnRole', 'You cannot change your own role')}</p>}
        {showCompany && (
          <Select
            label={t('users.company', 'Company') + ' *'}
            value={values.companyId}
            onChange={set('companyId')}
            error={errors.companyId}
            options={[{ value: '', label: t('users.chooseCompany', 'Choose a company') },
              ...companies.map((c) => ({ value: c.id, label: c.name }))]}
          />
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
          <Button type="submit" loading={mutation.isPending}>{editing ? t('common.save', 'Save changes') : t('users.create', 'Create user')}</Button>
        </div>
      </form>
    </Modal>
  );
}

function TempPasswordModal({ data, onClose }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(data.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('users.copyFailed', 'Could not copy. Select the password and copy it manually.'));
    }
  }

  return (
    <Modal open onClose={onClose} title={t('users.resetPassword', 'Reset password')}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          {t('users.tempPasswordFor', 'Temporary password for')} <strong>{data.user.fullName}</strong>
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <code className="flex-1 select-all break-all font-mono text-base tracking-wide text-gray-900">{data.value}</code>
          <Button type="button" variant="secondary" size="sm" onClick={copy}>
            {copied ? <Check size={14} className="me-1" /> : <Copy size={14} className="me-1" />}
            {t('users.copyPassword', 'Copy')}
          </Button>
        </div>
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {t('users.tempPasswordNote', 'This password is shown only once. Share it securely — the user should change it after signing in. Their active sessions were signed out.')}
        </p>
        <div className="flex justify-end">
          <Button type="button" onClick={onClose}>{t('common.done', 'Done')}</Button>
        </div>
      </div>
    </Modal>
  );
}
