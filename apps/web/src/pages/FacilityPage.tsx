import { AnimatePresence, motion } from 'framer-motion';
import { Inbox, Siren, Sparkles, UserCheck } from 'lucide-react';
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
  Tabs,
  Button,
} from '../components/ui';
import { relativeTime } from '../lib/relativeTime';
import { formatPatientLine } from '../lib/format';
import { cn } from '../lib/cn';
import { useAuth } from '../auth/AuthContext';
import { useLiveEventRefresh } from '../events/EventContext';
import type { ReferralMessage } from '../api/client';

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
  other_symptoms?: string;
  triggered_rules?: string[];
  protocol_reference?: string;
  ai_brief?: string;
};

export function FacilityPage() {
  const { t } = useTranslation();
  const { push } = useToast();
  const { user } = useAuth();
  const [rows, setRows] = useState<Referral[]>([]);
  const [messages, setMessages] = useState<ReferralMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(false);
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

  useLiveEventRefresh(
    useCallback(() => {
      void load();
    }, [load]),
    ['referral.created', 'referral.status_changed', 'referral.message'],
  );

  const loadMessages = useCallback(
    async (referralId: string) => {
      if (!user) {
        setMessages([]);
        return;
      }
      setMessagesLoading(true);
      try {
        const data = await api.listReferralMessages(referralId);
        setMessages(data);
      } catch {
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    if (selectedId) void loadMessages(selectedId);
    else setMessages([]);
  }, [selectedId, loadMessages]);

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

  const sendMessage = async (text: string) => {
    if (!selected || !text.trim() || !user) return;
    try {
      await api.postReferralMessage(selected.id, text.trim());
      setMessageDraft('');
      push(t('messages.sent'), 'success');
      await loadMessages(selected.id);
    } catch {
      push(t('common.error'), 'danger');
    }
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
                    <p className="mt-1 text-sm text-ink-muted">{relativeTime(selected.created_at)}</p>
                  </div>
                  <StatusPill status={selected.decision as any} />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-control bg-surface-muted p-3 text-sm">
                    <p className="text-ink-muted">Status</p>
                    <p className="font-semibold capitalize">{selected.status}</p>
                  </div>
                  <div className="rounded-control bg-surface-muted p-3 text-sm">
                    <p className="text-ink-muted">{t('referrals.sent')}</p>
                    <p className="font-semibold">{relativeTime(selected.created_at)}</p>
                  </div>
                  <div className="rounded-control bg-surface-muted p-3 text-sm">
                    <p className="text-ink-muted">{t('facility.notArrived')}</p>
                    <p className="font-semibold">
                      {selected.overdue || selected.status === 'sent' ? t('common.yes') : t('common.no')}
                    </p>
                  </div>
                </div>
                {selected.status !== 'arrived' && selected.status !== 'treated' ? (
                  <Button
                    className="mt-4 min-h-14 w-full text-base"
                    leftIcon={<UserCheck className="h-5 w-5" aria-hidden />}
                    onClick={() => void patch(selected.id, 'arrived')}
                  >
                    {t('facility.confirmArrival')}
                  </Button>
                ) : (
                  <div className="mt-4 flex items-center gap-2 rounded-control bg-success-soft p-3 font-semibold text-success">
                    <UserCheck className="h-5 w-5" aria-hidden />
                    {t('facility.arrivalConfirmed')}
                  </div>
                )}
                <div className="mt-5 rounded-card border-2 border-info/40 bg-info-soft/30 p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-info" aria-hidden />
                    <h3 className="font-semibold">{t('facility.clinicalBrief')}</h3>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                    {selected.ai_brief || selected.summary}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-warning">{t('result.aiVerify')}</p>
                </div>
                <h3 className="mt-5 text-sm font-semibold">{t('facility.patientDetails')}</h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-control bg-surface-muted p-3 text-sm">
                    <p className="text-ink-muted">{t('triage.temperature')}</p>
                    <p className="font-semibold">{selected.temperature_c == null ? '—' : `${selected.temperature_c}°C`}</p>
                  </div>
                  <div className="rounded-control bg-surface-muted p-3 text-sm">
                    <p className="text-ink-muted">{t('triage.feverDays')}</p>
                    <p className="font-semibold">{selected.fever_days ?? '—'}</p>
                  </div>
                  <div className="rounded-control bg-surface-muted p-3 text-sm">
                    <p className="text-ink-muted">{t('triage.tdr')}</p>
                    <p className="font-semibold capitalize">{selected.tdr_result || '—'}</p>
                  </div>
                </div>
                {selected.other_symptoms ? (
                  <div className="mt-2 rounded-control bg-surface-muted p-3 text-sm">
                    <p className="text-ink-muted">{t('facility.otherSymptoms')}</p>
                    <p className="mt-1 font-medium">{selected.other_symptoms}</p>
                  </div>
                ) : null}
                <h3 className="mt-5 text-sm font-semibold">{t('result.why')}</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
                  {selected.reasons?.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                {selected.triggered_rules?.length ? (
                  <p className="mt-3 text-xs text-ink-muted">
                    {t('facility.rbcRules')}: {selected.triggered_rules.join(', ')}
                  </p>
                ) : null}
                <div className="mt-6 border-t border-border pt-5">
                  <h3 className="text-sm font-semibold">{t('messages.threadTitle')}</h3>
                  <p className="mt-1 text-xs text-ink-muted">{t('messages.threadHint')}</p>
                  <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                    {messagesLoading ? <Skeleton className="h-16" /> : null}
                    {!messagesLoading && messages.length === 0 ? (
                      <p className="text-sm text-ink-muted">{t('messages.empty')}</p>
                    ) : null}
                    {messages.map((m) => (
                      <div key={m.id} className="rounded-control bg-surface-muted px-3 py-2 text-sm">
                        <p className="text-xs font-semibold uppercase text-ink-muted">{m.sender_role}</p>
                        <p>{m.body}</p>
                        <p className="text-xs text-ink-muted">{relativeTime(m.created_at)}</p>
                      </div>
                    ))}
                  </div>
                  {user ? (
                    <>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" type="button" onClick={() => void sendMessage(t('messages.chipTransport'))}>
                          {t('messages.chipTransport')}
                        </Button>
                        <Button size="sm" variant="secondary" type="button" onClick={() => void sendMessage(t('messages.chipMoreInfo'))}>
                          {t('messages.chipMoreInfo')}
                        </Button>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <input
                          className="min-w-0 flex-1 rounded-control border border-border bg-surface px-3 py-2 text-sm"
                          placeholder={t('messages.customPlaceholder')}
                          value={messageDraft}
                          onChange={(e) => setMessageDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void sendMessage(messageDraft);
                          }}
                        />
                        <Button type="button" size="sm" onClick={() => void sendMessage(messageDraft)}>
                          {t('messages.send')}
                        </Button>
                      </div>
                    </>
                  ) : null}
                </div>
                <div className="mt-6">
                  <p className="mb-2 text-sm font-semibold">{t('facility.updateStatus')}</p>
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
