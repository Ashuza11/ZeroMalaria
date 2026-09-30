import { AlertTriangle, Plus, Stethoscope, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { WebShell } from '../components/shells';
import { Badge, Button, Card } from '../components/ui';

/** Desktop CHW workspace — web shell with reduced menu (not a phone frame). */
export function ChwWebHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <WebShell title={t('nav.home')} crumbs={[t('common.appName'), t('auth.roleChw')]}>
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-ink">
              {t('home.greeting')}
              {user?.display_name ? `, ${user.display_name}` : ''}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {user?.village || t('home.village')} · {user?.district || ''}
            </p>
          </div>
          <Badge tone="warning">{t('common.synthetic')}</Badge>
        </div>

        <Card className="mb-6 border-primary/20 bg-primary-soft/40 p-6">
          <p className="text-sm font-semibold text-primary">{t('home.newPatient')}</p>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">{t('home.subtitle')}</p>
          <Button className="mt-4" size="lg" leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/app/triage')}>
            {t('nav.newTriage')}
          </Button>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <Users className="h-5 w-5 text-accent" strokeWidth={1.75} />
            <h3 className="mt-3 font-semibold">{t('nav.myPatients')}</h3>
            <Button variant="outline" className="mt-3" size="sm" onClick={() => navigate('/app/my-patients')}>
              {t('common.continue')}
            </Button>
          </Card>
          <Card className="p-4">
            <Stethoscope className="h-5 w-5 text-accent" strokeWidth={1.75} />
            <h3 className="mt-3 font-semibold">{t('nav.myReferrals')}</h3>
            <Button variant="outline" className="mt-3" size="sm" onClick={() => navigate('/app/my-referrals')}>
              {t('common.continue')}
            </Button>
          </Card>
          <Card className="p-4">
            <AlertTriangle className="h-5 w-5 text-warning" strokeWidth={1.75} />
            <h3 className="mt-3 font-semibold">{t('nav.alerts')}</h3>
            <Button variant="outline" className="mt-3" size="sm" onClick={() => navigate('/app/alerts')}>
              {t('common.continue')}
            </Button>
          </Card>
        </div>

        <p className="mt-8 text-xs text-ink-muted">
          {t('login.mobileLandingHint')}{' '}
          <button type="button" className="font-semibold text-primary underline" onClick={() => navigate('/m')}>
            /m
          </button>
        </p>
      </div>
    </WebShell>
  );
}
