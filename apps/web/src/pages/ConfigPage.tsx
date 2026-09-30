import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useCan } from '../auth/permissions';
import { WebShell } from '../components/shells';
import { useToast } from '../components/ToastProvider';
import { Button, Card, EmptyState, Input, Skeleton } from '../components/ui';

export function ConfigPage() {
  const { t } = useTranslation();
  const { push } = useToast();
  const canUpdate = useCan('config:update');
  const [rows, setRows] = useState<{ key: string; value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [sla, setSla] = useState('24');
  const [label, setLabel] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getConfig();
      setRows(data);
      const found = data.find((r) => r.key === 'sla_hours');
      if (found) {
        setSla(found.value);
        setLabel(found.label);
      }
    } catch {
      push(t('common.error'), 'danger');
    } finally {
      setLoading(false);
    }
  }, [push, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.patchConfig('sla_hours', sla);
      push(t('common.save'), 'success');
      await load();
    } catch {
      push(t('common.error'), 'danger');
    }
  };

  return (
    <WebShell title={t('nav.settings')} crumbs={[t('nav.settings')]}>
      <p className="mb-4 text-sm text-ink-muted">{label || t('common.disclaimer')}</p>
      {loading ? (
        <Skeleton className="h-40" />
      ) : rows.length === 0 ? (
        <EmptyState title={t('common.empty')} />
      ) : (
        <Card className="max-w-md p-5">
          <form className="space-y-4" onSubmit={(e) => void save(e)}>
            <label className="block text-sm">
              <span className="mb-1 block text-ink-muted">sla_hours</span>
              <Input value={sla} onChange={(e) => setSla(e.target.value)} disabled={!canUpdate} />
            </label>
            <Button type="submit" disabled={!canUpdate}>
              {t('common.save')}
            </Button>
          </form>
        </Card>
      )}
    </WebShell>
  );
}
