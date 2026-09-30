import QRCode from 'qrcode';
import { Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { DESKTOP_MIN_WIDTH, setPreferredView } from '../auth/roleAccess';
import { Button, Disclaimer } from '../components/ui';

/** Desktop entry for scanning a QR to open the phone CHW app. Phones redirect to /m/home. */
export function MobileLandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [qr, setQr] = useState('');
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= DESKTOP_MIN_WIDTH,
  );

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= DESKTOP_MIN_WIDTH);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < DESKTOP_MIN_WIDTH) {
      navigate(user ? '/m/home' : '/login', { replace: true });
      return;
    }
    const target = `${window.location.origin}/m/home`;
    void QRCode.toDataURL(target, { margin: 1, width: 220 }).then(setQr);
  }, [navigate, user]);

  if (typeof window !== 'undefined' && window.innerWidth < DESKTOP_MIN_WIDTH) {
    return <Navigate to={user ? '/m/home' : '/login'} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4 py-10">
      <div className="grid max-w-4xl items-center gap-10 lg:grid-cols-2">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-control bg-primary text-primary-foreground">
              <Activity className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <h1 className="text-2xl font-bold">{t('common.appName')}</h1>
          </div>
          <p className="text-ink-muted">{t('login.mobileLandingHint')}</p>
          {isDesktop ? (
            <div className="mt-4 rounded-card border border-primary/20 bg-primary-soft p-4" data-testid="open-web-banner">
              <p className="text-sm text-ink">{t('common.openWebVersionHint')}</p>
              <Button
                className="mt-3"
                size="sm"
                onClick={() => {
                  setPreferredView('web');
                  navigate('/app/home');
                }}
              >
                {t('common.openWebVersion')}
              </Button>
            </div>
          ) : null}
          <Disclaimer text={t('common.disclaimer')} />
        </div>
        <div className="mx-auto w-[280px] rounded-[2rem] border-[10px] border-ink/90 bg-ink p-3 shadow-lift">
          <div className="overflow-hidden rounded-[1.25rem] bg-app">
            <div className="border-b border-border bg-surface px-4 py-3 text-center text-xs font-semibold">
              {t('auth.roleChwShort')} · {t('nav.home')}
            </div>
            <div className="flex flex-col items-center px-4 py-8">
              {qr ? (
                <img src={qr} alt={t('common.qrAlt')} className="rounded-card border border-border bg-white p-2" />
              ) : (
                <div className="h-[220px] w-[220px] animate-pulse rounded-card bg-surface-muted" />
              )}
              <p className="mt-4 text-center text-xs text-ink-muted">{t('login.scanQr')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
