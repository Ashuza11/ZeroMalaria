import { forwardRef, useId, useMemo, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';
import { bouncy, iosEase, spring } from '../../lib/motion';
import { DrawCheck, Orb, RingSpinner } from '../liquid/alive';

/* ---------- Button (iOS capsule, springy press) ---------- */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const variants: Record<ButtonVariant, string> = {
    primary:
      'text-white bg-[linear-gradient(180deg,#135a85_0%,#0b3c5d_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_24px_-12px_rgba(11,60,93,0.75)] hover:brightness-110 dark:bg-[linear-gradient(180deg,#1a6d9c_0%,#125278_100%)]',
    secondary:
      'bg-[rgba(118,118,128,0.12)] text-ink hover:bg-[rgba(118,118,128,0.2)]',
    outline: 'bg-transparent text-ink ring-1 ring-inset ring-border hover:bg-[rgba(118,118,128,0.08)]',
    ghost: 'bg-transparent text-accent hover:bg-[rgba(20,128,122,0.09)]',
    danger:
      'text-white bg-[linear-gradient(180deg,#f0555a_0%,#c53035_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_24px_-12px_rgba(229,72,77,0.7)] hover:brightness-110',
  };
  const sizes: Record<ButtonSize, string> = {
    sm: 'h-10 px-4 text-[14px]',
    md: 'h-12 px-5 text-[15px]',
    lg: 'h-14 px-6 text-[17px]',
  };
  return (
    <motion.button
      whileTap={reduce || disabled || loading ? undefined : { scale: 0.96 }}
      transition={bouncy}
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex touch-target select-none items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.01em] transition-[filter,background-color,box-shadow] duration-300 disabled:cursor-not-allowed disabled:opacity-45',
        variants[variant],
        sizes[size],
        className,
      )}
      {...(props as any)}
    >
      {loading ? <RingSpinner className="h-4 w-4" /> : leftIcon}
      {children}
      {!loading ? rightIcon : null}
    </motion.button>
  );
}

export function IconButton({
  label,
  children,
  className,
  showLabel,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  /** Show text label beside icon (desktop headers). */
  showLabel?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'touch-target inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full bg-[rgba(118,118,128,0.12)] px-2.5 text-ink transition-[background-color,transform] duration-300 hover:bg-[rgba(118,118,128,0.2)] active:scale-95 disabled:opacity-45',
        showLabel && 'px-3.5 text-[13px] font-semibold',
        className,
      )}
      {...props}
    >
      {children}
      {showLabel ? <span className="hidden xl:inline">{label}</span> : null}
    </button>
  );
}

export {
  PageHeader,
  SectionCard,
  TwoPanelLayout,
  StepperLayout,
  ErrorState,
  PageSkeleton,
  SyntheticBadge,
} from './layout';
export type { StepperItem } from './layout';

/* ---------- Card / Badge / Pills ---------- */
export function Card({
  children,
  className,
  hover,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return <div className={cn('zm-card rounded-card p-4', hover && 'zm-card-hover cursor-pointer', className)}>{children}</div>;
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'primary';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-[rgba(118,118,128,0.12)] text-ink-muted',
    accent: 'bg-accent-soft text-accent',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
    info: 'bg-info-soft text-info',
    primary: 'bg-primary-soft text-primary dark:text-sky-300',
  };
  const dots = {
    neutral: 'bg-ink-muted',
    accent: 'bg-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
    primary: 'bg-primary dark:bg-sky-300',
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[12px] font-semibold tracking-[-0.005em]', tones[tone], className)}>
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dots[tone])} aria-hidden />
      {children}
    </span>
  );
}

export function StatusPill({
  status,
}: {
  status: 'treat_at_home' | 'refer' | 'urgent_refer' | 'sent' | 'received' | 'arrived' | 'treated' | 'overdue' | 'online' | 'offline' | 'syncing';
}) {
  const { t } = useTranslation();
  const map: Record<string, { tone: Parameters<typeof Badge>[0]['tone']; label: string }> = {
    treat_at_home: { tone: 'success', label: t('status.treat') },
    refer: { tone: 'warning', label: t('status.refer') },
    urgent_refer: { tone: 'danger', label: t('status.urgent') },
    sent: { tone: 'info', label: t('referrals.sent') },
    received: { tone: 'primary', label: t('referrals.received') },
    arrived: { tone: 'accent', label: t('referrals.arrived') },
    treated: { tone: 'success', label: t('referrals.treated') },
    overdue: { tone: 'warning', label: t('common.followUp') },
    online: { tone: 'success', label: t('status.online') },
    offline: { tone: 'warning', label: t('status.offline') },
    syncing: { tone: 'info', label: t('status.syncing') },
  };
  const conf = map[status] || { tone: 'neutral' as const, label: status };
  return <Badge tone={conf.tone}>{conf.label}</Badge>;
}

