import { Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { WebShell } from '../components/shells';
import { Card, EmptyState } from '../components/ui';

export function SuppliesPage() {
  const { t } = useTranslation();
  return (
    <WebShell title={t('nav.supplies')} crumbs={[t('nav.supplies')]}>
      <Card>
        <EmptyState
          icon={<Package className="h-8 w-8" strokeWidth={1.75} />}
          title={t('supplies.placeholderTitle')}
          description={t('supplies.placeholderBody')}
        />
      </Card>
    </WebShell>
  );
}
