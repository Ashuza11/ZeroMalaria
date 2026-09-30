import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth, type UserRole } from '../../auth/AuthContext';
import { homePath } from '../../auth/roleAccess';
import {
  CountUp,
  Eyebrow,
  Glass,
  LangSwitch,
  LiveBackground,
  PillLink,
  Reveal,
  SmartImage,
  Toggle,
  Wordmark,
} from '../../components/liquid';
import {
  DrawCheck,
  GlideArrow,
  Magnetic,
  Marquee,
  MenuGlyph,
  Numeral,
  Orb,
  Ping,
  RingSpinner,
  ScrollProgress,
  Sparkline,
  type OrbTone,
} from '../../components/liquid/alive';
import { cn } from '../../lib/cn';
import { bouncy, iosEase, spring } from '../../lib/motion';
import { HealthCard } from './HealthCard';

const img = (name: string) => `/images/landing/${name}`;

export function LandingPage() {
  const { i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = i18n.language.startsWith('rw') ? 'rw' : 'en';
    document.title = 'ZeroMalaria';
  }, [i18n.language]);

  return (
    <div className="zm-ios min-h-screen overflow-x-clip">
      <ScrollProgress />
      <NavBar />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <WhoItServes />
        <Safety />
        <VoiceAndOffline />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

/* ================================================================
   Floating glass navigation: morphs from dark to light on scroll
================================================================ */
function NavBar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { scrollY } = useScroll();
  const [onDark, setOnDark] = useState(true);
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const heroH = typeof window !== 'undefined' ? window.innerHeight * 0.92 : 800;
    setOnDark(y < heroH - 40);
    setCompact(y > 24);
  });

  const links = [
    { href: '#how', label: t('landing.navHow') },
    { href: '#who', label: t('landing.navWho') },
    { href: '#safety', label: t('landing.navSafety') },
    { href: '#voice', label: t('landing.navVoice') },
  ];
  const tone = onDark ? 'dark' : 'light';

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-4">
      <motion.nav
        layout
        transition={spring}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-full pl-3 pr-2 transition-[background-color,border-color,box-shadow] duration-500',
          compact ? 'h-[56px] max-w-[980px]' : 'h-[64px] max-w-[1180px]',
          onDark ? 'zm-glass-dark' : 'zm-glass zm-glass-strong',
          !compact && onDark && '!border-transparent !bg-transparent !shadow-none !backdrop-blur-0',
        )}
        aria-label="Primary"
      >
        <a href="#top" className="shrink-0 rounded-full px-1" aria-label="ZeroMalaria">
          <Wordmark light={onDark} />
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className={cn(
                  'rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors',
                  onDark ? 'text-white/75 hover:bg-white/10 hover:text-white' : 'text-[var(--zm-label-2)] hover:bg-black/5 hover:text-[var(--zm-label)]',
                )}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <LangSwitch tone={tone} className="hidden sm:inline-flex" />
          {user ? (
            <PillLink to={homePath(user.role as UserRole)} variant={onDark ? 'white' : 'primary'} size="sm">
              {t('landing.openWorkspace')}
            </PillLink>
          ) : (
            <>
              <PillLink to="/login" variant={onDark ? 'glassDark' : 'glass'} size="sm" className="hidden sm:inline-flex">
                {t('landing.signIn')}
              </PillLink>
              <PillLink to="/signup" variant={onDark ? 'white' : 'primary'} size="sm" className="hidden sm:inline-flex">
                {t('landing.requestAccess')}
              </PillLink>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn('flex h-10 w-10 items-center justify-center rounded-full md:hidden', onDark ? 'text-white hover:bg-white/10' : 'hover:bg-black/5')}
            aria-label={t('landing.menu')}
          >
            <MenuGlyph open={false} />
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.96, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, scale: 0.97, filter: 'blur(8px)' }}
              transition={spring}
              className="zm-glass zm-glass-strong fixed inset-x-3 top-3 z-50 rounded-[28px] p-4"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between">
                <Wordmark />
                <button type="button" onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5" aria-label={t('landing.close')}>
                  <MenuGlyph open />
                </button>
              </div>
              <ul className="mt-4 space-y-1">
                {links.map((l, i) => (
                  <motion.li key={l.href} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i + 0.08 }}>
                    <a href={l.href} onClick={() => setOpen(false)} className="block rounded-2xl px-4 py-3 text-[19px] font-semibold tracking-[-0.02em] hover:bg-black/5">
                      {l.label}
                    </a>
                  </motion.li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--zm-separator)] pt-4">
                <LangSwitch />
                <div className="flex gap-2">
                  <PillLink to="/login" variant="glass" size="sm">
                    {t('landing.signIn')}
                  </PillLink>
                  <PillLink to="/signup" variant="primary" size="sm">
                    {t('landing.requestAccess')}
                  </PillLink>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

