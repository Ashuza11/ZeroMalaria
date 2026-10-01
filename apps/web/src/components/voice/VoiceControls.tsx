import {
  HelpCircle,
  Mic,
  Volume2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, IconButton } from '../ui';
import { cn } from '../../lib/cn';
import { useVoice, type VoiceIntents } from '../../voice/VoiceContext';
import type { PhraseId } from '../../voice/phrases';

export function VoiceControls({
  phraseIds,
  helpPhraseId,
  className,
  showLabels = false,
  compact = false,
  onTranscriptConfirmed,
  language,
  allowMic = true,
}: {
  phraseIds: PhraseId[];
  helpPhraseId?: PhraseId;
  className?: string;
  showLabels?: boolean;
  compact?: boolean;
  onTranscriptConfirmed?: (payload: { transcript: string; intents: VoiceIntents }) => void;
  /** Pindo voice input is available only for Kinyarwanda. */
  language?: 'rw' | 'en';
  allowMic?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const voice = useVoice();
  const { capabilities, unlocked, state } = voice;
  const lang = language || (i18n.language.startsWith('rw') ? 'rw' : 'en');

  const onListen = () => {
    voice.unlock();
    void voice.play(phraseIds);
  };

  const onHelp = () => {
    if (!helpPhraseId) return;
    voice.unlock();
    void voice.play([helpPhraseId]);
  };

  const onMic = () => {
    void voice.listen();
  };

  if (!unlocked) {
    // Inline only — never cover the triage question/choices with a full-screen overlay.
    return (
      <div className={cn('space-y-2', className)}>
        <button
          type="button"
          className="w-full rounded-control border border-border bg-surface-muted px-4 py-3 text-left text-sm font-semibold text-ink"
          onClick={() => voice.unlock()}
        >
          {t('voice.unlockTap')}
        </button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className={cn('flex items-center gap-3', compact && 'gap-2')}>
        <Button
          className="min-h-14 flex-1 text-base"
          size="lg"
          leftIcon={<Volume2 className="h-5 w-5" aria-hidden />}
          onClick={onListen}
          disabled={state === 'speaking'}
        >
          {t('voice.listen')}
        </Button>
        {allowMic && capabilities.sttPindo && lang === 'rw' ? (
          <Button
            className="min-h-14 flex-1 text-base"
            size="lg"
            variant="secondary"
            leftIcon={<Mic className="h-5 w-5" aria-hidden />}
            onClick={onMic}
            disabled={state === 'listening'}
          >
            {state === 'listening' ? t('voice.convListening') : t('voice.mic')}
          </Button>
        ) : null}
        {helpPhraseId ? (
          <IconButton label={t('voice.help')} showLabel={showLabels} onClick={onHelp}>
            <HelpCircle className="h-5 w-5" aria-hidden />
          </IconButton>
        ) : null}
      </div>
      {voice.pendingTranscript && voice.state === 'confirming' ? (
        <div className="rounded-control border border-border bg-surface-muted p-3 text-sm">
          <p className="font-semibold">{t('voice.heard')}</p>
          <p className="mt-1">{voice.pendingTranscript}</p>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                const heard = voice.confirmHeard();
                if (heard) onTranscriptConfirmed?.(heard);
              }}
            >
              {t('voice.confirmHeard')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => voice.cancelHeard()}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      ) : null}
      {voice.recordingError ? (
        <p className="rounded-control border border-danger/30 bg-danger-soft p-3 text-sm font-medium text-danger" role="alert">
          {t('voice.recordError')}
        </p>
      ) : null}
    </div>
  );
}
