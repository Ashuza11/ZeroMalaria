import { useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { canAccess, homePath } from '../auth/roleAccess';
import { PillButton } from '../components/liquid';
import { GlideArrow } from '../components/liquid/alive';
import { loginSchema } from '../validation/schemas';
import {
  AuthHeading,
  Banner,
  Field,
  FieldGroup,
  FieldHint,
  PasswordField,
  authErrorKey,
  useAutoFocus,
  type ShakeHandle,
} from './auth/fields';

/** Sign in (route: /login). Rendered inside AuthLayout. Logic is local (no role pickers). */
export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, demoModeEnabled } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const group = useRef<ShakeHandle | null>(null);
  const first = useRef<HTMLInputElement | null>(null);
  useAutoFocus(first);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = loginSchema.safeParse({ username: username.trim(), password });
    if (!parsed.success) {
      const bad = parsed.error.issues[0]?.path[0];
      setFieldError(bad === 'password' ? t('authx.vPassword') : t('authx.vIdentifier'));
      group.current?.shake();
      return;
    }
    setFieldError('');
    setPending(true);
    try {
      const user = await login(parsed.data.username.trim(), parsed.data.password.trim());
      const from = (location.state as { from?: string } | null)?.from;
      if (from && canAccess(from, user.role)) {
        navigate(from, { replace: true });
      } else {
        navigate(homePath(user.role), { replace: true });
      }
    } catch (err) {
      const status = err instanceof Error && 'status' in err ? Number((err as Error & { status?: number }).status) : 0;
      const msg = err instanceof Error ? err.message : '';
      if (status === 429 || msg.includes('login_locked')) {
        setError(t('auth.loginLocked'));
      } else {
        setError(t(authErrorKey(err)));
      }
      group.current?.shake();
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <AuthHeading title={t('authx.welcomeBack')} sub={t('authx.signInSub')} />
      <Banner>{error}</Banner>

      <form onSubmit={(e) => void submit(e)} noValidate>
        <FieldGroup ref={group}>
          <Field
            ref={first}
            label={t('authx.identifier')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            disabled={pending}
            invalid={!!fieldError && !username}
          />
          <PasswordField
            label={t('authx.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={pending}
            invalid={!!fieldError && password.length < 8}
          />
        </FieldGroup>
        <FieldHint>{fieldError}</FieldHint>

        <PillButton type="submit" size="lg" className="mt-5 w-full" loading={pending} disabled={pending}>
          {t('authx.signIn')}
          <GlideArrow />
        </PillButton>
      </form>

      {demoModeEnabled ? (
        <p className="mt-6 text-center text-[13px] text-[var(--zm-label-3)]" role="status">
          {t('login.demoBanner')}
        </p>
      ) : null}
    </div>
  );
}
