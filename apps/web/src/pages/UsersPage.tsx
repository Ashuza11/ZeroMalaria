import { Plus, UserCog } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, type AuthUser } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { WebShell } from '../components/shells';
import { useToast } from '../components/ToastProvider';
import { Badge, Button, Card, EmptyState, Input, Skeleton } from '../components/ui';

export function UsersPage() {
  const { t } = useTranslation();
  const { user: actor } = useAuth();
  const { push } = useToast();
  const [rows, setRows] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: '',
    password: 'demo1234',
    display_name: '',
    village: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api.listUsers());
    } catch {
      push(t('common.error'), 'danger');
    } finally {
      setLoading(false);
    }
  }, [push, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleActive = async (row: AuthUser) => {
    setConfirmId(null);
    try {
      await api.patchUser(row.id, { active: !row.active });
      push(row.active ? t('users.deactivated') : t('users.activated'), 'success');
      await load();
    } catch {
      push(t('common.error'), 'danger');
    }
  };

  const createChw = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser({
        username: form.username.trim(),
        password: form.password,
        display_name: form.display_name.trim(),
        village: form.village.trim(),
        role: 'chw',
      });
      push(t('users.created'), 'success');
      setDrawer(false);
      setForm({ username: '', password: 'demo1234', display_name: '', village: '' });
      await load();
    } catch {
      push(t('common.error'), 'danger');
    }
  };

  return (
    <WebShell title={t('users.title')} crumbs={[t('nav.settings'), t('users.title')]}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">{t('users.subtitle')}</p>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setDrawer(true)}>
          {t('users.addChw')}
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : rows.length === 0 ? (
        <EmptyState icon={<UserCog className="h-8 w-8" />} title={t('common.empty')} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-surface-muted text-xs uppercase text-ink-muted">
              <tr>
                <th className="px-4 py-3">{t('users.colName')}</th>
                <th className="px-4 py-3">{t('users.colRole')}</th>
                <th className="px-4 py-3">{t('users.colDistrict')}</th>
                <th className="px-4 py-3">{t('users.colFacility')}</th>
                <th className="px-4 py-3">{t('users.colVillage')}</th>
                <th className="px-4 py-3">{t('users.colStatus')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="px-4 py-3 font-semibold">{row.display_name}</td>
                  <td className="px-4 py-3 capitalize">{row.role}</td>
                  <td className="px-4 py-3">{row.district || '—'}</td>
                  <td className="px-4 py-3">{row.facility_id || '—'}</td>
                  <td className="px-4 py-3">{row.village || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge tone={row.active ? 'success' : 'neutral'}>
                      {row.active ? t('users.active') : t('users.inactive')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {confirmId === row.id ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                          {t('common.cancel')}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => void toggleActive(row)}>
                          {t('common.confirm')}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={row.id === actor?.id}
                        onClick={() => setConfirmId(row.id)}
                      >
                        {row.active ? t('users.deactivate') : t('users.activate')}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {drawer ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label={t('common.cancel')}
            onClick={() => setDrawer(false)}
          />
          <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-lift">
            <div className="border-b border-border p-4">
              <h2 className="text-lg font-semibold">{t('users.addChw')}</h2>
            </div>
            <form onSubmit={(e) => void createChw(e)} className="flex flex-1 flex-col gap-3 p-4">
              <div>
                <label className="mb-1 block text-sm font-semibold">{t('users.colName')}</label>
                <Input
                  value={form.display_name}
                  onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">{t('login.username')}</label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">{t('login.password')}</label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">{t('users.colVillage')}</label>
                <Input
                  value={form.village}
                  onChange={(e) => setForm((f) => ({ ...f, village: e.target.value }))}
                />
              </div>
              <div className="mt-auto flex gap-2 pt-4">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setDrawer(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" className="flex-1">
                  {t('common.confirm')}
                </Button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </WebShell>
  );
}
