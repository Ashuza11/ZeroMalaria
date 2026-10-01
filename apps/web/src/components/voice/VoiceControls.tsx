import {
  HelpCircle,
  Mic,
  Square,
  Volume2,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
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
    if (state === 'listening') {
      voice.stopListening();
      return;
    }
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
            leftIcon={state === 'listening' ? <Square className="h-5 w-5" aria-hidden /> : <Mic className="h-5 w-5" aria-hidden />}
            onClick={onMic}
            disabled={state === 'transcribing'}
          >
            {state === 'listening'
              ? t('voice.stopRecording')
              : state === 'transcribing'
                ? t('voice.transcribing')
                : t('voice.mic')}
          </Button>
        ) : null}
        {helpPhraseId ? (
          <IconButton label={t('voice.help')} showLabel={showLabels} onClick={onHelp}>
            <HelpCircle className="h-5 w-5" aria-hidden />
          </IconButton>
        ) : null}
      </div>
      {allowMic && (state === 'listening' || state === 'transcribing') ? (
        <VoiceActivity state={state} />
      ) : null}
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
      {lang === 'rw' && !voice.mute && voice.playbackSource === 'text' && state === 'idle' ? (
        <p className="rounded-control border border-warning/30 bg-warning-soft p-3 text-sm font-medium text-warning" role="status">
          {t('voice.ttsUnavailable')}
        </p>
      ) : null}
    </div>
  );
}

function VoiceActivity({ state }: { state: 'listening' | 'transcribing' }) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const listening = state === 'listening';
  const label = listening
    ? t('voice.convListening')
      : t('voice.transcribing');

  return (
    <div
      className={cn(
        'flex min-h-20 items-center gap-4 rounded-card border-2 px-4 py-3',
        listening ? 'border-success/40 bg-success-soft' : 'border-warning/40 bg-warning-soft',
      )}
      role="status"
      aria-live="polite"
    >
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
        {listening && !reduce ? (
          <motion.span
            className="absolute inset-0 rounded-full bg-success/25"
            animate={{ scale: [0.8, 1.35], opacity: [0.8, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
          />
        ) : null}
        <span className={cn('relative flex h-11 w-11 items-center justify-center rounded-full text-white', listening ? 'bg-success' : 'bg-warning')}>
          <Mic className="h-5 w-5" aria-hidden />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{label}</p>
        <div className="mt-2 flex h-5 items-center gap-1" aria-hidden>
          {[0, 1, 2, 3, 4].map((index) => (
            <motion.span
              key={index}
              className={cn('w-1.5 rounded-full', listening ? 'bg-success' : 'bg-warning')}
              animate={reduce ? { height: 8 } : { height: [6, 18 - Math.abs(2 - index) * 2, 6] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: index * 0.1, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
