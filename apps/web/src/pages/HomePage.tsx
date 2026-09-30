import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ClipboardPlus, Users } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChwShell } from '../components/shells';
import { Button, Card, EmptyState, StatusPill } from '../components/ui';
import { db } from '../db';
import type { LocalReferral } from '../types';
import { relativeTime } from '../lib/cn';
import { formatPatientLine } from '../lib/format';
import { listContainer, listItem } from '../lib/motion';

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [recent, setRecent] = useState<LocalReferral[]>([]);
  const [pending, setPending] = useState(0);
  const [alerts, setAlerts] = useState(0);

  useEffect(() => {
    void (async () => {
      const refs = await db.referrals.orderBy('created_at').reverse().limit(5).toArray();
      setRecent(refs);
      setPending(refs.filter((r) => r.status === 'sent' || r.status === 'received').length);
      const cutoff = Date.now() - 24 * 3600 * 1000;
      setAlerts(
        refs.filter(
          (r) =>
            !r.arrived_at &&
            ['sent', 'received'].includes(r.status) &&
            new Date(r.created_at).getTime() <= cutoff,
        ).length,
      );
    })();
  }, []);

  return (
    <ChwShell>
      <div className="mb-4">
        <p className="text-sm text-ink-muted">{t('home.chwLabel')} · {t('home.village')}</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">{t('home.greeting')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('home.subtitle')}</p>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {[
          { label: t('home.todayPatients'), value: recent.length || 0, icon: Users },
          { label: t('home.pendingReferrals'), value: pending, icon: ClipboardPlus },
          { label: t('home.openAlerts'), value: alerts, icon: AlertTriangle },
        ].map((s) => (
          <Card key={s.label} className="p-3">
            <s.icon className="h-4 w-4 text-ink-muted" strokeWidth={1.75} />
            <p className="mt-2 tabular text-xl font-semibold">{s.value}</p>
            <p className="text-[11px] text-ink-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-4 border-primary/20 bg-primary-soft/40 p-5" hover>
        <div className="flex items-start gap-3">
          <div className="rounded-control bg-primary p-3 text-primary-foreground">
            <ClipboardPlus className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-ink">{t('home.newPatient')}</h3>
            <p className="mt-1 text-sm text-ink-muted">{t('home.subtitle')}</p>
            <Button className="mt-4 w-full" size="lg" onClick={() => navigate('/m/triage')} rightIcon={<ArrowRight className="h-4 w-4" />}>
              {t('home.newPatient')}
            </Button>
          </div>
        </div>
      </Card>

      <h3 className="mb-2 text-sm font-semibold text-ink">{t('home.recent')}</h3>
      {recent.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" strokeWidth={1.75} />}
          title={t('referrals.empty')}
          description={t('home.subtitle')}
        />
      ) : (
        <motion.div
          className="space-y-2"
          variants={reduce ? undefined : listContainer}
          initial="initial"
          animate="animate"
        >
          {recent.map((row) => (
            <motion.div key={row.client_uuid} variants={reduce ? undefined : listItem}>
              <Card className="flex items-center justify-between gap-3 p-3" hover>
                <div>
                  <p className="text-sm font-semibold">
                    {formatPatientLine(row.age_months, row.sex, t)}
                  </p>
                  <p className="text-xs text-ink-muted">{relativeTime(row.created_at)}</p>
                </div>
                <StatusPill status={row.decision} />
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </ChwShell>
  );
}
