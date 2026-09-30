import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { iosEase, spring } from '../../lib/motion';
import { DrawCheck } from '../liquid/alive';
import { Badge, Button, Card, EmptyState, Skeleton } from './index';

/** Shared page title block used on every web screen (iOS large title). */
export function PageHeader({
  title,
  subtitle,
  actions,
  badge,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <motion.div
        className="min-w-0"
        initial={reduce ? false : { opacity: 0, y: 10, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.7, ease: iosEase }}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.03em] text-ink md:text-[34px]">{title}</h1>
          {badge}
        </div>
        {subtitle ? <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-muted">{subtitle}</p> : null}
      </motion.div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionCard({
  title,
  subtitle,
  children,
  className,
  action,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <Card className={cn('p-5 md:p-6', className)}>
      {(title || action) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </Card>
  );
}

export function TwoPanelLayout({
  list,
  detail,
  listWidth = 'md',
}: {
  list: ReactNode;
  detail: ReactNode;
  listWidth?: 'sm' | 'md' | 'lg';
}) {
  const w = listWidth === 'sm' ? 'lg:w-[320px]' : listWidth === 'lg' ? 'lg:w-[440px]' : 'lg:w-[380px]';
  return (
    <div className="flex min-h-[480px] flex-col gap-5 lg:flex-row">
      <div className={cn('shrink-0 space-y-2.5 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto lg:pr-1', w)}>{list}</div>
      <div className="min-w-0 flex-1">{detail}</div>
    </div>
  );
}

export type StepperItem = { id: string; label: string };

/** Desktop triage: left stepper | center question | right help + summary. */
export function StepperLayout({
  steps,
  currentId,
  question,
  help,
  summary,
}: {
  steps: StepperItem[];
  currentId: string;
  question: ReactNode;
  help: ReactNode;
  summary: ReactNode;
}) {
  const idx = Math.max(0, steps.findIndex((s) => s.id === currentId));
  return (
    <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
      <aside className="hidden xl:block">
        <SectionCard className="sticky top-24">
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[rgba(118,118,128,0.16)]">
            <motion.div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-accent),#d97706)]"
              initial={false}
              animate={{ width: `${((idx + 1) / Math.max(1, steps.length)) * 100}%` }}
              transition={{ duration: 0.7, ease: iosEase }}
            />
          </div>
          <ol className="relative space-y-1">
            {steps.map((s, i) => {
              const done = i < idx;
              const current = i === idx;
              return (
                <li
                  key={s.id}
                  className={cn(
                    'relative flex items-center gap-2.5 rounded-[14px] px-2.5 py-2 text-[14px] transition-colors duration-300',
                    current && 'font-semibold text-ink',
                    done && 'text-ink',
                    !done && !current && 'text-ink-muted',
                  )}
                >
                  {current ? <motion.span layoutId="stepper-current" transition={spring} className="absolute inset-0 rounded-[14px] bg-primary-soft" /> : null}
                  <motion.span
                    initial={false}
                    animate={{
                      backgroundColor: done ? 'var(--color-accent)' : current ? 'var(--color-primary)' : 'rgba(120,120,128,0.18)',
                      scale: current ? 1.08 : 1,
                    }}
                    transition={spring}
                    className={cn('relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', done || current ? 'text-white' : 'text-ink-muted')}
                  >
                    {done ? <DrawCheck size={12} /> : i + 1}
                  </motion.span>
                  <span className="relative z-10 leading-tight">{s.label}</span>
                </li>
              );
            })}
          </ol>
        </SectionCard>
      </aside>
      <div className="min-w-0">{question}</div>
      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        {help}
        {summary}
      </aside>
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = 'Retry',
}: {
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={
        onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : undefined
      }
    />
  );
}

export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </div>
  );
}

export function SyntheticBadge({ label }: { label: string }) {
  return (
    <Badge tone="warning" className="min-h-[26px] px-3">
      {label}
    </Badge>
  );
}
