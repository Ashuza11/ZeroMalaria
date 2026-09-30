import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { WebShell } from '../components/shells';
import { Card } from '../components/ui';
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

export function TranslationReviewPage() {
  const { t } = useTranslation();
  const rows = useMemo(() => {
    const meta = reviewMeta as Record<string, { status: string }>;
    return Object.entries(meta)
      .filter(([, v]) => v.status === 'draft')
      .map(([key]) => ({
        key,
        en: getByPath(enResources as Record<string, unknown>, key),
        rw: getByPath(rwResources as Record<string, unknown>, key),
      }));
  }, []);

  return (
    <WebShell title={t('presenter.translationReview')} crumbs={[t('nav.settings'), t('presenter.translationReview')]}>
      <p className="mb-4 text-sm text-ink-muted">{t('common.synthetic')}</p>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-surface-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">{t('presenter.colKey')}</th>
                <th className="px-4 py-3 font-semibold">{t('presenter.colEn')}</th>
                <th className="px-4 py-3 font-semibold">{t('presenter.colRw')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-border/60 align-top last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">{row.key}</td>
                  <td className="px-4 py-3">{row.en || '—'}</td>
                  <td className="px-4 py-3">{row.rw || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </WebShell>
  );
}
