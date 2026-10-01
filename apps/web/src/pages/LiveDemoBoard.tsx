import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clapperboard, MonitorSmartphone } from 'lucide-react';
import { api } from '../api/client';
import { WebShell } from '../components/shells';
import { Button, Card, PageHeader } from '../components/ui';
import { useToast } from '../components/ToastProvider';

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

export function LiveDemoBoard() {
  const { t } = useTranslation();
  const { push } = useToast();
  const [running, setRunning] = useState(false);

  const runLoop = useCallback(async () => {
    if (running) return;
    setRunning(true);
    try {
      const client_uuid = `demo-live-${Date.now()}`;
      const created = await api.createReferral({
        client_uuid,
        facility_id: 'HC-BUG-01',
        chw_id: 'CHW-BUG-01-01',
        district: 'Bugesera',
        sector: 'Nyamata',
        age_months: 22,
        sex: 'female',
        decision: 'urgent_refer',
        reasons: ['Convulsions (demo)'],
        summary: t('liveDemo.scriptSummary'),
      });
      const id = (created as { id: string }).id;
      push(t('liveDemo.stepCreated'), 'warning');
      await sleep(2500);
      await api.patchStatus(id, 'received');
      push(t('liveDemo.stepReceived'), 'info');
      await sleep(2500);
      await api.patchStatus(id, 'arrived');
      push(t('liveDemo.stepArrived'), 'success');
    } catch {
      push(t('common.error'), 'danger');
    } finally {
      setRunning(false);
    }
  }, [push, running, t]);

  const frames = [
    { title: t('liveDemo.chwColumn'), src: '/m/home', hint: t('liveDemo.chwHint') },
    { title: t('liveDemo.nurseColumn'), src: '/app/referrals', hint: t('liveDemo.nurseHint') },
    { title: t('liveDemo.rbcColumn'), src: '/app/dashboard', hint: t('liveDemo.rbcHint') },
  ];

  return (
    <WebShell title={t('liveDemo.title')} crumbs={['ZeroMalaria', t('liveDemo.title')]}>
      <PageHeader
        title={t('liveDemo.title')}
        subtitle={t('liveDemo.subtitle')}
        actions={
          <Button onClick={() => void runLoop()} disabled={running}>
            <Clapperboard className="mr-2 h-4 w-4" />
            {running ? t('liveDemo.running') : t('liveDemo.runLoop')}
          </Button>
        }
      />
      <Card className="mb-4 border-primary/20 bg-primary-soft/20 p-4 text-sm text-ink">
        {t('liveDemo.disclaimer')}
      </Card>
      <div className="grid gap-4 xl:grid-cols-3">
        {frames.map((f) => (
          <Card key={f.src} className="overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <MonitorSmartphone className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="text-xs text-ink-muted">{f.hint}</p>
              </div>
            </div>
            <div className="relative mx-auto max-w-[380px] bg-surface-muted p-3">
              <div className="overflow-hidden rounded-[1.25rem] border-4 border-ink/80 shadow-lift">
                <iframe title={f.title} src={f.src} className="h-[520px] w-full bg-white" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </WebShell>
  );
}
