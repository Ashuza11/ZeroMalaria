import {
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { api, type AuthUser } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useCan } from '../auth/permissions';
import { ALL_ROLES, assignableRoles, roleI18nKey, type UserRole } from '../auth/roles';
import { DataTable, type DataColumn, type RowAction } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { ConfirmDialog, Modal } from '../components/Modal';
import { WebShell } from '../components/shells';
import { useToast } from '../components/ToastProvider';
import { Badge, Button, Input, PageHeader } from '../components/ui';
import { gateUserAction, generateTempPassword } from '../lib/userActions';

type UserForm = {
  display_name: string;
  username: string;
  email: string;
  phone: string;
  role: UserRole;
  facility_id: string;
  district: string;
  village: string;
  active: boolean;
};

const emptyForm = (role: UserRole = 'CHW'): UserForm => ({
  display_name: '',
  username: '',
  email: '',
  phone: '',
  role,
  facility_id: '',
  district: '',
  village: '',
  active: true,
});

function parseApiError(err: unknown): {
  status?: number;
  detail: string;
  fields?: Record<string, string>;
} {
  const msg = err instanceof Error ? err.message : String(err);
  const status =
    err instanceof Error && 'status' in err ? Number((err as Error & { status?: number }).status) : undefined;
  try {
    const j = JSON.parse(msg) as {
      detail?: string | { msg?: string; loc?: (string | number)[]; type?: string }[];
    };
    if (typeof j.detail === 'string') return { status, detail: j.detail };
    if (Array.isArray(j.detail)) {
      const fields: Record<string, string> = {};
      for (const d of j.detail) {
        const loc = d.loc || [];
        const field = String(loc[loc.length - 1] || '');
        if (field && field !== 'body') fields[field] = d.type || d.msg || 'invalid';
      }
      return {
        status,
        detail: j.detail.map((d) => d.msg || d.type || '').filter(Boolean).join(', '),
        fields,
      };
    }
  } catch {
    /* plain text */
  }
  if (msg.includes('conflict')) return { status: 409, detail: 'conflict_version' };
  return { status, detail: msg };
}

