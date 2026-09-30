import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Check } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Badge, Button, Card, EmptyState, Skeleton } from './index';

/** Shared page title block used on every web screen. */
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
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-ink md:text-2xl">{title}</h1>
          {badge}
        </div>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-ink-muted">{subtitle}</p> : null}
      </div>
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
    <Card className={cn('p-5', className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            {title ? <h2 className="text-base font-semibold text-ink">{title}</h2> : null}
            {subtitle ? <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p> : null}
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
    <div className="flex min-h-[480px] flex-col gap-4 lg:flex-row">
      <div className={cn('shrink-0 space-y-2 lg:overflow-y-auto', w)}>{list}</div>
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
  const { t } = useTranslation();
  const idx = Math.max(0, steps.findIndex((s) => s.id === currentId));
  return (
    <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_280px]">
      <aside className="hidden xl:block">
        <SectionCard title={t('presenter.steps')} className="sticky top-20">
          <ol className="space-y-2">
            {steps.map((s, i) => {
              const done = i < idx;
              const current = i === idx;
              return (
                <li
                  key={s.id}
                  className={cn(
                    'flex items-center gap-2 rounded-control px-2 py-1.5 text-sm',
                    current && 'bg-primary-soft font-semibold text-primary',
                    done && 'text-ink',
                    !done && !current && 'text-ink-muted',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                      done && 'bg-success text-white',
                      current && 'bg-primary text-primary-foreground',
                      !done && !current && 'bg-surface-muted text-ink-muted',
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : i + 1}
                  </span>
                  <span className="leading-tight">{s.label}</span>
                </li>
              );
            })}
          </ol>
        </SectionCard>
      </aside>
      <div className="min-w-0">{question}</div>
      <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
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
      icon={<AlertCircle className="h-10 w-10" strokeWidth={1.75} />}
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
    <Badge tone="warning" className="min-h-[28px] px-3 text-xs font-semibold">
      {label}
    </Badge>
  );
}
