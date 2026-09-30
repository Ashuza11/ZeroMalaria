import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WebShell } from '../components/shells';
import { Badge, Button, Card, PageHeader } from '../components/ui';
import { PHRASES, getPhrase, type PhraseId, type VoiceLang } from '../voice/phrases';
import { useVoice } from '../voice/VoiceContext';
import { loadReviewedMap, saveReviewedMap } from './VoiceSettingsPage';

export function VoiceReviewPage() {
  const { t, i18n } = useTranslation();
  const voice = useVoice();
  const lang: VoiceLang = i18n.language.startsWith('rw') ? 'rw' : 'en';
  const ids = useMemo(() => Object.keys(PHRASES) as PhraseId[], []);
  const [reviewed, setReviewed] = useState(() => loadReviewedMap());

  const toggle = (id: PhraseId) => {
    setReviewed((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveReviewedMap(next);
      return next;
    });
  };

  return (
    <WebShell title={t('voiceReview.title')} crumbs={[t('nav.settings'), t('voiceReview.title')]}>
      <PageHeader title={t('voiceReview.title')} subtitle={t('voiceReview.subtitle')} />
      <ul className="space-y-2">
        {ids.map((id) => (
          <li key={id}>
            <Card className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs text-ink-muted">{id}</p>
                <p className="mt-1 text-sm">{getPhrase(id, lang)}</p>
                {reviewed[id] ? (
                  <Badge tone="success" className="mt-2">
                    {t('voiceReview.reviewed')}
                  </Badge>
                ) : (
                  <Badge tone="warning" className="mt-2">
                    {t('voiceReview.pending')}
                  </Badge>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button size="sm" variant="secondary" onClick={() => void voice.play([id])}>
                  {t('voiceReview.play')}
                </Button>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={Boolean(reviewed[id])}
                    onChange={() => toggle(id)}
                  />
                  {t('voiceReview.markReviewed')}
                </label>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </WebShell>
  );
}
