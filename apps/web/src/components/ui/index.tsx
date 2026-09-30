import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';
import { scalePress } from '../../lib/motion';

/* ---------- Button ---------- */
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
    primary: 'bg-primary text-primary-foreground hover:opacity-95 shadow-card',
    secondary: 'bg-surface text-ink border border-border hover:bg-surface-muted',
    outline: 'bg-transparent text-ink border border-border hover:bg-surface-muted',
    ghost: 'bg-transparent text-ink-muted hover:bg-surface-muted hover:text-ink',
    danger: 'bg-danger text-white hover:opacity-95',
  };
  const sizes: Record<ButtonSize, string> = {
    sm: 'h-10 px-3 text-sm rounded-control',
    md: 'h-12 px-4 text-sm rounded-control',
    lg: 'h-14 px-5 text-base rounded-control',
  };
  return (
    <motion.button
      whileTap={reduce || disabled || loading ? undefined : scalePress}
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex touch-target items-center justify-center gap-2 font-semibold transition disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...(props as any)}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : leftIcon}
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
        'touch-target inline-flex h-10 items-center justify-center gap-1.5 rounded-control border border-border bg-surface px-2 text-ink hover:bg-surface-muted',
        showLabel && 'px-3 text-xs font-semibold',
        className,
      )}
      {...props}
    >
      {children}
      {showLabel ? <span className="hidden lg:inline">{label}</span> : null}
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
  return (
    <div
      className={cn(
        'rounded-card border border-border bg-surface p-4 shadow-card',
        hover && 'transition hover:-translate-y-0.5 hover:shadow-lift',
        className,
      )}
    >
      {children}
    </div>
  );
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
    neutral: 'bg-surface-muted text-ink-muted',
    accent: 'bg-accent-soft text-accent',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
    info: 'bg-info-soft text-info',
    primary: 'bg-primary-soft text-primary',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
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

/* ---------- Inputs ---------- */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-12 w-full rounded-control border border-border bg-surface px-3 text-base text-ink placeholder:text-ink-muted',
          className,
        )}
        {...props}
      />
    );
  },
);

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-12 w-full rounded-control border border-border bg-surface px-3 text-sm text-ink',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

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
  return (
    <div className={cn('grid gap-2', options.length === 2 ? 'grid-cols-2' : 'grid-cols-3', className)} role="group">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              'touch-target flex items-center justify-center gap-2 rounded-control border px-3 py-3 text-base font-semibold transition',
              selected
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border bg-surface text-ink hover:bg-surface-muted',
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Feedback ---------- */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-card bg-surface-muted', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/5" />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface px-6 py-12 text-center">
      <div className="mb-3 text-ink-muted">{icon}</div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div>
      {label ? <div className="mb-1 flex justify-between text-xs text-ink-muted">{label}</div> : null}
      <div className="h-2 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
        <motion.div
          className="h-full rounded-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          transition={{ duration: 0.35 }}
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
              <span
                className={cn(
                  'mt-0.5 h-3 w-3 rounded-full border-2',
                  done ? 'border-accent bg-accent' : 'border-border bg-surface',
                )}
              />
              {i < steps.length - 1 ? (
                <span className={cn('my-1 w-0.5 flex-1 min-h-[20px]', done && i < idx ? 'bg-accent' : 'bg-border')} />
              ) : null}
            </div>
            <span className={cn('pb-4 text-sm', done ? 'font-semibold text-ink' : 'text-ink-muted')}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function KpiCard({
  label,
  value,
  icon,
  delta,
  spark,
  suffix,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  delta?: { value: number; label?: string };
  spark?: number[];
  suffix?: string;
}) {
  const positive = (delta?.value ?? 0) >= 0;
  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
          <p className="mt-2 font-semibold tabular text-2xl text-ink">
            {value}
            {suffix}
          </p>
          {delta ? (
            <p className={cn('mt-1 text-xs font-semibold', positive ? 'text-success' : 'text-danger')}>
              {positive ? '↑' : '↓'} {Math.abs(delta.value)}
              {delta.label ? ` ${delta.label}` : ''}
            </p>
          ) : null}
        </div>
        <div className="rounded-control bg-primary-soft p-2 text-primary">{icon}</div>
      </div>
      {spark && spark.length ? (
        <div className="mt-3 flex h-8 items-end gap-0.5">
          {spark.map((v, i) => (
            <span
              key={i}
              className="flex-1 rounded-sm bg-accent/40"
              style={{ height: `${Math.max(12, (v / Math.max(...spark)) * 100)}%` }}
            />
          ))}
        </div>
      ) : null}
    </Card>
  );
}

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-control border border-border bg-surface-muted p-1" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'whitespace-nowrap rounded-[8px] px-3 py-2 text-sm font-semibold transition',
            value === tab.id ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink',
          )}
        >
          {tab.label}
          {typeof tab.count === 'number' ? (
            <span className="ml-1.5 text-xs text-ink-muted">{tab.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function Disclaimer({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-2 text-sm leading-5 text-ink-muted">
      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-info-soft text-[10px] font-bold text-info" aria-hidden>
        i
      </span>
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
  const tones = {
    info: 'border-info/30 bg-info-soft text-info',
    success: 'border-success/30 bg-success-soft text-success',
    warning: 'border-warning/30 bg-warning-soft text-warning',
    danger: 'border-danger/30 bg-danger-soft text-danger',
  };
  return (
    <div
      role="status"
      className={cn(
        'fixed bottom-24 left-1/2 z-50 w-[min(420px,calc(100%-2rem))] -translate-x-1/2 rounded-control border px-4 py-3 text-sm font-semibold shadow-lift md:bottom-6',
        tones[tone],
      )}
    >
      {message}
    </div>
  );
}
