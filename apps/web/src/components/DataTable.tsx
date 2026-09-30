import { MoreHorizontal } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/cn';
import { Button, Card, EmptyState, Skeleton } from './ui';
import { ErrorState } from './ui/layout';

export type DataColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Prefer showing on mobile cards */
  primary?: boolean;
  className?: string;
  truncate?: boolean;
};

export type RowAction = {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
  danger?: boolean;
  hidden?: boolean;
};

type Props<T> = {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  onClearFilters?: () => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onRowClick?: (row: T) => void;
  actionsForRow?: (row: T) => RowAction[];
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  bulkBar?: ReactNode;
  testId?: string;
};

function ActionsMenu({ actions }: { actions: RowAction[] }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const visible = actions.filter((a) => !a.hidden);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!visible.length) return null;

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label={t('common.actions')}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 min-w-[11rem] rounded-control border border-border bg-surface py-1 shadow-lift">
          {visible.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={a.disabled}
              title={a.disabled ? a.disabledReason : a.label}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-muted disabled:opacity-40',
                a.danger && 'text-danger',
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (a.disabled) return;
                setOpen(false);
                a.onClick();
              }}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DesktopActions({ actions }: { actions: RowAction[] }) {
  const visible = actions.filter((a) => !a.hidden);
  if (!visible.length) return null;
  return (
    <div className="hidden items-center justify-end gap-1 lg:flex">
      {visible.map((a) => (
        <button
          key={a.id}
          type="button"
          aria-label={a.label}
          title={a.disabled ? a.disabledReason || a.label : a.label}
          disabled={a.disabled}
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-control border border-border bg-surface text-ink hover:bg-surface-muted disabled:opacity-40',
            a.danger && 'text-danger hover:bg-danger-soft',
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (!a.disabled) a.onClick();
          }}
        >
          {a.icon}
        </button>
      ))}
    </div>
  );
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  emptyTitle,
  onClearFilters,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
  actionsForRow,
  page = 1,
  pageSize = 20,
  total = 0,
  onPageChange,
  onPageSizeChange,
  bulkBar,
  testId = 'data-table',
}: Props<T>) {
  const { t } = useTranslation();
  const selectable = Boolean(onToggleSelect);
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds?.has(rowKey(r)));

  if (loading) return <Skeleton className="h-64" />;
  if (error) {
    return (
      <ErrorState
        title={t('common.error')}
        onRetry={onRetry}
        retryLabel={t('common.retry')}
      />
    );
  }
  if (!rows.length) {
    return (
      <EmptyState
        title={emptyTitle || t('common.noResults')}
        action={
          onClearFilters ? (
            <Button variant="secondary" onClick={onClearFilters}>
              {t('common.clearFilters')}
            </Button>
          ) : undefined
        }
      />
    );
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div data-testid={testId} className="space-y-3">
      {bulkBar && selectedIds && selectedIds.size > 0 ? bulkBar : null}

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => {
          const id = rowKey(row);
          const actions = actionsForRow?.(row) || [];
          return (
            <Card
              key={id}
              className="p-3"
              hover
            >
              <div
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onRowClick?.(row);
                }}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  {selectable ? (
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={selectedIds?.has(id) || false}
                      onChange={() => onToggleSelect?.(id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={t('common.selected')}
                    />
                  ) : (
                    <span />
                  )}
                  <div className="lg:hidden">
                    <ActionsMenu actions={actions} />
                  </div>
                </div>
                <dl className="space-y-1.5 text-sm">
                  {columns.map((col) => (
                    <div key={col.id} className="flex justify-between gap-3">
                      <dt className="shrink-0 text-ink-muted">{col.header}</dt>
                      <dd
                        className={cn('min-w-0 text-right font-medium', col.truncate && 'truncate')}
                        title={col.truncate ? String(col.cell(row)) : undefined}
                      >
                        {col.cell(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Desktop / tablet table */}
      <Card className="hidden overflow-hidden p-0 md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-surface-muted text-xs uppercase text-ink-muted">
              <tr>
                {selectable ? (
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => onToggleSelectAll?.()}
                      aria-label={t('common.selected')}
                    />
                  </th>
                ) : null}
                {columns.map((col) => (
                  <th key={col.id} className={cn('px-4 py-3', col.className)}>
                    {col.header}
                  </th>
                ))}
                {actionsForRow ? (
                  <th className="sticky right-0 z-20 bg-surface-muted px-3 py-3 text-right shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.12)]">
                    {t('common.actions')}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const id = rowKey(row);
                const actions = actionsForRow?.(row) || [];
                return (
                  <tr
                    key={id}
                    className="border-b border-border/60 hover:bg-surface-muted/50"
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable ? (
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds?.has(id) || false}
                          onChange={() => onToggleSelect?.(id)}
                        />
                      </td>
                    ) : null}
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        className={cn('px-4 py-3', col.truncate && 'max-w-[12rem] truncate', col.className)}
                        title={col.truncate ? String(col.cell(row)) : undefined}
                      >
                        {col.cell(row)}
                      </td>
                    ))}
                    {actionsForRow ? (
                      <td
                        className="sticky right-0 z-10 bg-surface px-3 py-3 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.12)]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DesktopActions actions={actions} />
                        <div className="flex justify-end lg:hidden">
                          <ActionsMenu actions={actions} />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {onPageChange ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
            <p className="text-ink-muted">{t('common.resultCount', { count: total })}</p>
            <div className="flex flex-wrap items-center gap-2">
              {onPageSizeChange ? (
                <label className="flex items-center gap-2 text-ink-muted">
                  <span>{t('common.pageSize')}</span>
                  <select
                    className="h-10 rounded-control border border-border bg-surface px-2"
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  >
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                {t('common.back')}
              </Button>
              <span className="text-ink-muted">
                {page} / {pages}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page >= pages}
                onClick={() => onPageChange(page + 1)}
              >
                {t('common.continue')}
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
