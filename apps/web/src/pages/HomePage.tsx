import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, ClipboardList, Stethoscope } from 'lucide-react';
import { ChwShell } from '../components/shells';
import { Button, Card } from '../components/ui';
import { db } from '../db';
import { useAuth } from '../auth/AuthContext';
import { useVoice } from '../voice/VoiceContext';

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const voice = useVoice();
  const [pending, setPending] = useState(0);
  const [alerts, setAlerts] = useState(0);
  const appPath = location.pathname.startsWith('/app');
  const triagePath = appPath ? '/app/triage' : '/m/triage';
  const referralsPath = appPath ? '/app/my-referrals' : '/m/referrals';
  const alertsPath = appPath ? '/app/alerts' : '/m/alerts';

  useEffect(() => {
    void (async () => {
      const refs = await db.referrals.orderBy('created_at').reverse().limit(5).toArray();
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
      <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 min-w-0">
        <p className="text-sm font-semibold text-primary">{t('home.chwLabel')}</p>
        <h2 className="mt-1 text-2xl font-bold leading-tight tracking-[-0.03em] text-ink">
          {user?.display_name || t('home.greeting')}
        </h2>
        <p className="mt-1 truncate text-sm text-ink-muted">
          {user?.village || t('home.village')}{user?.district ? ` · ${user.district}` : ''}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-[1.4fr_.6fr]">
      <Card className="bg-[linear-gradient(135deg,rgba(11,60,93,0.08),rgba(20,128,122,0.12))] p-5 md:p-7">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white">
          <Stethoscope className="h-7 w-7" strokeWidth={1.8} />
        </div>
        <h3 className="mt-4 text-xl font-semibold text-ink">{t('home.newPatient')}</h3>
        <Button
          className="mt-4 min-h-16 w-full text-lg"
          size="lg"
          onClick={() => {
            voice.unlock();
            navigate(triagePath);
          }}
          rightIcon={<ArrowRight className="h-5 w-5" />}
        >
          {t('nav.newTriage')}
        </Button>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
        <button type="button" className="text-left" onClick={() => navigate(referralsPath)}>
          <Card className="h-full p-4" hover>
            <ClipboardList className="h-8 w-8 text-primary" strokeWidth={1.75} />
            <p className="mt-3 text-3xl font-bold tabular-nums">{pending}</p>
            <p className="mt-1 font-semibold">{t('home.pendingReferrals')}</p>
          </Card>
        </button>
        <button type="button" className="text-left" onClick={() => navigate(alertsPath)}>
          <Card className="h-full p-4" hover>
            <Bell className="h-8 w-8 text-warning" strokeWidth={1.75} />
            <p className="mt-3 text-3xl font-bold tabular-nums">{alerts}</p>
            <p className="mt-1 font-semibold">{t('home.openAlerts')}</p>
          </Card>
        </button>
      </div>
      </div>
      </div>
    </ChwShell>
  );
}
