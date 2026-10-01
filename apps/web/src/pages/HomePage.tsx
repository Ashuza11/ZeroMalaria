import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, ClipboardList, Stethoscope } from 'lucide-react';
import { Button, Card } from '../components/ui';
import { db } from '../db';
import { useAuth } from '../auth/AuthContext';
import { useVoice } from '../voice/VoiceContext';
import { AppOrChwShell } from '../hooks/useAppShell';

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
    <AppOrChwShell title={t('nav.home')} crumbs={[t('nav.home')]}>
      <div className="mx-auto w-full max-w-[1180px]">
      <section className="mb-6 overflow-hidden rounded-[28px] bg-gradient-to-r from-[#0d5578] via-[#126f82] to-[#138578] p-6 text-white shadow-card sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">{t('home.chwLabel')}</p>
            <h2 className="mt-2 text-3xl font-bold leading-tight tracking-[-0.03em] sm:text-4xl">
              {user?.display_name || t('home.greeting')}
            </h2>
            <p className="mt-2 text-sm text-white/80">
              {user?.village || t('home.village')}{user?.district ? ` · ${user.district}` : ''}
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">{t('home.subtitle')}</p>
          </div>
          <Button
            className="min-h-14 w-full shrink-0 bg-white px-6 text-base text-primary hover:bg-white/90 md:w-auto"
            size="lg"
            onClick={() => {
              voice.unlock();
              navigate(triagePath);
            }}
            rightIcon={<ArrowRight className="h-5 w-5" />}
          >
            {t('nav.newTriage')}
          </Button>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-[1.35fr_.65fr]">
      <Card className="bg-[linear-gradient(135deg,rgba(11,60,93,0.07),rgba(20,128,122,0.12))] p-5 md:p-8">
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
    </AppOrChwShell>
  );
}
