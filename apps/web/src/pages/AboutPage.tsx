import { useTranslation } from 'react-i18next';
import { WebShell } from '../components/shells';
import { Badge, Card, Disclaimer } from '../components/ui';
import { MALARIA_RULES } from '../rules/malariaRules.generated';

export function AboutPage() {
  const { t } = useTranslation();
  const meta = MALARIA_RULES.meta;
  return (
    <WebShell title={t('about.title')} crumbs={[t('nav.settings'), t('about.title')]}>
      <Card className="mb-4 border-warning/40 bg-warning-soft/30">
        <Badge tone="warning" className="mb-2">
          {t('about.guidelineVersion', { version: meta.version })}
        </Badge>
        <p className="text-sm font-medium text-ink">{meta.validation_banner}</p>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">{t('about.appTitle')}</h2>
        <p className="mt-2 text-sm text-ink-muted">{t('about.body')}</p>
        <div className="mt-4">
          <Disclaimer text={meta.disclaimer || t('common.disclaimer')} />
        </div>
        <p className="mt-3 text-xs text-ink-muted">{t('common.synthetic')}</p>
      </Card>
    </WebShell>
  );
}