/* ================================================================
   Hero
================================================================ */
function Hero() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -80]);
  const textO = useTransform(scrollYProgress, [0, 0.7], [1, reduce ? 1 : 0]);
  const textBlur = useTransform(scrollYProgress, [0, 0.7], ['blur(0px)', reduce ? 'blur(0px)' : 'blur(12px)']);
  const cardFloatY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60]);
  const cardY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 200]);
  const cardR = useTransform(scrollYProgress, [0, 1], [-7, reduce ? -7 : -14]);

  const line = {
    hidden: { opacity: 0, y: 40, filter: 'blur(14px)' },
    show: (i: number) => ({ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 1.1, ease: iosEase, delay: 0.15 + i * 0.12 } }),
  };

  return (
    <section id="top" ref={ref} className="zm-ocean relative isolate overflow-hidden pb-10 pt-28 sm:pt-32 lg:min-h-[100svh] lg:pb-16">
      <LiveBackground variant="ocean" />

      <div className="relative mx-auto grid max-w-[1180px] items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <motion.div style={{ y: textY, opacity: textO, filter: textBlur }}>
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...spring, delay: 0.05 }}
            className="zm-glass-dark inline-flex items-center gap-2.5 rounded-full py-1.5 pl-2 pr-4 text-[13px] font-medium text-white/85"
          >
            <span className="flex h-6 items-center gap-1.5 rounded-full bg-white/10 px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--zm-teal-glow)]">
              <span className="zm-live-dot" />
              {t('landing.liveTag')}
            </span>
            {t('landing.eyebrow')}
          </motion.div>

          <h1 className="zm-display mt-7 text-[52px] sm:text-[76px] lg:text-[92px]">
            <motion.span className="block" custom={0} variants={line} initial="hidden" animate="show">
              {t('landing.heroTitle1')}
            </motion.span>
            <motion.span className="zm-text-aurora zm-shimmer block pb-2" custom={1} variants={line} initial="hidden" animate="show">
              {t('landing.heroTitle2')}
            </motion.span>
          </h1>

          <motion.p
            custom={2}
            variants={line}
            initial="hidden"
            animate="show"
            className="mt-6 max-w-[560px] text-[18px] leading-[1.55] text-white/72 sm:text-[20px]"
          >
            {t('landing.heroBody')}
          </motion.p>

          <motion.div custom={3} variants={line} initial="hidden" animate="show" className="mt-9 flex flex-wrap items-center gap-3">
            <Magnetic>
              <PillLink to="/login" variant="white" size="lg">
                {t('landing.ctaStart')}
                <GlideArrow />
              </PillLink>
            </Magnetic>
            <a
              href="#how"
              className="zm-glass-dark inline-flex h-[54px] items-center gap-2 rounded-full px-7 text-[17px] font-semibold text-white transition hover:bg-white/15"
            >
              {t('landing.ctaHow')}
            </a>
          </motion.div>

          <motion.ul custom={4} variants={line} initial="hidden" animate="show" className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-[14px] text-white/70">
            {[
              { tone: 'teal' as OrbTone, l: t('landing.chipOffline') },
              { tone: 'amber' as OrbTone, l: t('landing.chipLang') },
              { tone: 'sky' as OrbTone, l: t('landing.chipRules') },
            ].map(({ tone, l }, i) => (
              <li key={l} className="flex items-center gap-2.5">
                <Orb size={14} tone={tone} delay={i} />
                {l}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        {/* composition: CHW photo + live clinical triage card */}
        <div className="relative mx-auto w-full max-w-[540px] pb-6 sm:h-[640px] sm:pb-0">
          <motion.div
            style={{ y: cardY, rotate: cardR }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, ease: iosEase, delay: 0.2 }}
            className="relative h-[440px] w-full sm:absolute sm:right-0 sm:top-0 sm:h-[580px] sm:w-[420px]"
          >
            <SmartImage
              src={img('hero-chw.jpg')}
              alt="Community health worker reviewing a malaria assessment with a mother and her child"
              hue="teal"
              priority
              className="h-full w-full rounded-[44px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] ring-1 ring-white/15"
            >
              <div className="absolute inset-0 rounded-[44px] bg-[linear-gradient(180deg,transparent_50%,rgba(3,20,31,0.7))]" />
            </SmartImage>
          </motion.div>

          <motion.div
            style={{ y: cardFloatY }}
            initial={{ opacity: 0, y: 60, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.3, ease: iosEase, delay: 0.5 }}
            className="relative z-10 -mt-40 flex justify-center sm:absolute sm:bottom-6 sm:left-0 sm:mt-0 sm:block"
          >
            <HealthCard />
          </motion.div>

          {/* floating widget */}
          <FloatWidget className="right-[-12px] top-10 hidden sm:block" delay={0.9}>
            <p className="text-[12px] font-medium text-white/60">{t('landing.statArrival')}</p>
            <div className="mt-2 flex items-center gap-3">
              <Ring value={0.82} size={46} />
              <span className="text-[28px] font-bold tracking-tight">
                <CountUp to={82} suffix="%" />
              </span>
            </div>
          </FloatWidget>
        </div>
      </div>

      {/* live stat tiles */}
      <div className="relative mx-auto mt-6 max-w-[1180px] px-5 sm:px-8 lg:mt-2">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { l: t('landing.statToday'), v: 18, c: 'var(--zm-teal-glow)' },
            { l: t('landing.statUrgent'), v: 120, c: '#ff8a8e' },
            { l: t('landing.statArrival'), v: 82, s: '%', c: '#7dd3fc' },
            { l: t('landing.statHours'), v: 6.4, d: 1, c: 'var(--zm-amber-bright)' },
          ].map((m, i) => (
            <Reveal key={m.l} delay={i * 0.06}>
              <Glass tone="dark" className="overflow-hidden rounded-[26px] p-5 pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-white/60">{m.l}</p>
                  <Ping color={m.c} size={7} />
                </div>
                <p className="mt-3 text-[34px] font-bold tracking-[-0.03em] sm:text-[40px]">
                  <CountUp to={m.v} decimals={m.d ?? 0} suffix={m.s ?? ''} />
                </p>
                <Sparkline seed={i + 2} color={m.c} height={30} className="mt-1" />
              </Glass>
            </Reveal>
          ))}
        </div>
        <Marquee className="mt-6">
          {[
            ['Nyagatare', 468, 'amber'],
            ['Bugesera', 236, 'amber'],
            ['Kirehe', 148, 'amber'],
            ['Gisagara', 127, 'amber'],
            ['Rusizi', 97, 'teal'],
            ['Gasabo', 58, 'teal'],
            ['Nyamasheke', 41, 'teal'],
            ['Huye', 33, 'teal'],
          ].map(([name, n, tone]) => (
            <span key={name as string} className="mx-2 inline-flex items-center gap-2.5 rounded-full bg-white/[0.06] px-4 py-2 text-[14px] text-white/80 ring-1 ring-white/10">
              <Ping color={tone === 'amber' ? 'var(--zm-amber-bright)' : 'var(--zm-teal-glow)'} size={7} />
              <span className="font-semibold text-white">{name}</span>
              <span className="tabular text-white/55">{n}</span>
            </span>
          ))}
        </Marquee>
        <p className="mt-3 text-right text-[12px] text-white/45">
          {t('landing.marqueeLabel')} · {t('landing.syntheticNote')}
        </p>
      </div>
    </section>
  );
}

