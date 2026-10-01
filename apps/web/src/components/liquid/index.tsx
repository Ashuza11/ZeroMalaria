import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type HTMLMotionProps,
} from 'framer-motion';
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { blurUp, bouncy, spring } from '../../lib/motion';
import { setLanguage } from '../../i18n';

/* ---------------------------------------------------------------
   Logo: the favicon mark (ring + amber smile), drawn on mount
---------------------------------------------------------------- */
export function LogoMark({
  size = 36,
  className,
  animated = true,
}: {
  size?: number;
  className?: string;
  animated?: boolean;
}) {
  const reduce = useReducedMotion();
  const draw = animated && !reduce;
  const gradientId = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#125278" />
          <stop offset="1" stopColor="#06243a" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${gradientId})`} />
      <rect x="0.5" y="0.5" width="63" height="63" rx="17.5" stroke="white" strokeOpacity="0.18" />
      <motion.circle
        cx="32"
        cy="32"
        r="17"
        stroke="#2bb3a6"
        strokeWidth="4.5"
        initial={draw ? { pathLength: 0, rotate: -90 } : false}
        animate={{ pathLength: 1, rotate: 0 }}
        transition={{ duration: 1.4, ease: [0.32, 0.72, 0, 1] }}
        style={{ originX: '50%', originY: '50%' }}
      />
      <motion.path
        d="M21 34.5c6 8 16 8 22 0"
        stroke="#f5a524"
        strokeWidth="4.5"
        strokeLinecap="round"
        initial={draw ? { pathLength: 0, opacity: 0 } : false}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.7, ease: [0.32, 0.72, 0, 1] }}
      />
    </svg>
  );
}

export function Wordmark({ light, className }: { light?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={34} />
      <span className={cn('text-[19px] font-semibold tracking-[-0.02em]', light ? 'text-white' : 'text-[var(--zm-label)]')}>
        Zero<span className={light ? 'text-[var(--zm-teal-glow)]' : 'text-[var(--zm-teal)]'}>Malaria</span>
      </span>
    </span>
  );
}

/* ---------------------------------------------------------------
   Specular pointer tracking (for .zm-specular surfaces)
---------------------------------------------------------------- */
export function useSpecular<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const onPointerMove = (e: ReactPointerEvent<T>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return { ref, onPointerMove };
}

type GlassProps = HTMLMotionProps<'div'> & { tone?: 'light' | 'dark'; strong?: boolean; tilt?: boolean };

/** A Liquid-Glass surface with rim light, pointer specular and optional 3D tilt. */
export const Glass = forwardRef<HTMLDivElement, GlassProps>(function Glass(
  { tone = 'light', strong, tilt, className, children, style, ...rest },
  _ref,
) {
  const reduce = useReducedMotion();
  const { ref, onPointerMove } = useSpecular<HTMLDivElement>();
  const rx = useSpring(0, { stiffness: 200, damping: 20 });
  const ry = useSpring(0, { stiffness: 200, damping: 20 });
  return (
    <motion.div
      ref={ref}
      onPointerMove={(e) => {
        onPointerMove(e);
        if (tilt && !reduce && ref.current) {
          const r = ref.current.getBoundingClientRect();
          ry.set(((e.clientX - r.left) / r.width - 0.5) * 8);
          rx.set(-((e.clientY - r.top) / r.height - 0.5) * 8);
        }
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      style={tilt ? { rotateX: rx, rotateY: ry, transformPerspective: 900, ...style } : style}
      className={cn(
        tone === 'dark' ? 'zm-glass-dark' : 'zm-glass',
        strong && tone === 'light' && 'zm-glass-strong',
        'zm-specular zm-rim',
        className,
      )}
      {...rest}
    >
      <div className="relative z-[3] h-full">{children as ReactNode}</div>
    </motion.div>
  );
});

/* ---------------------------------------------------------------
   Living background: drifting aurora + pointer spotlight + grain
---------------------------------------------------------------- */
export function LiveBackground({ variant = 'ocean', className }: { variant?: 'ocean' | 'light'; className?: string }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(50);
  const y = useMotionValue(30);
  const sx = useSpring(x, { stiffness: 50, damping: 20 });
  const sy = useSpring(y, { stiffness: 50, damping: 20 });
  const bg = useTransform([sx, sy], ([a, b]) =>
    variant === 'ocean'
      ? `radial-gradient(600px circle at ${a}% ${b}%, rgba(94,234,212,0.16), transparent 60%)`
      : `radial-gradient(700px circle at ${a}% ${b}%, rgba(20,128,122,0.10), transparent 60%)`,
  );

  useEffect(() => {
    if (reduce) return;
    const move = (e: PointerEvent) => {
      x.set((e.clientX / window.innerWidth) * 100);
      y.set((e.clientY / window.innerHeight) * 100);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [reduce, x, y]);

  const blobs =
    variant === 'ocean'
      ? [
          { c: '#14807a', s: '46vw', t: '-12%', l: '52%', d: '0s' },
          { c: '#125278', s: '52vw', t: '18%', l: '-14%', d: '-6s' },
          { c: '#d97706', s: '26vw', t: '58%', l: '66%', d: '-12s', o: 0.28 },
          { c: '#2bb3a6', s: '30vw', t: '70%', l: '8%', d: '-3s', o: 0.3 },
        ]
      : [
          { c: '#9fd8d3', s: '44vw', t: '-18%', l: '55%', d: '0s' },
          { c: '#b9d3e4', s: '50vw', t: '30%', l: '-18%', d: '-7s' },
          { c: '#f7d7a8', s: '24vw', t: '64%', l: '70%', d: '-12s', o: 0.45 },
        ];

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden zm-grain', className)} aria-hidden>
      {blobs.map((b, i) => (
        <span
          key={i}
          className="zm-blob"
          style={{
            background: b.c,
            width: b.s,
            height: b.s,
            top: b.t,
            left: b.l,
            animationDelay: b.d,
            opacity: b.o ?? (variant === 'ocean' ? 0.5 : 0.7),
          }}
        />
      ))}
      <motion.div className="absolute inset-0" style={{ background: bg }} />
    </div>
  );
}

/* ---------------------------------------------------------------
   Reveal: iOS blur-up on scroll into view
---------------------------------------------------------------- */
export function Reveal({
  children,
  className,
  delay = 0,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'h2' | 'p';
}) {
  const reduce = useReducedMotion();
  const M = motion[as] as typeof motion.div;
  if (reduce) return <M className={className}>{children}</M>;
  return (
    <M
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-12% 0px' }}
      variants={blurUp}
      transition={{ delay }}
      custom={delay}
    >
      {children}
    </M>
  );
}

/* ---------------------------------------------------------------
   CountUp: animated number when visible
---------------------------------------------------------------- */
export function CountUp({ to, decimals = 0, suffix = '', className }: { to: number; decimals?: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? to : 0);
  useEffect(() => {
    if (!inView || reduce) return;
    const c = animate(0, to, { duration: 1.6, ease: [0.22, 1, 0.36, 1], onUpdate: setV });
    return () => c.stop();
  }, [inView, to, reduce]);
  return (
    <span ref={ref} className={cn('tabular', className)}>
      {v.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ---------------------------------------------------------------
   Buttons: pill, springy press
---------------------------------------------------------------- */
type PillVariant = 'primary' | 'glass' | 'glassDark' | 'white' | 'plain';

const pillStyles: Record<PillVariant, string> = {
  primary:
    'text-white bg-[linear-gradient(180deg,#135a85_0%,#0b3c5d_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_30px_-10px_rgba(11,60,93,0.7)] hover:brightness-110',
  glass: 'zm-glass text-[var(--zm-label)] hover:bg-white/70',
  glassDark: 'zm-glass-dark text-white hover:bg-white/15',
  white: 'bg-white text-[var(--zm-ocean)] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.45)] hover:bg-white/95',
  plain: 'text-[var(--zm-teal)] hover:bg-[rgba(20,128,122,0.08)]',
};

const pillSizes = {
  sm: 'h-9 px-4 text-[14px]',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-[54px] px-7 text-[17px]',
};

type PillCommon = { variant?: PillVariant; size?: keyof typeof pillSizes; className?: string; children: ReactNode };

export function PillButton({
  variant = 'primary',
  size = 'md',
  className,
  children,
  loading,
  ...rest
}: PillCommon & HTMLMotionProps<'button'> & { loading?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      whileTap={reduce ? undefined : { scale: 0.96 }}
      whileHover={reduce ? undefined : { scale: 1.015 }}
      transition={bouncy}
      className={cn(
        'group relative inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.01em] transition-[filter,background-color] disabled:cursor-not-allowed disabled:opacity-50',
        pillStyles[variant],
        pillSizes[size],
        className,
      )}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <Spinner /> : null}
      <span className={cn('inline-flex items-center gap-2', loading && 'opacity-0')}>{children}</span>
    </motion.button>
  );
}

const MotionLink = motion.create(Link);

export function PillLink({ variant = 'primary', size = 'md', className, children, ...rest }: PillCommon & LinkProps) {
  const reduce = useReducedMotion();
  return (
    <MotionLink
      whileTap={reduce ? undefined : { scale: 0.96 }}
      whileHover={reduce ? undefined : { scale: 1.015 }}
      transition={bouncy}
      className={cn(
        'group relative inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.01em] transition-[filter,background-color]',
        pillStyles[variant],
        pillSizes[size],
        className,
      )}
      {...(rest as any)}
    >
      {children}
    </MotionLink>
  );
}

export function Spinner({ className }: { className?: string }) {
  const { t } = useTranslation();
  // iOS activity indicator: 8 fading spokes
  return (
    <span className={cn('absolute inset-0 flex items-center justify-center', className)} role="status" aria-label={t('common.loading')}>
      <span className="relative h-5 w-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-0 h-[6px] w-[2px] -translate-x-1/2 rounded-full bg-current"
            style={{
              transform: `rotate(${i * 45}deg)`,
              transformOrigin: '50% 10px',
              opacity: 0.25,
              animation: `zm-spoke 0.8s linear infinite`,
              animationDelay: `${-0.8 + i * 0.1}s`,
            }}
          />
        ))}
      </span>
      <style>{`@keyframes zm-spoke{0%{opacity:1}100%{opacity:.2}}`}</style>
    </span>
  );
}

/* ---------------------------------------------------------------
   Language segmented control: RW | EN
---------------------------------------------------------------- */
export function LangSwitch({ tone = 'light', className }: { tone?: 'light' | 'dark'; className?: string }) {
  const { t, i18n } = useTranslation();
  const current = i18n.language.startsWith('rw') ? 'rw' : 'en';
  const uid = useId();
  const opts: Array<{ id: 'rw' | 'en'; label: string; full: string }> = [
    { id: 'rw', label: 'RW', full: t('lang.kinyarwanda') },
    { id: 'en', label: 'EN', full: t('lang.english') },
  ];
  return (
    <div
      role="radiogroup"
      aria-label={t('nav.language')}
      className={cn(
        'relative inline-flex h-9 items-center rounded-full p-[3px]',
        tone === 'dark' ? 'bg-white/10 ring-1 ring-white/15' : 'bg-[rgba(11,27,43,0.06)] ring-1 ring-[var(--zm-separator)]',
        className,
      )}
    >
      {opts.map((o) => {
        const active = current === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.full}
            onClick={() => {
              setLanguage(o.id);
              document.documentElement.lang = o.id;
            }}
            className={cn(
              'relative z-10 h-full min-w-[44px] rounded-full px-3 text-[13px] font-semibold tracking-wide transition-colors',
              active
                ? tone === 'dark'
                  ? 'text-[var(--zm-ocean)]'
                  : 'text-[var(--zm-label)]'
                : tone === 'dark'
                  ? 'text-white/70 hover:text-white'
                  : 'text-[var(--zm-label-2)] hover:text-[var(--zm-label)]',
            )}
          >
            {active ? (
              <motion.span
                layoutId={`lang-pill-${uid}`}
                transition={spring}
                className={cn(
                  'absolute inset-0 -z-10 rounded-full',
                  tone === 'dark' ? 'bg-white' : 'bg-white shadow-[0_2px_8px_rgba(6,36,58,0.14)] dark:bg-white/20',
                )}
              />
            ) : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------
   SmartImage: photo slot with a designed fallback until the
   Gemini-generated image is dropped into /public/images/landing
---------------------------------------------------------------- */
export function SmartImage({
  src,
  alt,
  className,
  imgClassName,
  hue = 'ocean',
  priority,
  children,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  hue?: 'ocean' | 'teal' | 'amber' | 'dusk';
  priority?: boolean;
  children?: ReactNode;
}) {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const fallbacks: Record<string, string> = {
    ocean: 'radial-gradient(90% 70% at 20% 10%, #2bb3a6 0%, transparent 55%), radial-gradient(80% 80% at 90% 90%, #d97706 0%, transparent 45%), linear-gradient(160deg, #125278, #06243a)',
    teal: 'radial-gradient(90% 70% at 80% 10%, #5eead4 0%, transparent 50%), radial-gradient(90% 90% at 0% 100%, #0b3c5d 0%, transparent 60%), linear-gradient(160deg, #14807a, #08304b)',
    amber: 'radial-gradient(80% 70% at 80% 0%, #f5a524 0%, transparent 55%), radial-gradient(90% 90% at 10% 100%, #14807a 0%, transparent 60%), linear-gradient(160deg, #6b3a0a, #06243a)',
    dusk: 'radial-gradient(90% 60% at 50% 0%, #f5a524 0%, transparent 50%), radial-gradient(100% 80% at 50% 100%, #06243a 10%, transparent 70%), linear-gradient(180deg, #d97706, #125278 60%, #06243a)',
  };
  return (
    <div className={cn('relative overflow-hidden', className)} style={{ background: fallbacks[hue] }}>
      {state !== 'ok' ? <span className="zm-grain absolute inset-0" aria-hidden /> : null}
      {state !== 'error' ? (
        <motion.img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setState('ok')}
          onError={() => setState('error')}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={state === 'ok' ? { opacity: 1, scale: 1 } : { opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className={cn('absolute inset-0 h-full w-full object-cover', imgClassName)}
        />
      ) : null}
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------
   iOS toggle switch
---------------------------------------------------------------- */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full p-[2px] transition-colors duration-300',
        checked ? 'bg-[var(--zm-amber)]' : 'bg-[rgba(120,120,128,0.32)]',
      )}
    >
      <motion.span
        layout
        transition={bouncy}
        className={cn('h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_3px_1px_rgba(0,0,0,0.06)]', checked && 'ml-auto')}
      />
    </button>
  );
}

/* Small eyebrow label */
export function Eyebrow({ children, tone = 'light', className }: { children: ReactNode; tone?: 'light' | 'dark'; className?: string }) {
  return (
    <p
      className={cn(
        'text-[13px] font-semibold uppercase tracking-[0.14em]',
        tone === 'dark' ? 'text-[var(--zm-teal-glow)]' : 'text-[var(--zm-teal)]',
        className,
      )}
    >
      {children}
    </p>
  );
}
