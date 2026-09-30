import { Mic, MicOff, Square, Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useConversation, type ConversationMachineState } from '../../voice/ConversationContext';
import { useVoice, useVoicePhraseText } from '../../voice/VoiceContext';
import { Button, IconButton } from '../ui';

function stateLabel(state: ConversationMachineState, t: (k: string) => string): string {
  const map: Record<ConversationMachineState, string> = {
    idle: t('voice.convIdle'),
    greeting: t('voice.convGreeting'),
    asking: t('voice.convAsking'),
    listening: t('voice.convListening'),
    confirming: t('voice.convConfirming'),
    responding: t('voice.convResponding'),
  };
  return map[state];
}

export function ConversationBar({
  onStart,
  startLabel,
}: {
  onStart?: () => void;
  startLabel?: string;
}) {
  const { t } = useTranslation();
  const voice = useVoice();
  const conv = useConversation();
  const phraseText = useVoicePhraseText(voice.highlightId || 'guided_greeting');

  const showBar = conv.active || conv.convState !== 'idle';
  const orbActive = conv.convState === 'listening' || voice.state === 'listening';

  if (!showBar && !onStart) return null;

  return (
    <div
      className="relative z-10 mt-4 rounded-[20px] border border-border bg-surface px-3 py-3 shadow-card"
      role="region"
      aria-label={t('voice.guidedTriage')}
    >
      {!showBar && onStart ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">{t('voice.guidedTriageHint')}</p>
          <Button size="sm" leftIcon={<Mic className="h-4 w-4" />} onClick={onStart}>
            {startLabel || t('voice.startGuidedTriage')}
          </Button>
        </div>
      ) : null}

      {showBar ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span
              className={`mt-0.5 inline-flex h-3 w-3 shrink-0 rounded-full ${orbActive ? 'animate-pulse bg-primary' : 'bg-ink-muted/40'}`}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {stateLabel(conv.convState, t)}
              </p>
              <p className="truncate text-sm text-ink">{conv.caption || phraseText}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {conv.convState === 'confirming' && voice.pendingTranscript ? (
              <>
                <Button size="sm" onClick={() => conv.confirmAndAdvance()}>
                  {t('voice.confirmHeard')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => conv.cancelListen()}>
                  {t('common.cancel')}
                </Button>
              </>
            ) : null}
            <IconButton label={t('voice.slower')} onClick={() => voice.setSlower()}>
              <Volume2 className="h-4 w-4" />
            </IconButton>
            <IconButton
              label={voice.mute ? t('voice.unmute') : t('voice.mute')}
              onClick={() => voice.toggleMute()}
            >
              {voice.mute ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </IconButton>
            <IconButton label={t('voice.stop')} onClick={() => conv.stopConversation()}>
              <Square className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