function FloatWidget({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ ...bouncy, delay }}
      className={cn('absolute z-20', className)}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
        className="zm-glass-dark rounded-[24px] px-4 py-3.5"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/* Activity-style progress ring */
function Ring({ value, size = 56, stroke = 7, color = 'var(--zm-teal-glow)', track = 'rgba(255,255,255,0.14)' }: { value: number; size?: number; stroke?: number; color?: string; track?: string }) {
  const r = (size - stroke) / 2;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: value }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, ease: iosEase, delay: 0.2 }}
      />
    </svg>
  );
}

/* ================================================================
   Problem
================================================================ */
function Problem() {
  const { t } = useTranslation();
  const items = [
    { t: t('landing.problem1T'), b: t('landing.problem1B') },
    { t: t('landing.problem2T'), b: t('landing.problem2B') },
    { t: t('landing.problem3T'), b: t('landing.problem3B') },
  ];
  return (
    <section className="relative mx-auto max-w-[1180px] px-5 py-24 sm:px-8 lg:py-36">
      <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div>
          <Reveal>
            <Eyebrow>{t('landing.problemEyebrow')}</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="zm-title mt-4 text-[38px] sm:text-[52px]">{t('landing.problemTitle')}</h2>
          </Reveal>
          <ul className="mt-10 space-y-3">
            {items.map((it, i) => (
              <Reveal as="li" key={it.t} delay={0.08 * i}>
                <Glass strong className="flex gap-5 rounded-[24px] p-5">
                  <Numeral n={i + 1} className="w-12 shrink-0 text-[34px] leading-none" />
                  <span>
                    <span className="block text-[18px] font-semibold tracking-[-0.015em]">{it.t}</span>
                    <span className="mt-1 block text-[15.5px] leading-relaxed text-[var(--zm-label-2)]">{it.b}</span>
                  </span>
                </Glass>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal>
          <ParallaxImage src={img('problem-village.jpg')} alt="Rwandan hillside village at dawn" hue="dusk" className="h-[520px] rounded-[40px] lg:h-[640px]">
            <div className="absolute inset-x-4 bottom-4">
              <Glass tone="dark" className="rounded-[24px] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                    <Ping color="var(--zm-amber-bright)" size={10} />
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold">Nyamata · Bugesera</p>
                    <p className="text-[13px] text-white/65">{t('landing.phHandoverTo')}</p>
                  </div>
                </div>
              </Glass>
            </div>
          </ParallaxImage>
        </Reveal>
      </div>
    </section>
  );
}

function ParallaxImage({ src, alt, hue, className, children }: { src: string; alt: string; hue?: 'ocean' | 'teal' | 'amber' | 'dusk'; className?: string; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['-8%', '8%']);
  return (
    <div ref={ref} className={cn('relative overflow-hidden shadow-[0_40px_80px_-40px_rgba(6,36,58,0.45)]', className)}>
      <motion.div style={{ y }} className="absolute -inset-y-[10%] inset-x-0">
        <SmartImage src={src} alt={alt} hue={hue} className="h-full w-full" />
      </motion.div>
      {children}
    </div>
  );
}

/* ================================================================
   How it works: sticky scroll story (desktop), snap cards (mobile)
================================================================ */
function HowItWorks() {
  const { t } = useTranslation();
  const steps = [
    { t: t('landing.how1T'), b: t('landing.how1B'), img: 'step-triage.jpg', hue: 'teal' as const, orb: 'teal' as OrbTone },
    { t: t('landing.how2T'), b: t('landing.how2B'), img: 'step-confirm.jpg', hue: 'ocean' as const, orb: 'ocean' as OrbTone },
    { t: t('landing.how3T'), b: t('landing.how3B'), img: 'step-handover.jpg', hue: 'amber' as const, orb: 'amber' as OrbTone },
    { t: t('landing.how4T'), b: t('landing.how4B'), img: 'step-followup.jpg', hue: 'dusk' as const, orb: 'dusk' as OrbTone },
  ];
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => setActive(Math.min(3, Math.max(0, Math.floor(v * 4)))));
  const bar = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <section id="how" className="relative scroll-mt-20 bg-[var(--zm-canvas-2)]">
      {/* Desktop: sticky story */}
      <div ref={ref} className="relative hidden h-[360vh] lg:block">
        <div className="sticky top-0 flex h-screen items-center">
          <div className="mx-auto grid w-full max-w-[1180px] grid-cols-[0.9fr_1.1fr] items-center gap-16 px-8">
            <div>
              <Eyebrow>{t('landing.howEyebrow')}</Eyebrow>
              <h2 className="zm-title mt-4 text-[52px]">{t('landing.howTitle')}</h2>
              <div className="relative mt-10 pl-6">
                <div className="absolute bottom-2 left-0 top-2 w-[3px] overflow-hidden rounded-full bg-[var(--zm-separator)]">
                  <motion.div style={{ height: bar }} className="w-full rounded-full bg-[linear-gradient(180deg,var(--zm-teal),var(--zm-amber))]" />
                </div>
                <ul className="space-y-2">
                  {steps.map((s, i) => (
                    <li key={s.t} className="relative">
                      {active === i ? (
                        <motion.span layoutId="how-pill" transition={spring} className="zm-glass zm-glass-strong absolute inset-0 rounded-[22px]" />
                      ) : null}
                      <div className="relative z-10 flex gap-4 rounded-[22px] p-4">
                        <StepDot n={i + 1} active={active === i} done={active > i} tone={s.orb} />
                        <div>
                          <p className={cn('text-[20px] font-semibold tracking-[-0.02em] transition-colors duration-500', active === i ? '' : 'text-[var(--zm-label-3)]')}>
                            {s.t}
                          </p>
                          <motion.p
                            initial={false}
                            animate={{ height: active === i ? 'auto' : 0, opacity: active === i ? 1 : 0 }}
                            transition={spring}
                            className="overflow-hidden text-[15.5px] leading-relaxed text-[var(--zm-label-2)]"
                          >
                            <span className="block pt-1.5">{s.b}</span>
                          </motion.p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="relative h-[620px]">
              {steps.map((s, i) => (
                <motion.div
                  key={s.img}
                  initial={false}
                  animate={{
                    opacity: active === i ? 1 : 0,
                    scale: active === i ? 1 : active > i ? 0.92 : 1.04,
                    filter: active === i ? 'blur(0px)' : 'blur(12px)',
                  }}
                  transition={{ duration: 0.9, ease: iosEase }}
                  className="absolute inset-0"
                  aria-hidden={active !== i}
                >
                  <SmartImage src={img(s.img)} alt={s.t} hue={s.hue} className="h-full w-full rounded-[44px] shadow-[0_50px_90px_-40px_rgba(6,36,58,0.55)]">
                    <div className="absolute inset-0 rounded-[44px] bg-[linear-gradient(180deg,transparent_55%,rgba(3,20,31,0.6))]" />
                    <div className="absolute bottom-5 left-5 right-5">
                      <Glass tone="dark" className="flex items-center gap-3 rounded-[22px] p-4">
                        <Orb size={38} tone={s.orb}>
                          <span className="text-[15px]">{i + 1}</span>
                        </Orb>
                        <p className="text-[16px] font-semibold">{s.t}</p>
                      </Glass>
                    </div>
                  </SmartImage>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile / tablet: snap carousel */}
      <div className="py-20 lg:hidden">
        <div className="px-5 sm:px-8">
          <Eyebrow>{t('landing.howEyebrow')}</Eyebrow>
          <h2 className="zm-title mt-4 text-[36px] sm:text-[46px]">{t('landing.howTitle')}</h2>
        </div>
        <div className="zm-scroll-hide mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:px-8">
          {steps.map((s, i) => (
            <div key={s.img} className="w-[82%] shrink-0 snap-center sm:w-[60%]">
              <SmartImage src={img(s.img)} alt={s.t} hue={s.hue} className="h-[300px] w-full rounded-[32px]" />
              <div className="mt-4 px-1">
                <p className="text-[20px] font-semibold tracking-[-0.02em]">
                  <span className="mr-2 text-[var(--zm-teal)]">0{i + 1}</span>
                  {s.t}
                </p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--zm-label-2)]">{s.b}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Who it serves: bento of live widgets
================================================================ */
function WhoItServes() {
  const { t } = useTranslation();
  return (
    <section id="who" className="relative mx-auto max-w-[1180px] scroll-mt-20 px-5 py-24 sm:px-8 lg:py-36">
      <Reveal>
        <Eyebrow>{t('landing.whoEyebrow')}</Eyebrow>
      </Reveal>
      <Reveal delay={0.05}>
        <h2 className="zm-title mt-4 max-w-[720px] text-[38px] sm:text-[52px]">{t('landing.whoTitle')}</h2>
      </Reveal>

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[300px_300px]">
        <Reveal className="lg:row-span-2">
          <Glass strong tilt className="h-full overflow-hidden rounded-[32px] p-6">
            <BentoHead tone="teal" title={t('landing.whoChwT')} body={t('landing.whoChwB')} />
            <ChwMini />
          </Glass>
        </Reveal>
        <Reveal delay={0.06} className="lg:col-span-2">
          <Glass strong tilt className="h-full rounded-[32px] p-6">
            <div className="grid h-full gap-6 sm:grid-cols-[0.8fr_1.2fr]">
              <BentoHead tone="sky" title={t('landing.whoNurseT')} body={t('landing.whoNurseB')} />
              <InboxMini />
            </div>
          </Glass>
        </Reveal>
        <Reveal delay={0.1}>
          <Glass strong tilt className="h-full rounded-[32px] p-6">
            <BentoHead tone="amber" title={t('landing.whoSupT')} body={t('landing.whoSupB')} />
            <div className="mt-5 flex items-center gap-4">
              <div className="relative h-[92px] w-[92px]">
                <div className="absolute inset-0">
                  <Ring value={0.86} size={92} stroke={10} color="var(--zm-teal)" track="rgba(20,128,122,0.14)" />
                </div>
                <div className="absolute inset-[13px]">
                  <Ring value={0.64} size={66} stroke={10} color="var(--zm-amber)" track="rgba(217,119,6,0.14)" />
                </div>
                <div className="absolute inset-[26px]">
                  <Ring value={0.92} size={40} stroke={10} color="var(--zm-ocean)" track="rgba(11,60,93,0.12)" />
                </div>
              </div>
              <ul className="space-y-1 text-[13px] font-medium">
                <li className="text-[var(--zm-teal)]">86% · {t('landing.inboxArrived')}</li>
                <li className="text-[var(--zm-amber)]">64% · {t('common.followUp')}</li>
                <li className="text-[var(--zm-ocean)] dark:text-sky-300">92% · {t('landing.inboxTreated')}</li>
              </ul>
            </div>
          </Glass>
        </Reveal>
        <Reveal delay={0.14}>
          <Glass strong tilt className="h-full overflow-hidden rounded-[32px] p-6">
            <BentoHead tone="dusk" title={t('landing.whoRbcT')} body={t('landing.whoRbcB')} />
            <HotspotMini />
          </Glass>
        </Reveal>
      </div>
    </section>
  );
}

function BentoHead({ tone, title, body }: { tone: OrbTone; title: string; body: string }) {
  return (
    <div>
      <Orb size={46} tone={tone} />
      <p className="mt-4 text-[21px] font-semibold tracking-[-0.02em]">{title}</p>
      <p className="mt-1 text-[15px] leading-relaxed text-[var(--zm-label-2)]">{body}</p>
    </div>
  );
}

function ChwMini() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setN((v) => (v + 1) % 4), 1600);
    return () => window.clearInterval(id);
  }, [reduce]);
  const rows = [t('triage.age'), t('triage.temperature'), t('landing.phDanger'), 'RDT'];
  return (
    <div className="mt-8 overflow-hidden rounded-[22px] bg-white/70 ring-1 ring-[var(--zm-separator)] dark:bg-white/5">
      {rows.map((r, i) => (
        <div key={r} className={cn('flex items-center justify-between px-4 py-3.5', i > 0 && 'border-t border-[var(--zm-separator)]')}>
          <span className="text-[14.5px] font-medium">{r}</span>
          <motion.span
            initial={false}
            animate={{ scale: n >= i ? 1 : 0.6, opacity: n >= i ? 1 : 0.3, backgroundColor: n >= i ? '#14807a' : 'rgba(120,120,128,0.25)' }}
            transition={bouncy}
            className="flex h-6 w-6 items-center justify-center rounded-full text-white"
          >
            <DrawCheck on={n >= i} size={13} />
          </motion.span>
        </div>
      ))}
    </div>
  );
}

function InboxMini() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const statuses = [t('landing.inboxNew'), t('landing.inboxArrived'), t('landing.inboxTreated')];
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setTick((v) => v + 1), 2200);
    return () => window.clearInterval(id);
  }, [reduce]);
  const base = [
    { id: 'A', name: 'Umwana · 4', urgent: true },
    { id: 'B', name: 'Umugore · 27', urgent: false },
    { id: 'C', name: 'Umwana · 2', urgent: true },
  ];
  const items = [...base.slice(tick % 3), ...base.slice(0, tick % 3)];
  return (
    <motion.ul layout className="space-y-2">
      {items.map((it, i) => {
        const st = (i + tick) % 3;
        return (
          <motion.li
            layout
            key={it.id}
            transition={spring}
            className="flex items-center justify-between rounded-[18px] bg-white/75 px-4 py-3 ring-1 ring-[var(--zm-separator)] dark:bg-white/5"
          >
            <span className="flex items-center gap-3">
              <span className={cn('h-2.5 w-2.5 rounded-full', it.urgent ? 'bg-[var(--zm-danger)]' : 'bg-[var(--zm-amber)]')} />
              <span className="text-[14.5px] font-medium">{it.name}</span>
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={st}
                initial={{ opacity: 0, y: 6, filter: 'blur(3px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -6, filter: 'blur(3px)' }}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[12px] font-semibold',
                  st === 0 && 'bg-[rgba(11,60,93,0.1)] text-[var(--zm-ocean)] dark:text-sky-300',
                  st === 1 && 'bg-[rgba(217,119,6,0.14)] text-[var(--zm-amber)]',
                  st === 2 && 'bg-[rgba(20,128,122,0.14)] text-[var(--zm-teal)]',
                )}
              >
                {statuses[st]}
              </motion.span>
            </AnimatePresence>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}

function HotspotMini() {
  const dots = [
    { x: 72, y: 22, s: 1.4 },
    { x: 58, y: 62, s: 1.1 },
    { x: 82, y: 58, s: 1 },
    { x: 30, y: 46, s: 0.7 },
    { x: 18, y: 70, s: 0.6 },
    { x: 46, y: 30, s: 0.5 },
  ];
  const reduce = useReducedMotion();
  return (
    <div className="relative mt-4 h-[96px] overflow-hidden rounded-[18px] bg-[radial-gradient(rgba(11,60,93,0.18)_1px,transparent_1.5px)] [background-size:10px_10px] dark:bg-[radial-gradient(rgba(255,255,255,0.14)_1px,transparent_1.5px)]">
      {dots.map((d, i) => (
        <span key={i} className="absolute" style={{ left: `${d.x}%`, top: `${d.y}%` }}>
          <motion.span
            animate={reduce ? undefined : { scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 2.4, delay: i * 0.3 }}
            className={cn('absolute -translate-x-1/2 -translate-y-1/2 rounded-full', d.s > 0.9 ? 'bg-[var(--zm-amber)]' : 'bg-[var(--zm-teal)]')}
            style={{ width: 22 * d.s, height: 22 * d.s }}
          />
          <span
            className={cn('absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white', d.s > 0.9 ? 'bg-[var(--zm-amber)]' : 'bg-[var(--zm-teal)]')}
            style={{ width: 10 * d.s + 4, height: 10 * d.s + 4 }}
          />
        </span>
      ))}
    </div>
  );
}

/* ================================================================
   Safety: three glass layers that separate on scroll
================================================================ */
function Safety() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const spread = useTransform(scrollYProgress, [0, 1], [reduce ? 1 : 0, 1]);
  const y1 = useTransform(spread, [0, 1], [60, 0]);
  const y3 = useTransform(spread, [0, 1], [-60, 0]);
  const rot = useTransform(spread, [0, 1], [28, 14]);

  const layers = [
    { tag: t('landing.layerTag1'), t: t('landing.layer1T'), b: t('landing.layer1B'), tone: 'ocean' as OrbTone },
    { tag: t('landing.layerTag2'), t: t('landing.layer2T'), b: t('landing.layer2B'), tone: 'teal' as OrbTone },
    { tag: t('landing.layerTag3'), t: t('landing.layer3T'), b: t('landing.layer3B'), tone: 'amber' as OrbTone },
  ];

  return (
    <section id="safety" className="relative scroll-mt-20 overflow-hidden bg-[var(--zm-canvas-2)] py-24 lg:py-36">
      <LiveBackground variant="light" className="opacity-70 dark:opacity-20" />
      <div className="relative mx-auto grid max-w-[1180px] items-center gap-16 px-5 sm:px-8 lg:grid-cols-2">
        <div>
          <Reveal>
            <Eyebrow>{t('landing.safetyEyebrow')}</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="zm-title mt-4 text-[38px] sm:text-[52px]">
              <span className="zm-text-ocean">{t('landing.safetyTitle')}</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-8 rounded-[22px] border border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.08)] p-5 text-[15px] leading-relaxed">
              <p className="font-semibold">{t('common.disclaimer')}</p>
              <p className="mt-1 text-[var(--zm-label-2)]">{t('landing.syntheticNote')}</p>
            </div>
          </Reveal>
        </div>

        <div ref={ref} className="relative mx-auto h-[490px] w-full max-w-[480px] [perspective:1400px]">
          {layers.map((l, i) => (
            <motion.div
              key={l.tag}
              style={{
                y: i === 0 ? y1 : i === 2 ? y3 : 0,
                rotateX: rot,
                top: `${i * 158}px`,
              }}
              className="absolute inset-x-0 [transform-style:preserve-3d]"
            >
              <Glass strong className="rounded-[28px] p-5">
                <div className="flex items-start gap-4">
                  <Orb size={48} tone={l.tone} delay={i}>
                    <span className="text-[18px]">{i + 1}</span>
                  </Orb>
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--zm-label-3)]">{l.tag}</p>
                    <p className="mt-0.5 text-[20px] font-semibold tracking-[-0.02em]">{l.t}</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-[var(--zm-label-2)]">{l.b}</p>
                  </div>
                </div>
              </Glass>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Voice + Offline (dark)
================================================================ */
function VoiceAndOffline() {
  const { t } = useTranslation();
  return (
    <section id="voice" className="zm-ocean relative isolate scroll-mt-20 overflow-hidden py-24 lg:py-36">
      <LiveBackground variant="ocean" />
      <div className="relative mx-auto max-w-[1180px] px-5 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Reveal>
              <Eyebrow tone="dark">{t('landing.voiceEyebrow')}</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="zm-title mt-4 text-[38px] sm:text-[52px]">{t('landing.voiceTitle')}</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-5 max-w-[520px] text-[18px] leading-relaxed text-white/70">{t('landing.voiceBody')}</p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="zm-siri mt-10 max-w-[460px] rounded-[30px]">
                <div className="relative rounded-[30px] bg-[rgba(3,20,31,0.88)] p-6 backdrop-blur-xl">
                  <p className="text-[13px] font-medium text-white/50">{t('landing.voiceListening')}</p>
                  <p className="mt-2 text-[24px] font-semibold tracking-[-0.02em]">{t('landing.voiceSample')}</p>
                  <Waveform />
                  <div className="mt-5 flex gap-2">
                    <span className="rounded-full bg-white px-5 py-2 text-[15px] font-semibold text-[var(--zm-ocean)]">{t('triage.yes')}</span>
                    <span className="rounded-full bg-white/10 px-5 py-2 text-[15px] font-semibold ring-1 ring-white/15">{t('triage.no')}</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="grid gap-4">
            <Reveal>
              <ParallaxImage src={img('voice-listening.jpg')} alt="Health worker explaining a question to a mother during a malaria check" hue="ocean" className="h-[340px] rounded-[36px] ring-1 ring-white/10" />
            </Reveal>
            <Reveal delay={0.08}>
              <OfflineCard />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function Waveform() {
  const reduce = useReducedMotion();
  const bars = 36;
  return (
    <div className="mt-5 flex h-12 items-center gap-[3px]" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const base = 0.25 + 0.75 * Math.abs(Math.sin(i * 0.55));
        return (
          <motion.span
            key={i}
            className="w-[4px] flex-1 rounded-full bg-[linear-gradient(180deg,var(--zm-teal-glow),var(--zm-amber-bright))]"
            animate={reduce ? { height: `${base * 60}%` } : { height: [`${base * 30}%`, `${base * 100}%`, `${base * 45}%`] }}
            transition={{ repeat: Infinity, repeatType: 'mirror', duration: 0.9 + (i % 5) * 0.12, ease: 'easeInOut' }}
          />
        );
      })}
    </div>
  );
}

function OfflineCard() {
  const { t } = useTranslation();
  const [offline, setOffline] = useState(true);
  const [queue, setQueue] = useState(3);
  const [syncing, setSyncing] = useState(false);
  useEffect(() => {
    if (offline) return;
    if (queue === 0) {
      setSyncing(false);
      return;
    }
    setSyncing(true);
    const id = window.setTimeout(() => setQueue((q) => q - 1), 650);
    return () => window.clearTimeout(id);
  }, [offline, queue]);

  return (
    <Glass tone="dark" className="rounded-[32px] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Eyebrow tone="dark">{t('landing.offlineEyebrow')}</Eyebrow>
          <p className="mt-2 text-[24px] font-semibold tracking-[-0.02em]">{t('landing.offlineTitle')}</p>
          <p className="mt-1.5 max-w-[380px] text-[15px] leading-relaxed text-white/65">{t('landing.offlineBody')}</p>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between rounded-[20px] bg-white/[0.06] px-4 py-3 ring-1 ring-white/10">
        <span className="flex items-center gap-3 text-[16px] font-medium">
          <Orb size={30} tone={offline ? 'amber' : 'teal'} />
          {t('landing.offlineToggle')}
        </span>
        <Toggle
          checked={offline}
          onChange={(v) => {
            setOffline(v);
            if (v) setQueue((q) => (q === 0 ? 3 : q));
          }}
          label={t('landing.offlineToggle')}
        />
      </div>
      <div className="mt-3 flex items-center gap-2 px-1 text-[14px] text-white/70" aria-live="polite">
        {queue === 0 ? (
          <>
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#30d158]">
              <DrawCheck size={10} />
            </span>
            {t('landing.offlineSynced')}
          </>
        ) : (
          <>
            {syncing ? <RingSpinner className="text-[var(--zm-teal-glow)]" /> : <Ping color="var(--zm-amber-bright)" size={8} />}
            {t('landing.offlineQueued', { count: queue })}
          </>
        )}
      </div>
    </Glass>
  );
}

/* ================================================================
   Final CTA + footer
================================================================ */
function FinalCta() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto max-w-[1180px] px-5 py-24 sm:px-8 lg:py-32">
      <Reveal>
        <SmartImage src={img('cta-community.jpg')} alt="Rwandan community gathered at a health post" hue="dusk" className="rounded-[44px]">
          <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(3,20,31,0.92)_20%,rgba(6,36,58,0.55)_60%,rgba(6,36,58,0.2))]" />
          <div className="relative px-7 py-16 text-white sm:px-14 sm:py-24">
            <h2 className="zm-title max-w-[640px] text-[38px] sm:text-[56px]">{t('landing.ctaTitle')}</h2>
            <p className="mt-5 max-w-[520px] text-[18px] leading-relaxed text-white/72">{t('landing.ctaBody')}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Magnetic>
                <PillLink to="/login" variant="white" size="lg">
                  {t('landing.signIn')}
                  <GlideArrow />
                </PillLink>
              </Magnetic>
              <PillLink to="/signup" variant="glassDark" size="lg">
                {t('landing.requestAccess')}
              </PillLink>
            </div>
          </div>
        </SmartImage>
      </Reveal>
    </section>
  );
}

function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-[var(--zm-separator)]">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-[460px] text-[13px] leading-relaxed text-[var(--zm-label-2)]">
            {t('common.disclaimer')} · {t('landing.syntheticNote')}
          </p>
        </div>
        <div className="text-[13px] leading-relaxed text-[var(--zm-label-3)] md:text-right">
          <p>{t('landing.footerBuilt')}</p>
          <p>{t('landing.footerOwner')}</p>
          <LangSwitch className="mt-3" />
        </div>
      </div>
    </footer>
  );
}

/* Numbered step marker with an activity ring that fills when the step is active */
function StepDot({ n, active, done, tone }: { n: number; active: boolean; done: boolean; tone: OrbTone }) {
  const size = 44;
  const r = 19;
  return (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
      <AnimatePresence>
        {active ? (
          <motion.span key="orb" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={bouncy} className="absolute inset-[5px]">
            <Orb size={34} tone={tone} />
          </motion.span>
        ) : null}
      </AnimatePresence>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={22} cy={22} r={r} fill="none" stroke="var(--zm-separator)" strokeWidth="2" />
        <motion.circle cx={22} cy={22} r={r} fill="none" stroke="var(--zm-teal)" strokeWidth="2.5" strokeLinecap="round" initial={false} animate={{ pathLength: active || done ? 1 : 0 }} transition={{ duration: 0.8, ease: iosEase }} />
      </svg>
      <span className={cn('relative z-10 text-[15px] font-bold tabular transition-colors duration-500', active ? 'text-white' : done ? 'text-[var(--zm-teal)]' : 'text-[var(--zm-label-3)]')}>{n}</span>
    </span>
  );
}
