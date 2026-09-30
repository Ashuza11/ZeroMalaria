import { AnimatePresence, motion } from 'framer-motion';
import { Inbox, Siren } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { WebShell } from '../components/shells';
import { useToast } from '../components/ToastProvider';
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  SegmentedControl,
  Skeleton,
  StatusPill,
  SyntheticBadge,
  Tabs,
} from '../components/ui';
import { relativeTime } from '../lib/cn';
import { formatPatientLine } from '../lib/format';
import { cn } from '../lib/cn';

type Referral = {
  id: string;
  decision: string;
  age_months: number;
  sex: string;
  summary: string;
  reasons: string[];
  status: string;
  overdue: boolean;
  created_at: string;
  temperature_c?: number;
  fever_days?: number;
  tdr_result?: string;
};

export function FacilityPage() {
  const { t } = useTranslation();
  const { push } = useToast();
  const [rows, setRows] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState('all');
  const [highlight, setHighlight] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.referrals({ facility_id: 'HC-BUG-01' });
      setRows((prev) => {
        const prevIds = new Set(prev.map((p) => p.id));
        const newest = data.find((d: Referral) => !prevIds.has(d.id));
        if (newest) {
          setHighlight(newest.id);
          window.setTimeout(() => setHighlight(null), 1200);
        }
        return data;
      });
      setError('');
      if (!selectedId && data[0]) setSelectedId(data[0].id);
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [selectedId, t]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(id);
  }, [load]);

  const filtered = useMemo(() => {
    if (tab === 'urgent') return rows.filter((r) => r.decision === 'urgent_refer');
    if (tab === 'new') return rows.filter((r) => r.status === 'sent');
    if (tab === 'overdue') return rows.filter((r) => r.overdue || r.status === 'sent');
    return rows;
  }, [rows, tab]);

  const selected = rows.find((r) => r.id === selectedId) || null;
  const counts = {
    new: rows.filter((r) => r.status === 'sent').length,
    urgent: rows.filter((r) => r.decision === 'urgent_refer').length,
    notArrived: rows.filter((r) => r.status === 'sent' || r.overdue).length,
  };

  const patch = async (id: string, status: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await api.patchStatus(id, status);
      push(t('facility.updated'), 'success');
      await load();
    } catch {
      push(t('common.error'), 'danger');
      await load();
    }
  };

  return (
    <WebShell title={t('facility.title')} crumbs={['ZeroMalaria', t('nav.referralsInbox')]}>
      <PageHeader
        title={t('facility.title')}
        subtitle={t('facility.selectPrompt')}
        badge={<SyntheticBadge label={t('common.synthetic')} />}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase text-ink-muted">{t('facility.newCount')}</p>
          <p className="mt-1 tabular text-2xl font-semibold">{counts.new}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-ink-muted">{t('facility.urgentCount')}</p>
          <p className="mt-1 tabular text-2xl font-semibold text-danger">{counts.urgent}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-ink-muted">{t('facility.notArrived')}</p>
          <p className="mt-1 tabular text-2xl font-semibold text-warning">{counts.notArrived}</p>
        </Card>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'all', label: t('common.all'), count: rows.length },
          { id: 'new', label: t('facility.newCount'), count: counts.new },
          { id: 'urgent', label: t('facility.urgentCount'), count: counts.urgent },
          { id: 'overdue', label: t('facility.notArrived'), count: counts.notArrived },
        ]}
      />

      {loading ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[340px_1fr]">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : null}
      {error ? <Card className="mt-4 border-danger/30 text-danger">{error}</Card> : null}

      {!loading && !error ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <EmptyState icon={<Inbox className="h-8 w-8" />} title={t('facility.empty')} />
            ) : null}
            <AnimatePresence>
              {filtered.map((row) => (
                <motion.button
                  key={row.id}
                  type="button"
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedId(row.id)}
                  className={cn(
                    'w-full rounded-card border p-3 text-left shadow-card transition',
                    selectedId === row.id ? 'border-primary bg-primary-soft/40' : 'border-border bg-surface hover:bg-surface-muted',
                    highlight === row.id && 'ring-2 ring-accent',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {formatPatientLine(row.age_months, row.sex, t)}
                      </p>
                      <p className="text-xs text-ink-muted">{relativeTime(row.created_at)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {row.decision === 'urgent_refer' ? (
                        <Badge tone="danger">
                          <Siren className="h-3 w-3" /> {t('status.urgent')}
                        </Badge>
                      ) : (
                        <StatusPill status="refer" />
                      )}
                      <StatusPill status={row.status as any} />
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>

          <Card className="min-h-[420px]">
            {!selected ? (
              <EmptyState icon={<Inbox className="h-8 w-8" />} title={t('facility.selectPrompt')} />
            ) : (
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {formatPatientLine(selected.age_months, selected.sex, t)}
                    </h2>
                    <p className="mt-1 text-sm text-ink-muted">{selected.summary}</p>
                  </div>
                  <StatusPill status={selected.decision as any} />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-control bg-surface-muted p-3 text-sm">
                    <p className="text-ink-muted">Status</p>
                    <p className="font-semibold capitalize">{selected.status}</p>
                  </div>
                  <div className="rounded-control bg-surface-muted p-3 text-sm">
                    <p className="text-ink-muted">Sent</p>
                    <p className="font-semibold">{relativeTime(selected.created_at)}</p>
                  </div>
                  <div className="rounded-control bg-surface-muted p-3 text-sm">
                    <p className="text-ink-muted">{t('facility.notArrived')}</p>
                    <p className="font-semibold">{selected.overdue || selected.status === 'sent' ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                <h3 className="mt-5 text-sm font-semibold">{t('result.why')}</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
                  {selected.reasons?.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <div className="mt-6">
                  <p className="mb-2 text-sm font-semibold">Update status</p>
                  <SegmentedControl
                    value={
                      selected.status === 'treated'
                        ? 'treated'
                        : selected.status === 'arrived'
                          ? 'arrived'
                          : selected.status === 'received'
                            ? 'received'
                            : 'received'
                    }
                    onChange={(v) => void patch(selected.id, v)}
                    options={[
                      { value: 'received', label: t('facility.markReceived') },
                      { value: 'arrived', label: t('facility.markArrived') },
                      { value: 'treated', label: t('facility.markTreated') },
                    ]}
                  />
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : null}
    </WebShell>
  );
}