/* ---------- Inputs (iOS filled fields) ---------- */
const fieldBase =
  'w-full rounded-control border border-transparent bg-[rgba(118,118,128,0.1)] px-4 text-ink placeholder:text-ink-muted/80 transition-[box-shadow,background-color,border-color] duration-300 hover:bg-[rgba(118,118,128,0.14)] focus:border-accent/50 focus:bg-surface focus:outline-none focus:ring-4 focus:ring-accent/15 dark:bg-white/[0.06]';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn('h-12 text-[16px]', fieldBase, className)} {...props} />;
  },
);

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-12 cursor-pointer appearance-none bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10 text-[15px] font-medium',
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3.5 6 8 10.5 12.5 6' fill='none' stroke='%235f7080' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")]",
        fieldBase,
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

/* iOS segmented control with a sliding thumb */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
  className?: string;
}) {
  const uid = useId();
  return (
    <div
      className={cn('grid gap-1 rounded-[18px] bg-[rgba(118,118,128,0.12)] p-1', options.length === 2 ? 'grid-cols-2' : 'grid-cols-3', className)}
      role="group"
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              'touch-target relative flex items-center justify-center gap-2 rounded-[14px] px-3 py-3 text-[16px] font-semibold transition-colors duration-300',
              selected ? 'text-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            {selected ? (
              <motion.span
                layoutId={`seg-${uid}`}
                transition={spring}
                className="absolute inset-0 rounded-[14px] bg-surface shadow-[0_3px_10px_rgba(6,36,58,0.12),0_1px_2px_rgba(6,36,58,0.06)] dark:bg-white/15"
              />
            ) : null}
            <span className="relative z-10 flex items-center gap-2">
              {opt.icon}
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Feedback ---------- */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-card bg-[rgba(118,118,128,0.1)]', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/5" />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="zm-card zm-empty flex flex-col items-center justify-center rounded-card px-6 py-14 text-center">
      <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={bouncy} className="mb-5 inline-flex">
        <Orb size={60} tone="ocean" />
      </motion.span>
      <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-[15px] leading-relaxed text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div>
      {label ? <div className="mb-1.5 flex justify-between text-[13px] font-medium text-ink-muted">{label}</div> : null}
      <div className="h-2 overflow-hidden rounded-full bg-[rgba(118,118,128,0.16)]" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
        <motion.div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-accent),#2bb3a6)]"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          transition={{ duration: 0.8, ease: iosEase }}
        />
      </div>
    </div>
  );
}

