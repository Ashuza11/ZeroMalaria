import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import reviewMeta from '../locales/rw/_review.json';
import { enResources, rwResources } from '../i18n/loadLocales';

function getByPath(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return '';
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' ? cur : '';
}

/** Dev-only list of draft translation keys. Never linked from production nav. */
export function DevTranslationsPage() {
  const { t } = useTranslation();
  const [draftOnly, setDraftOnly] = useState(true);

  const rows = useMemo(() => {
    const meta = reviewMeta as Record<string, { status: string }>;
    return Object.entries(meta)
      .filter(([, v]) => (draftOnly ? v.status === 'draft' : true))
      .map(([key, v]) => ({
        key,
        status: v.status,
        en: getByPath(enResources as Record<string, unknown>, key),
        rw: getByPath(rwResources as Record<string, unknown>, key),
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [draftOnly]);

  if (!import.meta.env.DEV) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <p className="text-sm text-ink-muted">{t('common.empty')}</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">
          {t('auth.homeLink')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold text-ink">{t('presenter.translationReview')}</h1>
      <p className="mt-1 text-sm text-ink-muted">{t('presenter.devOnlyHint')}</p>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={draftOnly} onChange={(e) => setDraftOnly(e.target.checked)} />
        {t('presenter.draftOnly')}
      </label>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-surface-muted">
            <tr>
              <th className="px-3 py-2 font-semibold">{t('presenter.colKey')}</th>
              <th className="px-3 py-2 font-semibold">{t('presenter.colStatus')}</th>
              <th className="px-3 py-2 font-semibold">{t('presenter.colEn')}</th>
              <th className="px-3 py-2 font-semibold">{t('presenter.colRw')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border/60 align-top last:border-0">
                <td className="px-3 py-2 font-mono text-xs text-ink-muted">{row.key}</td>
                <td className="px-3 py-2">
                  {row.status === 'draft' ? t('presenter.statusDraft') : t('presenter.statusReviewed')}
                </td>
                <td className="px-3 py-2">{row.en || '—'}</td>
                <td className="px-3 py-2">{row.rw || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-ink-muted">
        {rows.length} · {t('common.synthetic')}
      </p>
    </div>
  );
}
