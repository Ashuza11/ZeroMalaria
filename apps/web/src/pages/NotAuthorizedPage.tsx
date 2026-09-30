import { ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { WebShell } from '../components/shells';
import { Button, Card, EmptyState } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { homePath } from '../auth/roleAccess';

export function NotAuthorizedPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const destination = user ? homePath(user.role) : '/login';
  return (
    <WebShell title={t('auth.notAuthorizedTitle')} crumbs={[t('auth.notAuthorizedTitle')]}>
      <Card>
        <EmptyState
          icon={<ShieldAlert className="h-10 w-10" strokeWidth={1.75} />}
          title={t('auth.notAuthorizedTitle')}
          description={t('auth.notAuthorizedBody')}
          action={
            <Button variant="secondary" onClick={() => navigate(destination)}>
              {t('nav.dashboard')}
            </Button>
          }
        />
      </Card>
    </WebShell>
  );
}