export function UsersPage() {
  const { t } = useTranslation();
  const { user: actor } = useAuth();
  const { push } = useToast();
  const [params, setParams] = useSearchParams();
  const canCreate = useCan('users:create');
  const canUpdate = useCan('users:update');

  const [rows, setRows] = useState<AuthUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AuthUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm());
  const [formDirty, setFormDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const [detail, setDetail] = useState<AuthUser | null>(null);
  const [confirm, setConfirm] = useState<
    | { kind: 'toggle' | 'delete' | 'reset'; row: AuthUser }
    | { kind: 'bulk'; action: 'activate' | 'deactivate' }
    | null
  >(null);
  const [resetReveal, setResetReveal] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<{ facility_id: string; name: string; district: string }[]>([]);

  const assignable = useMemo(() => assignableRoles(actor?.role), [actor?.role]);
  const perms = actor?.permissions || [];
  const superAdminCount = useMemo(
    () => rows.filter((r) => r.role === 'SUPER_ADMIN' && r.active && !r.deleted_at).length,
    [rows],
  );

  const page = Number(params.get('page') || 1);
  const pageSize = Number(params.get('page_size') || 20);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const pageData = await api.listUsers({
        page,
        page_size: pageSize,
        q: params.get('q') || undefined,
        role: params.get('role') || undefined,
        status: params.get('status') || 'active',
        district: params.get('district') || undefined,
        facility_id: params.get('facility_id') || undefined,
        sort_by: 'created_at',
        order: 'desc',
      });
      setRows(pageData.items);
      setTotal(pageData.total);
    } catch {
      setError(true);
      push(t('common.error'), 'danger');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, params, push, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!formOpen) return;
    void (async () => {
      try {
        // API page_size max is 100 — larger values return 422.
        const first = await api.listAdminFacilities({ page: 1, page_size: 100, status: 'active' });
        const items = [...first.items];
        const pages = Math.max(1, Math.ceil(first.total / 100));
        for (let p = 2; p <= pages && p <= 5; p += 1) {
          const next = await api.listAdminFacilities({ page: p, page_size: 100, status: 'active' });
          items.push(...next.items);
        }
        setFacilities(
          (items as { facility_id: string; name: string; district: string }[]).map((f) => ({
            facility_id: String(f.facility_id),
            name: String(f.name || f.facility_id),
            district: String(f.district || ''),
          })),
        );
      } catch {
        setFacilities([]);
      }
    })();
  }, [formOpen]);

  const setFormField = <K extends keyof UserForm>(key: K, value: UserForm[K]) => {
    setFormDirty(true);
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const openCreate = () => {
    const role = assignable[0] || 'CHW';
    const pwd = generateTempPassword();
    setEditing(null);
    setForm(emptyForm(role));
    setTempPassword(pwd);
    setCreatedPassword(null);
    setFormDirty(false);
    setFieldErrors({});
    setShowPassword(false);
    setFormOpen(true);
  };

  const openEdit = (row: AuthUser) => {
    setEditing(row);
    setForm({
      display_name: row.display_name,
      username: row.username,
      email: row.email || '',
      phone: row.phone || '',
      role: row.role,
      facility_id: row.facility_id || '',
      district: row.district || '',
      village: row.village || '',
      active: row.active,
    });
    setTempPassword('');
    setCreatedPassword(null);
    setFormDirty(false);
    setFieldErrors({});
    setFormOpen(true);
  };

  const submitForm = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    try {
      if (editing) {
        await api.patchUser(editing.id, {
          display_name: form.display_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          role: form.role,
          facility_id: form.facility_id.trim(),
          district: form.district.trim(),
          village: form.village.trim(),
          active: form.active,
          version: editing.version,
        });
        push(t('users.updated'), 'success');
        setFormOpen(false);
      } else {
        const facilityId = form.facility_id.trim();
        await api.createUser({
          username: form.username.trim(),
          password: tempPassword,
          display_name: form.display_name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          role: form.role,
          facility_id: facilityId || undefined,
          district: form.district.trim() || undefined,
          village: form.village.trim() || undefined,
        });
        push(t('users.created'), 'success');
        setCreatedPassword(tempPassword);
        setFormDirty(false);
        // Jump to page 1 so the new row is visible at the top.
        if (params.get('page') && params.get('page') !== '1') {
          const next = new URLSearchParams(params);
          next.set('page', '1');
          setParams(next, { replace: true });
        }
      }
      await load();
    } catch (err) {
      const { detail, fields } = parseApiError(err);
      const next: Record<string, string> = {};
      if (fields?.username === 'string_too_short' || detail.includes('at least 3')) {
        next.username = t('users.errUsernameShort');
      }
      if (fields?.password === 'string_too_short' || detail === 'password_too_short') {
        next.password = t('users.errPasswordShort');
      }
      if (detail === 'password_too_common') next.password = t('users.errPasswordCommon');
      if (detail === 'password_matches_username') next.password = t('users.errPasswordUsername');
      if (detail === 'username_taken') next.username = t('users.errUsernameTaken');
      if (detail === 'email_taken') next.email = t('users.errEmailTaken');
      if (detail === 'chw_needs_village') next.village = t('users.errVillageRequired');
      if (detail === 'facility_required' || detail === 'invalid_facility') {
        next.facility_id = detail === 'invalid_facility' ? t('users.errFacilityInvalid') : t('users.errFacilityRequired');
      }
      if (Object.keys(next).length) setFieldErrors(next);
      else if (detail === 'conflict_version') push(t('users.errConflict'), 'danger');
      else push(t('common.error'), 'danger');
    } finally {
      setSaving(false);
    }
  };

  const runToggle = async (row: AuthUser) => {
    await api.patchUser(row.id, { active: !row.active, version: row.version });
    push(row.active ? t('users.deactivated') : t('users.activated'), 'success');
    await load();
  };

  const runDelete = async (row: AuthUser) => {
    await api.softDeleteUser(row.id);
    push(t('users.deleted'), 'success');
    await load();
  };

  const runRestore = async (row: AuthUser) => {
    await api.restoreUser(row.id);
    push(t('users.restored'), 'success');
    await load();
  };

  const runReset = async (row: AuthUser) => {
    const res = await api.resetPassword(row.id);
    setResetReveal(res.temporary_password);
    push(t('users.passwordReset'), 'success');
  };

  const actionsForRow = (row: AuthUser): RowAction[] => {
    const ctx = { actor, target: row, permissions: perms, superAdminCount };
    const g = (action: Parameters<typeof gateUserAction>[0]) => gateUserAction(action, ctx);
    const view = g('view');
    const edit = g('edit');
    const reset = g('resetPassword');
    const deact = g('deactivate');
    const act = g('activate');
    const del = g('delete');
    const restore = g('restore');

    return [
      {
        id: 'view',
        label: t('common.view'),
        icon: <Eye className="h-4 w-4" />,
        hidden: !view.show,
        disabled: view.disabled,
        disabledReason: view.reasonKey ? t(view.reasonKey) : undefined,
        onClick: () => setDetail(row),
      },
      {
        id: 'edit',
        label: t('common.edit'),
        icon: <Pencil className="h-4 w-4" />,
        hidden: !edit.show,
        disabled: edit.disabled,
        disabledReason: edit.reasonKey ? t(edit.reasonKey) : undefined,
        onClick: () => openEdit(row),
      },
      {
        id: 'reset',
        label: t('users.resetPassword'),
        icon: <KeyRound className="h-4 w-4" />,
        hidden: !reset.show,
        disabled: reset.disabled,
        disabledReason: reset.reasonKey ? t(reset.reasonKey) : undefined,
        onClick: () => setConfirm({ kind: 'reset', row }),
      },
      {
        id: 'toggle',
        label: row.active ? t('common.deactivate') : t('common.activate'),
        icon: <Power className="h-4 w-4" />,
        hidden: !(deact.show || act.show),
        disabled: (row.active ? deact : act).disabled,
        disabledReason: (row.active ? deact : act).reasonKey
          ? t((row.active ? deact : act).reasonKey!)
          : undefined,
        onClick: () => setConfirm({ kind: 'toggle', row }),
      },
      {
        id: 'restore',
        label: t('common.restore'),
        icon: <RotateCcw className="h-4 w-4" />,
        hidden: !restore.show,
        disabled: restore.disabled,
        disabledReason: restore.reasonKey ? t(restore.reasonKey) : undefined,
        onClick: () => void runRestore(row).catch(() => push(t('common.error'), 'danger')),
      },
      {
        id: 'delete',
        label: t('common.delete'),
        icon: <Trash2 className="h-4 w-4" />,
        hidden: !del.show,
        disabled: del.disabled,
        disabledReason: del.reasonKey ? t(del.reasonKey) : undefined,
        danger: true,
        onClick: () => setConfirm({ kind: 'delete', row }),
      },
    ];
  };

  const columns: DataColumn<AuthUser>[] = [
    {
      id: 'name',
      header: t('users.colName'),
      primary: true,
      truncate: true,
      cell: (r) => r.display_name,
    },
    {
      id: 'role',
      header: t('users.colRole'),
      cell: (r) => t(roleI18nKey(r.role)),
    },
    {
      id: 'district',
      header: t('users.colDistrict'),
      truncate: true,
      cell: (r) => r.district || '—',
    },
    {
      id: 'facility',
      header: t('users.colFacility'),
      truncate: true,
      cell: (r) => r.facility_id || '—',
    },
    {
      id: 'village',
      header: t('users.colVillage'),
      truncate: true,
      cell: (r) => r.village || '—',
    },
    {
      id: 'status',
      header: t('users.colStatus'),
      cell: (r) =>
        r.deleted_at ? (
          <Badge tone="danger">{t('users.deletedBadge')}</Badge>
        ) : (
          <Badge tone={r.active ? 'success' : 'neutral'}>
            {r.active ? t('users.active') : t('users.inactive')}
          </Badge>
        ),
    },
  ];

  const needsFacility = form.role === 'HEALTH_CENTER';
  const needsVillage = form.role === 'CHW';

  return (
    <WebShell title={t('users.title')} crumbs={[t('nav.settings'), t('users.title')]}>
      <PageHeader
        title={t('users.title')}
        subtitle={t('users.subtitle')}
        actions={
          canCreate ? (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate} data-testid="add-user">
              {t('users.addUser')}
            </Button>
          ) : null
        }
      />

      <FilterBar
        storageKey="zm_filters_users"
        sticky
        resultCount={total}
        fields={[
          { key: 'q', label: t('common.search'), type: 'text' },
          {
            key: 'role',
            label: t('common.roles'),
            type: 'select',
            options: ALL_ROLES.map((r) => ({ value: r, label: t(roleI18nKey(r)) })),
          },
          {
            key: 'status',
            label: t('common.status'),
            type: 'select',
            options: [
              { value: 'active', label: t('common.active') },
              { value: 'inactive', label: t('common.inactive') },
              { value: 'deleted', label: t('users.deletedBadge') },
            ],
          },
          { key: 'district', label: t('users.colDistrict'), type: 'text' },
          { key: 'facility_id', label: t('users.colFacility'), type: 'text' },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={() => void load()}
        emptyTitle={t('common.noResults')}
        onClearFilters={() => setParams(new URLSearchParams(), { replace: true })}
        selectedIds={selected}
        onToggleSelect={(id) =>
          setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          })
        }
        onToggleSelectAll={() => {
          if (rows.every((r) => selected.has(r.id))) setSelected(new Set());
          else setSelected(new Set(rows.map((r) => r.id)));
        }}
        onRowClick={(r) => setDetail(r)}
        actionsForRow={actionsForRow}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => {
          const next = new URLSearchParams(params);
          next.set('page', String(p));
          setParams(next, { replace: true });
        }}
        onPageSizeChange={(s) => {
          const next = new URLSearchParams(params);
          next.set('page_size', String(s));
          next.delete('page');
          setParams(next, { replace: true });
        }}
        bulkBar={
          <div className="zm-glass flex flex-wrap items-center gap-2 rounded-[18px] px-3 py-2 text-sm">
            <span className="font-semibold">
              {t('common.selected')}: {selected.size}
            </span>
            {canUpdate ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setConfirm({ kind: 'bulk', action: 'activate' })}>
                  {t('common.activate')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirm({ kind: 'bulk', action: 'deactivate' })}>
                  {t('common.deactivate')}
                </Button>
              </>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const blob = new Blob([JSON.stringify(rows.filter((r) => selected.has(r.id)), null, 2)], {
                  type: 'application/json',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'users-export.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              {t('common.export')}
            </Button>
          </div>
        }
      />

      {/* Create / Edit modal */}
      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setCreatedPassword(null);
        }}
        dirty={formDirty && !createdPassword}
        title={editing ? t('users.editUser') : t('users.addUser')}
        size="lg"
        footer={
          createdPassword ? (
            <Button type="button" onClick={() => { setFormOpen(false); setCreatedPassword(null); }}>
              {t('common.close')}
            </Button>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" form="user-form" loading={saving}>
                {t('common.save')}
              </Button>
            </>
          )
        }
      >
        {createdPassword ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-muted">{t('users.tempPasswordOnce')}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-control border border-border bg-surface-muted px-3 py-2 text-sm">
                {createdPassword}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Copy className="h-4 w-4" />}
                onClick={() => {
                  void navigator.clipboard.writeText(createdPassword);
                  push(t('users.copied'), 'success');
                }}
              >
                {t('users.copy')}
              </Button>
            </div>
          </div>
        ) : (
          <form id="user-form" className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => void submitForm(e)}>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-semibold">{t('users.colName')}</label>
              <Input
                value={form.display_name}
                onChange={(e) => setFormField('display_name', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">{t('login.username')}</label>
              <Input
                value={form.username}
                onChange={(e) => setFormField('username', e.target.value)}
                required={!editing}
                disabled={Boolean(editing)}
                minLength={3}
                maxLength={64}
                autoComplete="username"
              />
              {fieldErrors.username ? <p className="mt-1 text-xs text-danger">{fieldErrors.username}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">{t('users.email')}</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setFormField('email', e.target.value)}
                autoComplete="off"
              />
              {fieldErrors.email ? <p className="mt-1 text-xs text-danger">{fieldErrors.email}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">{t('users.phone')}</label>
              <Input value={form.phone} onChange={(e) => setFormField('phone', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">{t('users.colRole')}</label>
              <select
                className="h-12 w-full rounded-control border border-border bg-surface px-3 text-sm"
                value={form.role}
                onChange={(e) => setFormField('role', e.target.value as UserRole)}
                disabled={Boolean(editing) && !canUpdate}
              >
                {(editing ? ALL_ROLES.filter((r) => assignable.includes(r) || r === editing.role) : assignable).map(
                  (r) => (
                    <option key={r} value={r}>
                      {t(roleI18nKey(r))}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">{t('users.colDistrict')}</label>
              <Input value={form.district} onChange={(e) => setFormField('district', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">{t('users.colFacility')}</label>
              <select
                className="h-12 w-full rounded-control border border-border bg-surface px-3 text-sm"
                value={form.facility_id}
                required={needsFacility}
                onChange={(e) => {
                  const id = e.target.value;
                  const fac = facilities.find((f) => f.facility_id === id);
                  setFormDirty(true);
                  setForm((f) => ({
                    ...f,
                    facility_id: id,
                    district: fac?.district || f.district,
                  }));
                  setFieldErrors((errs) => {
                    const next = { ...errs };
                    delete next.facility_id;
                    return next;
                  });
                }}
              >
                <option value="">{t('users.selectFacility')}</option>
                {facilities.map((f) => (
                  <option key={f.facility_id} value={f.facility_id}>
                    {f.name} ({f.facility_id})
                  </option>
                ))}
              </select>
              {fieldErrors.facility_id ? (
                <p className="mt-1 text-xs text-danger">{fieldErrors.facility_id}</p>
              ) : null}
            </div>
            {needsVillage || form.village ? (
              <div>
                <label className="mb-1 block text-sm font-semibold">{t('users.colVillage')}</label>
                <Input
                  value={form.village}
                  onChange={(e) => setFormField('village', e.target.value)}
                  required={needsVillage}
                />
                {fieldErrors.village ? <p className="mt-1 text-xs text-danger">{fieldErrors.village}</p> : null}
              </div>
            ) : null}
            {editing ? (
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setFormField('active', e.target.checked)}
                />
                {t('common.active')}
              </label>
            ) : (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold">{t('users.tempPassword')}</label>
                <div className="flex gap-2">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={tempPassword}
                    onChange={(e) => {
                      setFormDirty(true);
                      setTempPassword(e.target.value);
                    }}
                    autoComplete="new-password"
                    minLength={10}
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={showPassword ? t('users.hidePassword') : t('users.showPassword')}
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {fieldErrors.password ? <p className="mt-1 text-xs text-danger">{fieldErrors.password}</p> : null}
                <p className="mt-1 text-xs text-ink-muted">{t('users.mustChangeHint')}</p>
              </div>
            )}
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.display_name || t('common.view')}
        size="md"
        testId="user-detail-modal"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setDetail(null)}>
              {t('common.close')}
            </Button>
            {detail && canUpdate && !detail.deleted_at ? (
              <Button
                type="button"
                onClick={() => {
                  setDetail(null);
                  openEdit(detail);
                }}
              >
                {t('common.edit')}
              </Button>
            ) : null}
          </>
        }
      >
        {detail ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">{t('login.username')}</dt>
              <dd className="font-semibold">{detail.username}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t('users.colRole')}</dt>
              <dd>{t(roleI18nKey(detail.role))}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t('users.email')}</dt>
              <dd>{detail.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t('users.phone')}</dt>
              <dd>{detail.phone || '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t('users.colDistrict')}</dt>
              <dd>{detail.district || '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t('users.colFacility')}</dt>
              <dd>{detail.facility_id || '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t('users.colVillage')}</dt>
              <dd>{detail.village || '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t('users.colStatus')}</dt>
              <dd>
                {detail.deleted_at
                  ? t('users.deletedBadge')
                  : detail.active
                    ? t('users.active')
                    : t('users.inactive')}
              </dd>
            </div>
          </dl>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirm?.kind === 'toggle'}
        onClose={() => setConfirm(null)}
        title={
          confirm?.kind === 'toggle' && confirm.row.active
            ? t('users.confirmDeactivate')
            : t('users.confirmActivate')
        }
        description={confirm?.kind === 'toggle' ? confirm.row.display_name : undefined}
        variant="default"
        onConfirm={async () => {
          if (confirm?.kind === 'toggle') await runToggle(confirm.row);
        }}
      />

      <ConfirmDialog
        open={confirm?.kind === 'delete'}
        onClose={() => setConfirm(null)}
        title={t('users.confirmDelete')}
        description={t('users.confirmDeleteHint')}
        variant="danger"
        typeToConfirm={confirm?.kind === 'delete' ? confirm.row.username : undefined}
        confirmLabel={t('common.delete')}
        onConfirm={async () => {
          if (confirm?.kind === 'delete') await runDelete(confirm.row);
        }}
      />

      <ConfirmDialog
        open={confirm?.kind === 'reset'}
        onClose={() => setConfirm(null)}
        title={t('users.confirmReset')}
        description={confirm?.kind === 'reset' ? confirm.row.display_name : undefined}
        onConfirm={async () => {
          if (confirm?.kind === 'reset') await runReset(confirm.row);
        }}
      />

      <ConfirmDialog
        open={confirm?.kind === 'bulk'}
        onClose={() => setConfirm(null)}
        title={
          confirm?.kind === 'bulk' && confirm.action === 'activate'
            ? t('users.confirmActivate')
            : t('users.confirmDeactivate')
        }
        onConfirm={async () => {
          if (confirm?.kind !== 'bulk') return;
          const active = confirm.action === 'activate';
          for (const id of selected) {
            const row = rows.find((r) => r.id === id);
            if (!row || row.deleted_at) continue;
            try {
              await api.patchUser(id, { active, version: row.version });
            } catch {
              /* continue */
            }
          }
          push(t('users.bulkDone'), 'success');
          setSelected(new Set());
          await load();
        }}
      />

      <Modal
        open={Boolean(resetReveal)}
        onClose={() => setResetReveal(null)}
        title={t('users.resetPassword')}
        size="sm"
        footer={
          <Button type="button" onClick={() => setResetReveal(null)}>
            {t('common.close')}
          </Button>
        }
      >
        <p className="mb-2 text-sm text-ink-muted">{t('users.tempPasswordOnce')}</p>
        <div className="flex gap-2">
          <code className="flex-1 rounded-control border border-border bg-surface-muted px-3 py-2 text-sm">
            {resetReveal}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (resetReveal) void navigator.clipboard.writeText(resetReveal);
              push(t('users.copied'), 'success');
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </Modal>

    </WebShell>
  );
}
