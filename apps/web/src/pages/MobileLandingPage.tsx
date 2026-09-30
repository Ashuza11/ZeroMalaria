import QRCode from 'qrcode';
import { Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Disclaimer } from '../components/ui';

export function MobileLandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [qr, setQr] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 768) {
      navigate(user ? '/m/home' : '/login', { replace: true });
      return;
    }
    const target = `${window.location.origin}/m/home`;
    void QRCode.toDataURL(target, { margin: 1, width: 220 }).then(setQr);
  }, [navigate, user]);

  if (typeof window !== 'undefined' && window.innerWidth < 768) {
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
          <Disclaimer text={t('common.disclaimer')} />
        </div>
        <div className="mx-auto w-[280px] rounded-[2rem] border-[10px] border-ink/90 bg-ink p-3 shadow-lift">
          <div className="overflow-hidden rounded-[1.25rem] bg-app">
            <div className="border-b border-border bg-surface px-4 py-3 text-center text-xs font-semibold">
              CHW · {t('nav.home')}
            </div>
            <div className="flex flex-col items-center px-4 py-8">
              {qr ? (
                <img src={qr} alt="QR code to open CHW home" className="rounded-card border border-border bg-white p-2" />
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
