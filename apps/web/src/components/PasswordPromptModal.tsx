import { Eye, EyeOff } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from './ToastProvider';
import { Modal } from './Modal';
import { Button, Input } from './ui';
import { useVoice } from '../voice/VoiceContext';

const SESSION_SHOWN_KEY = 'zm_pw_prompt_session';

function offlineTriageActive(): boolean {
  try {
    return sessionStorage.getItem('zm_offline_triage') === '1' || localStorage.getItem('zm_offline_triage') === '1';
  } catch {
    return false;
  }
}

/** One-shot centered password prompt after login (never a page redirect). */
export function PasswordPromptModal() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, loading, passwordChangePolicy, setPasswordPromptStatus } = useAuth();
  const { push } = useToast();
  const voice = useVoice();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const enforce = passwordChangePolicy === 'enforce';
  const pending = user?.password_prompt_status === 'pending';

  useEffect(() => {
    if (loading || !user || !pending) {
      setOpen(false);
      return;
    }
    if (location.pathname.startsWith('/login')) {
      setOpen(false);
      return;
    }
    if (offlineTriageActive()) return;
    if (location.pathname.includes('/triage') || voice.state !== 'idle') return;
    try {
      sessionStorage.setItem(`${SESSION_SHOWN_KEY}:${user.id}`, '1');
    } catch {
      /* ignore */
    }
    setOpen(true);
  }, [loading, user, pending, location.pathname, voice.state, enforce]);

  const ignore = async () => {
    if (enforce) return;
    try {
      await api.dismissPasswordPrompt();
      setPasswordPromptStatus('dismissed');
    } catch {
      /* still close locally if offline */
      setPasswordPromptStatus('dismissed');
    }
    setOpen(false);
    setCurrent('');
    setNext('');
    setFieldError('');
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldError('');
    setSaving(true);
    try {
      await api.changePassword(current.trim(), next.trim());
      setPasswordPromptStatus('changed');
      setOpen(false);
      setCurrent('');
      setNext('');
      push(t('auth.passwordChanged'), 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('invalid_current_password')) setFieldError(t('auth.invalidCurrentPassword'));
      else if (msg.includes('password_too_short')) setFieldError(t('users.errPasswordShort'));
      else if (msg.includes('password_too_common')) setFieldError(t('users.errPasswordCommon'));
      else if (msg.includes('password_matches_username')) setFieldError(t('users.errPasswordUsername'));
      else setFieldError(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (!user || location.pathname.startsWith('/login')) return null;

  return (
    <Modal
      open={open}
      onClose={() => {
        if (enforce) return;
        void ignore();
      }}
      closable={!enforce}
      dirty={false}
      title={t('auth.passwordPromptTitle')}
      description={t('auth.passwordPromptBody')}
      size="md"
      testId="password-prompt-modal"
      footer={
        <>
          {!enforce ? (
            <Button type="button" variant="ghost" onClick={() => void ignore()} data-testid="password-prompt-ignore">
              {t('auth.passwordPromptIgnore')}
            </Button>
          ) : null}
          <Button type="submit" form="password-prompt-form" loading={saving} data-testid="password-prompt-change">
            {t('auth.passwordPromptChangeNow')}
          </Button>
        </>
      }
    >
      <form id="password-prompt-form" className="space-y-3" onSubmit={(e) => void onSubmit(e)}>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold">{t('auth.currentPassword')}</span>
          <div className="relative">
            <Input
              type={showCur ? 'text' : 'password'}
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="pr-12"
              required
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-ink-muted"
              aria-label={showCur ? t('login.hidePassword') : t('login.showPassword')}
              onClick={() => setShowCur((v) => !v)}
            >
              {showCur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold">{t('auth.newPassword')}</span>
          <div className="relative">
            <Input
              type={showNext ? 'text' : 'password'}
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              minLength={10}
              className="pr-12"
              required
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-ink-muted"
              aria-label={showNext ? t('login.hidePassword') : t('login.showPassword')}
              onClick={() => setShowNext((v) => !v)}
            >
              {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        {fieldError ? <p className="text-sm text-danger">{fieldError}</p> : null}
      </form>
    </Modal>
  );
}
