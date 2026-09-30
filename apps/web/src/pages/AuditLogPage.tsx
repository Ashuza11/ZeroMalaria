import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { FilterBar } from '../components/FilterBar';
import { WebShell } from '../components/shells';
import { useToast } from '../components/ToastProvider';
import { Card, EmptyState, Skeleton } from '../components/ui';

export function AuditLogPage() {
  const { t } = useTranslation();
  const { push } = useToast();
  const [params] = useSearchParams();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listAuditLogs({
        page: params.get('page') || 1,
        page_size: 20,
        actor: params.get('actor') || undefined,
        action: params.get('action') || undefined,
        resource: params.get('resource') || undefined,
        date_from: params.get('date_from') || undefined,
        date_to: params.get('date_to') || undefined,
      });
      setRows(data.items);
      setTotal(data.total);
    } catch {
      push(t('common.error'), 'danger');
    } finally {
      setLoading(false);
    }
  }, [params, push, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <WebShell title={t('common.auditLog')} crumbs={[t('nav.settings'), t('common.auditLog')]}>
      <FilterBar
        storageKey="zm_filters_audit"
        resultCount={total}
        fields={[
          { key: 'actor', label: t('auth.username'), type: 'text' },
          { key: 'action', label: t('common.change'), type: 'text' },
          { key: 'resource', label: t('common.status'), type: 'text' },
          { key: 'date_from', label: 'From', type: 'date' },
          { key: 'date_to', label: 'To', type: 'date' },
        ]}
      />
      {loading ? (
        <Skeleton className="h-64" />
      ) : rows.length === 0 ? (
        <EmptyState title={t('common.empty')} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="sticky top-0 border-b border-border bg-surface-muted text-xs uppercase text-ink-muted">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">{t('auth.username')}</th>
                <th className="px-3 py-2">Resource</th>
                <th className="px-3 py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.id)} className="border-b border-border/60">
                  <td className="px-3 py-2 font-mono text-xs">{String(row.id)}</td>
                  <td className="max-w-[10rem] truncate px-3 py-2" title={String(row.action)}>
                    {String(row.action)}
                  </td>
                  <td className="px-3 py-2">{String(row.actor_username || '')}</td>
                  <td className="max-w-[12rem] truncate px-3 py-2" title={`${row.resource_type}:${row.resource_id}`}>
                    {String(row.resource_type || '')}:{String(row.resource_id || '')}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-muted">{String(row.created_at || '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </WebShell>
  );
}
