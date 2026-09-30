import { Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { WebShell } from '../components/shells';
import { Card, EmptyState, PageHeader } from '../components/ui';

type ActivitySnap = {
  calls?: number;
  fallbacks?: number;
  escalations?: number;
  consults?: number;
  asks?: number;
  rejected_outputs?: number;
  average_latency_ms?: number;
  by_provider?: Record<string, number>;
  synthetic_note?: string;
  as_of?: string;
};

export function AiActivityPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<ActivitySnap | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    void api
      .aiActivity()
      .then((res) => setData(res as ActivitySnap))
      .catch(() => setErr(true));
  }, []);

  return (
    <WebShell title={t('ai.activityTitle')} crumbs={[t('common.appName'), t('ai.activityTitle')]}>
      <PageHeader title={t('ai.activityTitle')} subtitle={t('ai.activitySubtitle')} />
      <p className="mb-4 text-xs text-ink-muted">{t('ai.syntheticMetrics')}</p>
      {err || !data ? (
        <EmptyState icon={<Activity className="h-8 w-8" />} title={t('common.empty')} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [t('ai.activityCalls'), data.calls],
            [t('ai.activityFallbacks'), data.fallbacks],
            [t('ai.activityEscalations'), data.escalations],
            [t('ai.activityConsults'), data.consults],
            [t('ai.activityAsks'), data.asks],
            [t('ai.activityRejected'), data.rejected_outputs],
            [t('ai.activityAvgLatency'), `${data.average_latency_ms ?? 0} ms`],
          ].map(([label, value]) => (
            <Card key={String(label)}>
              <p className="text-xs font-semibold uppercase text-ink-muted">{label}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{value ?? 0}</p>
            </Card>
          ))}
          <Card className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase text-ink-muted">{t('ai.activityProviders')}</p>
            <ul className="mt-2 space-y-1 text-sm">
              {Object.entries(data.by_provider || {}).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span className="font-mono">{v}</span>
                </li>
              ))}
              {!Object.keys(data.by_provider || {}).length ? (
                <li className="text-ink-muted">{t('common.empty')}</li>
              ) : null}
            </ul>
          </Card>
        </div>
      )}
    </WebShell>
  );
}
