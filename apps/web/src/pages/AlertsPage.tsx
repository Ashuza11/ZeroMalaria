import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BellRing, Check } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { api } from '../api/client';
import { ChwShell } from '../components/shells';
import { Button, Card, EmptyState, Skeleton, StatusPill } from '../components/ui';
import { db } from '../db';
import { relativeTime } from '../lib/cn';
import { formatPatientLine } from '../lib/format';
import { listContainer, listItem } from '../lib/motion';

type AlertItem = {
  message: string;
  severity: 'high' | 'medium';
  referral: {
    client_uuid: string;
    age_months: number;
    sex: string;
    created_at: string;
    decision: string;
  };
};

export function AlertsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [items, setItems] = useState<AlertItem[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const local = await db.referrals.toArray();
      const cutoff = Date.now() - 24 * 3600 * 1000;
      const localAlerts: AlertItem[] = local
        .filter(
          (r) =>
            !r.arrived_at &&
            ['sent', 'received'].includes(r.status) &&
            new Date(r.created_at).getTime() <= cutoff,
        )
        .map((r) => ({
          message: t('alerts.notArrived'),
          severity: r.decision === 'urgent_refer' ? 'high' : 'medium',
          referral: {
            client_uuid: r.client_uuid,
            age_months: r.age_months,
            sex: r.sex,
            created_at: r.created_at,
            decision: r.decision,
          },
        }));
      try {
        const remote = await api.alerts('CHW-BUG-01-01');
        const mapped: AlertItem[] = remote.map((a: any) => ({
          message: a.message || t('alerts.notArrived'),
          severity: a.referral?.decision === 'urgent_refer' ? 'high' : 'medium',
          referral: a.referral,
        }));
        const byId = new Map<string, AlertItem>();
        [...localAlerts, ...mapped].forEach((a) => byId.set(a.referral.client_uuid, a));
        setItems([...byId.values()]);
      } catch {
        setItems(localAlerts);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [t]);

  const visible = items.filter((i) => !dismissed.includes(i.referral.client_uuid));
  const high = visible.filter((i) => i.severity === 'high');
  const medium = visible.filter((i) => i.severity === 'medium');

  return (
    <ChwShell title={t('alerts.title')}>
      {loading ? <Skeleton className="h-32" /> : null}
      {!loading && visible.length === 0 ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 120 80" className="h-16 w-28 text-accent" aria-hidden>
              <rect x="10" y="30" width="100" height="40" rx="12" fill="currentColor" opacity="0.12" />
              <circle cx="60" cy="28" r="16" fill="currentColor" opacity="0.2" />
              <path d="M48 28h24M52 50h16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          }
          title={t('alerts.empty')}
          description={t('alerts.emptyHint')}
        />
      ) : null}

      {[
        { title: t('alerts.high'), rows: high },
        { title: t('alerts.medium'), rows: medium },
      ].map((group) =>
        group.rows.length ? (
          <div key={group.title} className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{group.title}</h3>
            <motion.div className="space-y-2" variants={reduce ? undefined : listContainer} initial="initial" animate="animate">
              {group.rows.map((item) => (
                <motion.div key={item.referral.client_uuid} variants={reduce ? undefined : listItem} layout>
                  <Card className="border-l-4 border-l-warning">
                    <div className="flex items-start gap-3">
                      <BellRing className="mt-0.5 h-5 w-5 text-warning" strokeWidth={1.75} />
                      <div className="flex-1">
                        <p className="font-semibold text-ink">{item.message}</p>
                        <p className="mt-1 text-sm text-ink-muted">
                          {formatPatientLine(item.referral.age_months, item.referral.sex, t)} ·{' '}
                          {relativeTime(item.referral.created_at)}
                        </p>
                        <div className="mt-2">
                          <StatusPill status={item.referral.decision as any} />
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" onClick={() => navigate('/m/referrals')}>
                            {t('common.followUp')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<Check className="h-4 w-4" />}
                            onClick={() => setDismissed((d) => [...d, item.referral.client_uuid])}
                          >
                            {t('common.confirm')}
                          </Button>
                        </div>
                      </div>
                      <AlertTriangle className="h-4 w-4 text-warning" strokeWidth={1.75} />
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        ) : null,
      )}
    </ChwShell>
  );
}