export function Timeline({
  steps,
  current,
}: {
  steps: { key: string; label: string }[];
  current: string;
}) {
  const idx = Math.max(0, steps.findIndex((s) => s.key === current));
  return (
    <ol className="space-y-0">
      {steps.map((step, i) => {
        const done = i <= idx;
        return (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <motion.span
                initial={false}
                animate={{ scale: done ? 1 : 0.75, backgroundColor: done ? 'var(--color-accent)' : 'rgba(120,120,128,0.22)' }}
                transition={{ ...bouncy, delay: i * 0.06 }}
                className="flex h-5 w-5 items-center justify-center rounded-full"
              >
                <DrawCheck on={done} size={10} />
              </motion.span>
              {i < steps.length - 1 ? (
                <span className="relative my-1 min-h-[22px] w-[3px] flex-1 overflow-hidden rounded-full bg-[rgba(120,120,128,0.18)]">
                  <motion.span
                    className="absolute inset-x-0 top-0 rounded-full bg-accent"
                    initial={false}
                    animate={{ height: done && i < idx ? '100%' : '0%' }}
                    transition={{ duration: 0.6, ease: iosEase, delay: i * 0.08 }}
                  />
                </span>
              ) : null}
            </div>
            <span className={cn('pb-4 text-[15px] leading-5', done ? 'font-semibold text-ink' : 'text-ink-muted')}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Smooth, self-drawing sparkline from real data. */
function DataSpark({ data }: { data: number[] }) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, '');
  const d = useMemo(() => {
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const span = max - min || 1;
    const pts = data.map((v, i) => [data.length === 1 ? 50 : (i / (data.length - 1)) * 100, 36 - ((v - min) / span) * 30]);
    return pts.reduce((acc, [x, y], i) => {
      if (i === 0) return `M${x},${y}`;
      const [px, py] = pts[i - 1];
      const cx = (px + x) / 2;
      return `${acc} C${cx},${py} ${cx},${y} ${x},${y}`;
    }, '');
  }, [data]);
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-3 h-10 w-full overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={`kf${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14807a" stopOpacity="0.28" />
          <stop offset="1" stopColor="#14807a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L100,40 L0,40 Z`} fill={`url(#kf${id})`} />
      <motion.path
        d={d}
        fill="none"
        stroke="#14807a"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: reduce ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: iosEase }}
      />
    </svg>
  );
}

/** iOS widget-style KPI tile. `icon` is kept for API compatibility; a living orb replaces icon tiles. */
export function KpiCard({
  label,
  value,
  delta,
  spark,
  suffix,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  delta?: { value: number; label?: string };
  spark?: number[];
  suffix?: string;
}) {
  const positive = (delta?.value ?? 0) >= 0;
  const tone = useMemo(() => {
    const tones = ['ocean', 'teal', 'amber', 'sky', 'dusk'] as const;
    let h = 0;
    for (const c of label) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return tones[h % tones.length];
  }, [label]);
  return (
    <Card className="relative flex h-full flex-col overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12.5px] font-semibold uppercase leading-4 tracking-[0.06em] text-ink-muted">{label}</p>
        <Orb size={26} tone={tone} />
      </div>
      <motion.p
        initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.7, ease: iosEase }}
        className="mt-3 text-[34px] font-bold leading-none tracking-[-0.035em] text-ink tabular"
      >
        {value}
        {suffix ? <span className="ml-0.5 text-[20px] font-semibold text-ink-muted">{suffix}</span> : null}
      </motion.p>
      {delta ? (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] leading-4">
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold tabular',
              positive ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
            )}
          >
            {positive ? '↑' : '↓'} {Math.abs(delta.value)}
          </span>
          {delta.label ? <span className="font-medium text-ink-muted">{delta.label}</span> : null}
        </p>
      ) : null}
      {spark && spark.length ? <DataSpark data={spark} /> : null}
    </Card>
  );
}

/* iOS segmented tabs with sliding thumb */
export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const uid = useId();
  return (
    <div className="zm-scroll-hide inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-[rgba(118,118,128,0.12)] p-1" role="tablist">
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative whitespace-nowrap rounded-full px-4 py-2 text-[14px] font-semibold transition-colors duration-300',
              active ? 'text-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            {active ? (
              <motion.span
                layoutId={`tab-${uid}`}
                transition={spring}
                className="absolute inset-0 rounded-full bg-surface shadow-[0_3px_10px_rgba(6,36,58,0.12),0_1px_2px_rgba(6,36,58,0.06)] dark:bg-white/15"
              />
            ) : null}
            <span className="relative z-10">
              {tab.label}
              {typeof tab.count === 'number' ? (
                <span className={cn('ml-1.5 rounded-full px-1.5 py-px text-[11px] tabular', active ? 'bg-accent-soft text-accent' : 'bg-black/5 dark:bg-white/10')}>{tab.count}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Disclaimer({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-2.5 text-[13.5px] leading-5 text-ink-muted">
      <span className="mt-[5px] inline-flex h-2 w-2 shrink-0 rounded-full bg-[linear-gradient(135deg,#14807a,#d97706)]" aria-hidden />
      <span>{text}</span>
    </p>
  );
}

export function Toast({
  open,
  message,
  tone = 'info',
}: {
  open: boolean;
  message: string;
  tone?: 'info' | 'success' | 'warning' | 'danger';
}) {
  if (!open) return null;
  const dot = {
    info: '#7dd3fc',
    success: '#30d158',
    warning: '#f5a524',
    danger: '#ff6b70',
  };
  return (
    <div
      role="status"
      className="zm-toast fixed bottom-24 left-1/2 z-[70] flex w-[min(440px,calc(100%-2rem))] -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-[rgba(8,28,44,0.9)] px-5 py-3.5 text-[14.5px] font-semibold text-white shadow-[0_24px_50px_-18px_rgba(0,0,0,0.6)] backdrop-blur-xl md:bottom-8"
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inset-0 animate-ping rounded-full opacity-60" style={{ background: dot[tone] }} />
        <span className="relative h-2.5 w-2.5 rounded-full" style={{ background: dot[tone] }} />
      </span>
      {message}
    </div>
  );
}
