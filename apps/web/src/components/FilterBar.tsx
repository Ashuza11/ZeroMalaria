import { SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Button, Input } from './ui';
import { Modal } from './Modal';

export type FilterField =
  | { key: string; label: string; type: 'text'; placeholder?: string }
  | { key: string; label: string; type: 'select'; options: { value: string; label: string }[] }
  | { key: string; label: string; type: 'date' };

type Props = {
  storageKey: string;
  fields: FilterField[];
  resultCount?: number;
  debounceMs?: number;
  /** Stick under page header inside main scroll. */
  sticky?: boolean;
};

/** URL-synced filter bar with sessionStorage memory and removable chips. */
export function FilterBar({ storageKey, fields, resultCount, debounceMs = 300, sticky }: Props) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [searchDraft, setSearchDraft] = useState(params.get('q') || '');
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw || params.toString()) return;
      const saved = new URLSearchParams(raw);
      if ([...saved.keys()].length) setParams(saved, { replace: true });
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, params.toString());
    } catch {
      /* ignore */
    }
  }, [params, storageKey]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = new URLSearchParams(params);
      if (searchDraft) next.set('q', searchDraft);
      else next.delete('q');
      next.delete('page');
      if (next.get('q') !== params.get('q')) setParams(next, { replace: true });
    }, debounceMs);
    return () => window.clearTimeout(handle);
  }, [searchDraft, debounceMs, params, setParams]);

  const chips = useMemo(() => {
    const out: { key: string; label: string; value: string }[] = [];
    fields.forEach((f) => {
      const v = params.get(f.key);
      if (!v) return;
      const display =
        f.type === 'select' ? f.options.find((o) => o.value === v)?.label || v : v;
      out.push({ key: f.key, label: f.label, value: display });
    });
    return out;
  }, [fields, params]);

  const setField = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next, { replace: true });
  };

  const clearAll = () => {
    setSearchDraft('');
    setParams(new URLSearchParams(), { replace: true });
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  };

  const renderField = (f: FilterField) => {
    if (f.type === 'text') {
      return (
        <label key={f.key} className="flex min-w-0 flex-col gap-1 text-xs font-medium text-ink-muted">
          <span className="leading-4">{f.label}</span>
          <Input
            className="h-10"
            value={f.key === 'q' ? searchDraft : params.get(f.key) || ''}
            placeholder={f.placeholder || t('common.search')}
            onChange={(e) =>
              f.key === 'q' ? setSearchDraft(e.target.value) : setField(f.key, e.target.value)
            }
          />
        </label>
      );
    }
    if (f.type === 'select') {
      return (
        <label key={f.key} className="flex min-w-0 flex-col gap-1 text-xs font-medium text-ink-muted">
          <span className="leading-4">{f.label}</span>
          <select
            className="h-10 w-full rounded-control border border-border bg-surface px-3 text-sm text-ink"
            value={params.get(f.key) || ''}
            onChange={(e) => setField(f.key, e.target.value)}
          >
            <option value="">{t('common.all')}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      );
    }
    return (
      <label key={f.key} className="flex min-w-0 flex-col gap-1 text-xs font-medium text-ink-muted">
        <span className="leading-4">{f.label}</span>
        <Input
          className="h-10"
          type="date"
          value={params.get(f.key) || ''}
          onChange={(e) => setField(f.key, e.target.value)}
        />
      </label>
    );
  };

  const chipRow =
    chips.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            className="inline-flex max-w-full items-center gap-1 rounded-control border border-border bg-surface-muted px-2 py-1 text-xs text-ink"
            onClick={() => setField(c.key, '')}
            title={`${c.label}: ${c.value}`}
          >
            <span className="truncate">
              {c.label}: {c.value}
            </span>
            <X className="h-3 w-3 shrink-0" />
          </button>
        ))}
      </div>
    ) : null;

  return (
    <div
      className={
        sticky
          ? 'sticky top-0 z-[5] mb-4 space-y-3 border-b border-border bg-app/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-app/80'
          : 'mb-4 space-y-3'
      }
      data-testid="filter-bar"
    >
      {/* Desktop grid — labels + 40px controls share one baseline */}
      <div className="hidden gap-3 md:grid md:items-end md:[grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        {fields.map(renderField)}
        <div className="flex min-w-[200px] items-end">
          <Button type="button" variant="outline" size="sm" className="h-10 w-full sm:w-auto" onClick={clearAll}>
            {t('common.clearAll')}
          </Button>
        </div>
      </div>

      {/* Mobile: chips + Filters button */}
      <div className="flex flex-wrap items-center gap-2 md:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<SlidersHorizontal className="h-4 w-4" />}
          onClick={() => setSheetOpen(true)}
        >
          {t('common.filters')}
          {chips.length ? ` (${chips.length})` : ''}
        </Button>
        {chipRow}
      </div>
      <div className="hidden md:block">{chipRow}</div>

      {typeof resultCount === 'number' ? (
        <p className="text-xs text-ink-muted">{t('common.resultCount', { count: resultCount })}</p>
      ) : null}

      <Modal
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t('common.filters')}
        size="md"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={clearAll}>
              {t('common.clearAll')}
            </Button>
            <Button type="button" onClick={() => setSheetOpen(false)}>
              {t('common.confirm')}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">{fields.map(renderField)}</div>
      </Modal>
    </div>
  );
}
