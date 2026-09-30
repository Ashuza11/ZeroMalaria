import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { webHomePath } from '../auth/roleAccess';
import { WebShell } from '../components/shells';
import { useToast } from '../components/ToastProvider';
import { Button, Card, Input, PageHeader } from '../components/ui';

export function ChangePasswordPage() {
  const { t } = useTranslation();
  const { user, refreshMe } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.changePassword(current.trim(), next.trim());
      await refreshMe();
      push(t('common.save'), 'success');
      if (user) navigate(webHomePath(user.role), { replace: true });
    } catch {
      push(t('common.error'), 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <WebShell title={t('auth.changePassword')} crumbs={[t('common.account')]}>
      <div className="flex w-full justify-center px-2 py-6 sm:py-10">
        <div className="w-full max-w-md">
          <PageHeader title={t('auth.changePassword')} subtitle={t('auth.changePasswordHint')} />
          <Card className="p-5 shadow-card">
            <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-ink">{t('auth.currentPassword')}</span>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-ink">{t('auth.newPassword')}</span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  minLength={10}
                  required
                />
              </label>
              <Button type="submit" className="w-full" loading={saving} disabled={saving}>
                {t('common.save')}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </WebShell>
  );
}
