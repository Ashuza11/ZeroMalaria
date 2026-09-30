import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useCan } from '../auth/permissions';
import { roleI18nKey } from '../auth/roleAccess';
import { WebShell } from '../components/shells';
import { useToast } from '../components/ToastProvider';
import { Button, Card, EmptyState, Skeleton } from '../components/ui';

export function PermissionsPage() {
  const { t } = useTranslation();
  const { push } = useToast();
  const canUpdatePerms = useCan('permissions:update');
  const canUpdateRoles = useCan('roles:update');
  const canManage = canUpdatePerms || canUpdateRoles;
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [granted, setGranted] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<{ role: string; code: string; allowed: boolean } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.rbacMatrix();
      setRoles(data.roles);
      setPermissions(data.permissions);
      setGranted(data.granted);
    } catch {
      push(t('common.error'), 'danger');
    } finally {
      setLoading(false);
    }
  }, [push, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async () => {
    if (!pending) return;
    try {
      await api.rbacToggle(pending.role, pending.code, pending.allowed);
      push(t('common.save'), 'success');
      setPending(null);
      await load();
    } catch {
      push(t('common.error'), 'danger');
    }
  };

  return (
    <WebShell title={t('common.permissions')} crumbs={[t('nav.settings'), t('common.permissions')]}>
      <p className="mb-4 text-sm text-ink-muted">{t('common.roles')}</p>
      {loading ? (
        <Skeleton className="h-80" />
      ) : permissions.length === 0 ? (
        <EmptyState title={t('common.empty')} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="sticky top-0 border-b border-border bg-surface-muted text-ink-muted">
              <tr>
                <th className="px-3 py-2">{t('common.permissions')}</th>
                {roles.map((r) => (
                  <th key={r} className="px-2 py-2 text-center" title={r}>
                    <span className="block max-w-[7rem] truncate">{t(roleI18nKey(r))}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((code) => (
                <tr key={code} className="border-b border-border/60">
                  <td className="px-3 py-2 font-mono text-[11px] text-ink">{code}</td>
                  {roles.map((role) => {
                    const locked = role === 'SUPER_ADMIN';
                    const on = locked || (granted[role] || []).includes(code);
                    return (
                      <td key={`${role}-${code}`} className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={locked || !canManage}
                          aria-label={`${role} ${code}`}
                          onChange={(e) =>
                            setPending({ role, code, allowed: e.target.checked })
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="max-w-md space-y-4 p-5">
            <p className="text-sm text-ink">
              {pending.role} — {pending.code} → {String(pending.allowed)}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPending(null)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={() => void toggle()}>{t('common.confirm')}</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </WebShell>
  );
}
