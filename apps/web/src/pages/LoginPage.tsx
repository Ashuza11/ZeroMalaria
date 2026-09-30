import { Activity, Languages, Eye, EyeOff, ShieldCheck, WifiOff, QrCode } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth, type UserRole } from '../auth/AuthContext';
import { RedirectIfAuthed } from '../auth/guards';
import { homePath } from '../auth/roleAccess';
import { Badge, Button, Card, Disclaimer, Input } from '../components/ui';
import { setLanguage } from '../i18n';
import { loginSchema } from '../validation/schemas';

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { login, quickDemoLogin, demoModeEnabled } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    const parsed = loginSchema.safeParse({ username: username.trim(), password });
    return parsed.success && !loading;
  }, [username, password, loading]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = loginSchema.safeParse({ username: username.trim(), password });
    if (!parsed.success) {
      const fe: { username?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as 'username' | 'password';
        if (k === 'username') fe.username = t('validation.username');
        if (k === 'password') fe.password = t('validation.password');
      }
      setFieldErrors(fe);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const user = await login(parsed.data.username, parsed.data.password);
      navigate(homePath(user.role as UserRole), { replace: true });
    } catch {
      setError(t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const demo = async (role: UserRole) => {
    if (!quickDemoLogin) return;
    setError('');
    setLoading(true);
    try {
      const user = await quickDemoLogin(role);
      navigate(homePath(user.role as UserRole), { replace: true });
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <RedirectIfAuthed>
      <div className="relative min-h-screen bg-app">
        <div className="absolute right-4 top-4 z-10">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1 rounded-control border border-border bg-surface px-3 text-xs font-semibold"
            onClick={() => setLanguage(i18n.language.startsWith('rw') ? 'en' : 'rw')}
            aria-label={t('nav.language')}
          >
            <Languages className="h-3.5 w-3.5" strokeWidth={1.75} />
            {i18n.language.startsWith('rw') ? 'RW' : 'EN'}
          </button>
        </div>

        <div className="mx-auto grid min-h-screen max-w-[1200px] lg:grid-cols-2">
          {/* Brand panel */}
          <aside className="relative hidden flex-col justify-between bg-primary px-10 py-12 text-primary-foreground lg:flex">
            <div>
              <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-control bg-white/15">
                <Activity className="h-7 w-7" strokeWidth={1.75} />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">{t('common.appName')}</h1>
              <p className="mt-3 max-w-md text-base leading-relaxed text-white/90">{t('login.valueProp')}</p>
              <ul className="mt-10 space-y-4 text-sm text-white/95">
                <li className="flex gap-3">
                  <WifiOff className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} />
                  <span>{t('login.benefit1')}</span>
                </li>
                <li className="flex gap-3">
                  <QrCode className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} />
                  <span>{t('login.benefit2')}</span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} />
                  <span>{t('login.benefit3')}</span>
                </li>
              </ul>
            </div>
            <Badge tone="warning">{t('common.synthetic')}</Badge>
          </aside>

          {/* Form */}
          <main className="flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-12">
            <div className="mx-auto w-full max-w-[420px]">
              <div className="mb-6 lg:hidden">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-control bg-primary text-primary-foreground">
                  <Activity className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <h1 className="text-2xl font-semibold text-ink">{t('common.appName')}</h1>
                <p className="mt-2 text-sm text-ink-muted">{t('login.subtitle')}</p>
              </div>

              {demoModeEnabled ? (
                <div
                  className="mb-4 rounded-control border border-warning/40 bg-warning-soft px-3 py-2 text-center text-xs font-medium text-ink"
                  role="status"
                >
                  {t('login.demoBanner')}
                </div>
              ) : null}

              <Card className="p-6 shadow-card">
                <h2 className="text-lg font-semibold text-ink">{t('login.signIn')}</h2>
                <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3" noValidate>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-ink" htmlFor="login-user">
                      {t('login.username')}
                    </label>
                    <Input
                      id="login-user"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      aria-invalid={!!fieldErrors.username}
                    />
                    {fieldErrors.username ? (
                      <p className="mt-1 text-xs text-danger">{fieldErrors.username}</p>
                    ) : null}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-ink" htmlFor="login-pass">
                      {t('login.password')}
                    </label>
                    <div className="relative">
                      <Input
                        id="login-pass"
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        className="pr-12"
                        aria-invalid={!!fieldErrors.password}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-control p-2 text-ink-muted"
                        onClick={() => setShowPw((v) => !v)}
                        aria-label={showPw ? t('login.hidePassword') : t('login.showPassword')}
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {fieldErrors.password ? (
                      <p className="mt-1 text-xs text-danger">{fieldErrors.password}</p>
                    ) : null}
                  </div>
                  {error ? <p className="text-sm text-danger">{error}</p> : null}
                  <Button className="w-full" size="lg" loading={loading} type="submit" disabled={!canSubmit && !loading}>
                    {t('login.signIn')}
                  </Button>
                </form>

                {demoModeEnabled ? (
                  <>
                    <div className="my-5 flex items-center gap-3 text-xs text-ink-muted">
                      <div className="h-px flex-1 bg-border" />
                      <span>{t('login.demoAccess')}</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Button variant="outline" size="sm" loading={loading} onClick={() => void demo('chw')}>
                        {t('auth.roleChw')}
                      </Button>
                      <Button variant="outline" size="sm" loading={loading} onClick={() => void demo('nurse')}>
                        {t('auth.roleNurse')}
                      </Button>
                      <Button variant="outline" size="sm" loading={loading} onClick={() => void demo('rbc')}>
                        {t('auth.roleRbc')}
                      </Button>
                    </div>
                    <p className="mt-3 text-xs text-ink-muted">{t('login.demoNote')}</p>
                  </>
                ) : null}
              </Card>

              <div className="mt-6">
                <Disclaimer text={t('common.disclaimer')} />
                <p className="mt-2 text-xs text-ink-muted">{t('common.synthetic')}</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </RedirectIfAuthed>
  );
}
