import { Check, Globe2, Languages } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';
import { WebShell } from '../components/shells';
import { Button, Card } from '../components/ui';
import { cn } from '../lib/cn';

export function AppLanguagePage() {
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState<'rw' | 'en'>(i18n.language.startsWith('rw') ? 'rw' : 'en');

  return (
    <WebShell title={t('lang.title')} crumbs={[t('nav.settingsGroup'), t('nav.language')]}>
      <div className="flex w-full justify-center py-4">
      <div className="w-full max-w-lg space-y-3">
        {(
          [
            { id: 'rw' as const, label: t('lang.kinyarwanda'), Icon: Languages },
            { id: 'en' as const, label: t('lang.english'), Icon: Globe2 },
          ]
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelected(opt.id)}
            className={cn(
              'flex w-full items-center gap-3 rounded-card border px-4 py-5 text-left transition',
              selected === opt.id
                ? 'border-primary bg-primary-soft shadow-card'
                : 'border-border bg-surface hover:bg-surface-muted',
            )}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-control bg-surface text-primary">
              <opt.Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="flex-1 text-lg font-semibold text-ink">{opt.label}</span>
            {selected === opt.id ? <Check className="h-5 w-5 text-primary" strokeWidth={1.75} /> : null}
          </button>
        ))}
        <Button className="w-full" size="lg" onClick={() => setLanguage(selected)}>
          {t('common.continue')}
        </Button>
        <Card>
          <p className="text-sm text-ink-muted">{t('lang.subtitle')}</p>
        </Card>
      </div>
      </div>
    </WebShell>
  );
}
