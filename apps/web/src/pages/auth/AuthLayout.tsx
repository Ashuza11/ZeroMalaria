import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useOutlet } from 'react-router-dom';
import { RedirectIfAuthed } from '../../auth/guards';
import { CountUp, Glass, LangSwitch, LiveBackground, SmartImage, Wordmark } from '../../components/liquid';
import { Chevron, NotificationStack, Ping, SunMoon, type Notice } from '../../components/liquid/alive';
import { iosEase, spring } from '../../lib/motion';
import { useTheme } from '../../theme/ThemeContext';

/**
 * Shared shell for Sign in / Request account / Forgot password.
 * The glass card persists between routes and morphs its height (layout)
 * while the content cross-fades with an iOS blur transition.
 */
export function AuthLayout() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const outlet = useOutlet();
  const reduce = useReducedMotion();
  const { dark, toggleDark } = useTheme();
  const [q, setQ] = useState(0);

  useEffect(() => {
    document.documentElement.lang = i18n.language.startsWith('rw') ? 'rw' : 'en';
  }, [i18n.language]);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setQ((v) => (v + 1) % 3), 5200);
    return () => window.clearInterval(id);
  }, [reduce]);

  const quotes = [t('authx.quote1'), t('authx.quote2'), t('authx.quote3')];
  const notices: Notice[] = [
    { title: t('authx.notif1T'), body: t('authx.notif1B'), time: t('authx.now') },
    { title: t('authx.notif2T'), body: t('authx.notif2B'), time: t('authx.minAgo', { n: 2 }) },
    { title: t('authx.notif3T'), body: t('authx.notif3B'), time: t('authx.minAgo', { n: 5 }) },
    { title: t('authx.notif4T'), body: t('authx.notif4B'), time: t('authx.minAgo', { n: 9 }) },
  ];

  return (
    <RedirectIfAuthed>
      <div className="zm-ios relative min-h-[100svh] overflow-hidden">
        <LiveBackground variant="light" className="dark:opacity-25" />

        <div className="relative mx-auto grid min-h-[100svh] max-w-[1320px] gap-6 p-3 sm:p-5 lg:grid-cols-[1.02fr_1fr] lg:gap-10">
          {/* ---------- Visual panel ---------- */}
          <motion.aside
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: iosEase }}
            className="zm-ocean relative hidden overflow-hidden rounded-[40px] lg:block"
          >
            <div className="absolute inset-0">
              <SmartImage src="/images/landing/auth-side.jpg" alt="Community health worker on a hillside path at golden hour" hue="teal" priority className="h-full w-full">
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,20,31,0.55)_0%,rgba(3,20,31,0.1)_35%,rgba(3,20,31,0.85)_100%)]" />
              </SmartImage>
            </div>
            <LiveBackground variant="ocean" className="opacity-40 mix-blend-soft-light" />

            <div className="relative flex h-full flex-col justify-between p-10 text-white">
              <div>
                <Link to="/" className="inline-block rounded-full" aria-label="ZeroMalaria">
                  <Wordmark light />
                </Link>
                <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.5 }} className="mt-10 max-w-[400px]">
                  <NotificationStack items={notices} />
                </motion.div>
              </div>

              <div>
                <div className="relative h-[150px]">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={q + i18n.language}
                      initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -16, filter: 'blur(10px)' }}
                      transition={{ duration: 0.8, ease: iosEase }}
                      className="zm-title absolute bottom-0 max-w-[520px] text-[40px]"
                    >
                      {quotes[q]}
                    </motion.p>
                  </AnimatePresence>
                </div>
                <div className="mt-6 flex gap-1.5">
                  {quotes.map((_, i) => (
                    <motion.span
                      key={i}
                      animate={{ width: i === q ? 28 : 8, opacity: i === q ? 1 : 0.4 }}
                      transition={spring}
                      className="h-2 rounded-full bg-white"
                    />
                  ))}
                </div>

                <div className="mt-10 grid max-w-[520px] grid-cols-2 gap-3">
                  <Glass tone="dark" className="rounded-[24px] p-4">
                    <p className="text-[12.5px] font-medium text-white/60">{t('landing.statArrival')}</p>
                    <p className="mt-1 text-[30px] font-bold tracking-tight">
                      <CountUp to={82} suffix="%" />
                    </p>
                  </Glass>
                  <Glass tone="dark" className="rounded-[24px] p-4">
                    <p className="text-[12.5px] font-medium text-white/60">{t('landing.statToday')}</p>
                    <p className="mt-1 flex items-center gap-2 text-[30px] font-bold tracking-tight">
                      <CountUp to={18} />
                      <span className="zm-live-dot" />
                    </p>
                  </Glass>
                </div>
                <p className="mt-3 text-[12px] text-white/45">{t('landing.syntheticNote')}</p>
              </div>
            </div>
          </motion.aside>

          {/* ---------- Form panel ---------- */}
          <main className="flex min-h-[calc(100svh-24px)] flex-col">
            <div className="flex items-center justify-between gap-3 py-2 sm:py-3">
              <Link
                to="/"
                className="inline-flex h-10 items-center gap-1 rounded-full pl-2 pr-4 text-[15px] font-medium text-[var(--zm-teal)] transition hover:bg-[rgba(20,128,122,0.08)]"
              >
                <Chevron className="h-[18px] w-[18px]" />
                {t('authx.backHome')}
              </Link>
              <div className="flex items-center gap-2">
                <LangSwitch />
                <button
                  type="button"
                  onClick={toggleDark}
                  aria-label={t('common.toggleTheme')}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(11,27,43,0.06)] ring-1 ring-[var(--zm-separator)] transition hover:bg-[rgba(11,27,43,0.1)] dark:bg-white/10"
                >
                  <SunMoon dark={dark} />
                </button>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center py-6 sm:py-10">
              <div className="w-full max-w-[440px]">
                <div className="mb-8 flex justify-center lg:hidden">
                  <Wordmark />
                </div>

                <Glass strong layout transition={spring} className="rounded-[36px] p-6 sm:p-9">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={location.pathname}
                      initial={reduce ? false : { opacity: 0, y: 14, filter: 'blur(8px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={reduce ? undefined : { opacity: 0, y: -10, filter: 'blur(8px)' }}
                      transition={{ duration: 0.42, ease: iosEase }}
                    >
                      {outlet}
                    </motion.div>
                  </AnimatePresence>
                </Glass>

                <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[12.5px] text-[var(--zm-label-3)]">
                  <Ping size={6} />
                  {t('authx.secure')}
                </p>
                <p className="mx-auto mt-2 max-w-[380px] text-center text-[12px] leading-relaxed text-[var(--zm-label-3)]">
                  {t('common.disclaimer')}
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </RedirectIfAuthed>
  );
}
