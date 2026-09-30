import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Clapperboard,
  Languages,
  Moon,
  RefreshCcw,
  Sun,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { enqueueReferral, db } from '../db';
import { runScriptedDemo } from '../demo/scriptedAssistant';
import { unlockAudio } from '../voice/speak';
import { useSync } from '../sync/SyncContext';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from './ToastProvider';
import { IconButton } from './ui';
import { useAuth, type UserRole } from '../auth/AuthContext';

export function PresenterMenu() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { refreshPending, syncNow } = useSync();
  const { offlineSim, setOfflineSim, dark, toggleDark } = useTheme();
  const { push } = useToast();
  const { user, switchRole, demoModeEnabled } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const demoPresenter = Boolean(demoModeEnabled && user?.username?.endsWith('.demo'));

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (!demoModeEnabled) return null;

  const replayDemo = async () => {
    await enqueueReferral({
      client_uuid: `demo-miss-${Date.now()}`,
      facility_id: 'HC-BUG-01',
      chw_id: 'CHW-BUG-01-01',
      district: 'Bugesera',
      sector: 'Nyamata',
      age_months: 18,
      sex: 'female',
      decision: 'urgent_refer',
      reasons: ['Unable to drink or feed'],
      summary: 'DEMO: overdue urgent referral — patient has not arrived',
      status: 'sent',
      created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      synced: false,
      demo: true,
    });
    await refreshPending();
    void syncNow();
    setOpen(false);
    push(t('common.startDemo'), 'success');
    navigate('/m/triage?demo=A');
  };

  const resetDemo = async () => {
    await db.syncQueue.clear();
    await db.referrals.filter((r) => Boolean(r.demo)).delete();
    await refreshPending();
    setOpen(false);
    push(t('common.resetDemo'), 'info');
  };

  return (
    <div className="relative" ref={ref}>
      <IconButton label={t('common.presenter')} onClick={() => setOpen((o) => !o)} className="h-10 w-10">
        <Clapperboard className="h-4 w-4" strokeWidth={1.75} />
      </IconButton>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-card border border-border bg-surface shadow-lift">
          <p className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {t('common.presenter')}
          </p>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm hover:bg-surface-muted"
            onClick={() => void replayDemo()}
          >
            <Clapperboard className="h-4 w-4 text-primary" strokeWidth={1.75} />
            {t('common.startDemo')}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm hover:bg-surface-muted"
            onClick={() => {
              unlockAudio();
              setOpen(false);
              push(t('common.demoConversation'), 'info');
              void runScriptedDemo(i18n.language.startsWith('rw') ? 'rw' : 'en');
            }}
          >
            <Clapperboard className="h-4 w-4 text-accent" strokeWidth={1.75} />
            {t('common.demoConversation')}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm hover:bg-surface-muted"
            onClick={() => void resetDemo()}
          >
            <RefreshCcw className="h-4 w-4 text-ink-muted" strokeWidth={1.75} />
            {t('common.resetDemo')}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm hover:bg-surface-muted"
            onClick={() => {
              setOfflineSim(!offlineSim);
              push(offlineSim ? t('common.online') : t('common.offlineSimOn'), 'warning');
            }}
          >
            {offlineSim ? (
              <Wifi className="h-4 w-4 text-success" strokeWidth={1.75} />
            ) : (
              <WifiOff className="h-4 w-4 text-warning" strokeWidth={1.75} />
            )}
            {t('common.toggleOffline')}
          </button>
          {demoPresenter ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 border-t border-border px-3 py-3 text-left text-sm hover:bg-surface-muted"
              onClick={() => {
                setOpen(false);
                navigate('/app/settings/translations');
              }}
            >
              <Languages className="h-4 w-4 text-primary" strokeWidth={1.75} />
              {t('presenter.translationReview')}
            </button>
          ) : null}
          {demoPresenter ? (
            <div className="border-t border-border px-3 py-2">
              <p className="text-[10px] font-bold uppercase text-ink-muted">{t('auth.switchRole')}</p>
              <div className="mt-1 grid grid-cols-2 gap-1">
                {(['chw', 'nurse', 'supervisor', 'rbc'] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    className="rounded-control px-2 py-1.5 text-left text-xs font-semibold capitalize hover:bg-surface-muted"
                    onClick={() =>
                      void switchRole(role)
                        .then((u) => {
                          setOpen(false);
                          if (u.role === 'chw') navigate('/app/chw');
                          else if (u.role === 'nurse') navigate('/app/referrals');
                          else navigate('/app');
                        })
                        .catch(() => push(t('common.error'), 'danger'))
                    }
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <button
            type="button"
            className="flex w-full items-center gap-2 border-t border-border px-3 py-3 text-left text-sm hover:bg-surface-muted"
            onClick={toggleDark}
          >
            {dark ? <Sun className="h-4 w-4" strokeWidth={1.75} /> : <Moon className="h-4 w-4" strokeWidth={1.75} />}
            {t('common.toggleTheme')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
