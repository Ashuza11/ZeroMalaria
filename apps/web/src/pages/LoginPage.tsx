import { motion } from 'framer-motion';
import { useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, type UserRole } from '../auth/AuthContext';
import { homePath } from '../auth/roleAccess';
import { PillButton } from '../components/liquid';
import { GlideArrow, Orb, type OrbTone } from '../components/liquid/alive';
import { bouncy } from '../lib/motion';
import { loginSchema } from '../validation/schemas';
import { AuthHeading, Banner, Field, FieldGroup, FieldHint, PasswordField, authErrorKey, useAutoFocus, type ShakeHandle } from './auth/fields';

/** Sign in (route: /login). Rendered inside AuthLayout. */
export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, quickDemoLogin, demoModeEnabled } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const group = useRef<ShakeHandle | null>(null);
  const first = useRef<HTMLInputElement | null>(null);
  useAutoFocus(first);

  const from = (location.state as { from?: string } | null)?.from;

  const go = (role: UserRole) => navigate(from && from.startsWith('/app') ? from : homePath(role), { replace: true });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = loginSchema.safeParse({ username: identifier.trim(), password });
    if (!parsed.success) {
      const bad = parsed.error.issues[0]?.path[0];
      setFieldError(bad === 'password' ? t('authx.vPassword') : t('authx.vIdentifier'));
      group.current?.shake();
      return;
    }
    setFieldError('');
    setLoading('form');
    try {
      const user = await login(parsed.data.username, parsed.data.password);
      go(user.role as UserRole);
    } catch (err) {
      setError(t(authErrorKey(err)));
      group.current?.shake();
    } finally {
      setLoading(null);
    }
  };

  const demo = async (role: UserRole) => {
    if (!quickDemoLogin) return;
    setError('');
    setLoading(role);
    try {
      const user = await quickDemoLogin(role);
      go(user.role as UserRole);
    } catch (err) {
      setError(t(authErrorKey(err)));
    } finally {
      setLoading(null);
    }
  };

  const demoRoles: Array<{ role: UserRole; label: string; tone: OrbTone; mono: string }> = [
    { role: 'chw', label: t('auth.roleChwShort'), tone: 'teal', mono: 'C' },
    { role: 'nurse', label: t('auth.roleNurse'), tone: 'sky', mono: 'N' },
    { role: 'supervisor', label: t('auth.roleSupervisor'), tone: 'amber', mono: 'S' },
    { role: 'rbc', label: t('auth.roleRbcShort'), tone: 'ocean', mono: 'R' },
  ];

  return (
    <div>
      <AuthHeading title={t('authx.welcomeBack')} sub={t('authx.signInSub')} />
      <Banner>{error}</Banner>

      <form onSubmit={(e) => void submit(e)} noValidate>
        <FieldGroup ref={group}>
          <Field
            ref={first}
            label={t('authx.identifier')}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            invalid={!!fieldError && !identifier}
          />
          <PasswordField label={t('authx.password')} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" invalid={!!fieldError && password.length < 8} />
        </FieldGroup>
        <FieldHint>{fieldError}</FieldHint>

        <div className="mt-3 flex justify-end">
          <Link to="/forgot-password" className="rounded-full px-2 py-1 text-[14.5px] font-medium text-[var(--zm-teal)] hover:underline">
            {t('authx.forgot')}
          </Link>
        </div>

        <PillButton type="submit" size="lg" className="mt-5 w-full" loading={loading === 'form'} disabled={!!loading && loading !== 'form'}>
          {t('authx.signIn')}
          <GlideArrow />
        </PillButton>
      </form>

      {demoModeEnabled ? (
        <div className="mt-7">
          <div className="flex items-center gap-3 text-[12.5px] font-medium uppercase tracking-[0.1em] text-[var(--zm-label-3)]">
            <span className="h-px flex-1 bg-[var(--zm-separator)]" />
            {t('authx.demoAccess')}
            <span className="h-px flex-1 bg-[var(--zm-separator)]" />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {demoRoles.map((d, i) => (
              <motion.button
                key={d.role}
                type="button"
                onClick={() => void demo(d.role)}
                disabled={!!loading}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...bouncy, delay: 0.1 + i * 0.04 }}
                whileTap={{ scale: 0.94 }}
                className="group flex flex-col items-center gap-1.5 rounded-[18px] bg-[rgba(118,118,128,0.1)] px-1 py-3 text-[11.5px] font-semibold text-[var(--zm-label-2)] transition hover:bg-[rgba(20,128,122,0.1)] hover:text-[var(--zm-teal)] disabled:opacity-50"
              >
                <span className="transition-transform duration-500 group-hover:scale-110">
                  <Orb size={38} tone={d.tone} delay={i}>
                    {loading === d.role ? <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <span className="text-[14px]">{d.mono}</span>}
                  </Orb>
                </span>
                <span className="w-full truncate text-center">{d.label}</span>
              </motion.button>
            ))}
          </div>
          <p className="mt-3 text-center text-[12px] text-[var(--zm-label-3)]">{t('login.demoBanner')}</p>
        </div>
      ) : null}

      <p className="mt-8 text-center text-[15px] text-[var(--zm-label-2)]">
        {t('authx.noAccount')}{' '}
        <Link to="/signup" className="font-semibold text-[var(--zm-teal)] hover:underline">
          {t('authx.createAccount')}
        </Link>
      </p>
    </div>
  );
}
