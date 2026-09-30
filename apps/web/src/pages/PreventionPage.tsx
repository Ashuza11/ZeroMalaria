import { Shield, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChwShell } from '../components/shells';
import { Badge, Button, Card } from '../components/ui';
import { getPhrase, PREVENTION_PHRASE_IDS, type PhraseId, type VoiceLang } from '../voice/phrases';
import { speakSequence, unlockAudio } from '../voice/speak';

export function PreventionPage() {
  const { t, i18n } = useTranslation();
  const lang: VoiceLang = i18n.language.startsWith('rw') ? 'rw' : 'en';
  const [highlightId, setHighlightId] = useState<PhraseId | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const items = [
    { id: 'prevention_nets' as const, icon: '🛏️' },
    { id: 'prevention_exposure' as const, icon: '🦟' },
    { id: 'prevention_early_test' as const, icon: '🧪' },
    { id: 'prevention_early_care' as const, icon: '🏥' },
  ];

  const listenAll = async () => {
    unlockAudio();
    setSpeaking(true);
    try {
      await speakSequence(PREVENTION_PHRASE_IDS, lang, (id) => setHighlightId(id));
    } finally {
      setSpeaking(false);
    }
  };

  return (
    <ChwShell title={t('prevention.title')}>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge tone="accent">{t('prevention.catalogBadge')}</Badge>
            <h2 className="mt-2 text-lg font-semibold">{t('prevention.heading')}</h2>
            <p className="mt-1 text-sm text-ink-muted">{t('prevention.intro')}</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            loading={speaking}
            leftIcon={<Volume2 className="h-4 w-4" />}
            onClick={() => void listenAll()}
          >
            {t('prevention.listenAll')}
          </Button>
        </div>

        <svg viewBox="0 0 320 80" className="mt-4 w-full text-primary" aria-hidden>
          <rect x="8" y="40" width="304" height="8" rx="4" fill="currentColor" opacity="0.15" />
          <circle cx="48" cy="44" r="10" fill="currentColor" opacity="0.35" />
          <circle cx="120" cy="44" r="10" fill="currentColor" opacity="0.5" />
          <circle cx="192" cy="44" r="10" fill="currentColor" opacity="0.65" />
          <circle cx="264" cy="44" r="10" fill="currentColor" />
          <text x="16" y="28" className="fill-current text-[10px] font-semibold opacity-70">
            {t('prevention.communityTitle')}
          </text>
        </svg>

        <ul className="mt-4 space-y-3">
          {items.map(({ id, icon }) => (
            <li
              key={id}
              className={`rounded-control border p-3 transition ${
                highlightId === id ? 'border-primary bg-primary-soft' : 'border-border bg-surface-muted'
              }`}
            >
              <div className="flex gap-3">
                <span className="text-2xl" aria-hidden>
                  {icon}
                </span>
                <div>
                  <p className="text-sm font-semibold">{getPhrase(id, lang)}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-1 h-8 px-2"
                    onClick={() => {
                      unlockAudio();
                      void speakSequence([id], lang, (pid) => setHighlightId(pid));
                    }}
                  >
                    {t('prevention.listenOne')}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-4 flex items-start gap-2 text-xs text-ink-muted">
          <Shield className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          {t('prevention.footer')}
        </p>
      </Card>
    </ChwShell>
  );
}
