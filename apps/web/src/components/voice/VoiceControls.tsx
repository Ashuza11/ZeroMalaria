import {
  HelpCircle,
  Mic,
  Pause,
  RotateCcw,
  Snail,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, IconButton } from '../ui';
import { cn } from '../../lib/cn';
import { useVoice, type VoiceIntents } from '../../voice/VoiceContext';
import type { PhraseId } from '../../voice/phrases';
import type { PlaybackSource } from '../../voice/speak';

function sourceLabel(t: (k: string) => string, source: PlaybackSource | null): string | null {
  if (!source) return null;
  const map: Record<PlaybackSource, string> = {
    audio_pack: t('voice.sourceAudioPack'),
    cloud: t('voice.sourceCloud'),
    browser: t('voice.sourceBrowser'),
    text: t('voice.sourceText'),
  };
  return map[source];
}

export function VoiceControls({
  phraseIds,
  helpPhraseId,
  className,
  showLabels = false,
  compact = false,
  onTranscriptConfirmed,
}: {
  phraseIds: PhraseId[];
  helpPhraseId?: PhraseId;
  className?: string;
  showLabels?: boolean;
  compact?: boolean;
  onTranscriptConfirmed?: (payload: { transcript: string; intents: VoiceIntents }) => void;
}) {
  const { t } = useTranslation();
  const voice = useVoice();
  const { capabilities, playbackSource, unlocked, mute, state } = voice;

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
    return (
      <div className={cn('relative', className)}>
        <button
          type="button"
          className="zm-backdrop fixed inset-0 z-40 flex items-center justify-center bg-white/85 p-6 backdrop-blur-sm dark:bg-black/70"
          onClick={() => voice.unlock()}
        >
          <span className="zm-dialog max-w-sm ring-4 ring-accent/20 shadow-[0_0_60px_-10px_rgba(94,234,212,0.6)] rounded-card border border-border bg-surface px-10 py-8 text-center text-[19px] font-semibold tracking-[-0.02em] shadow-lift">
            {t('voice.unlockTap')}
          </span>
        </button>
      </div>
    );
  }

  const badge = sourceLabel(t, playbackSource);

  return (
    <div className={cn('space-y-2', className)}>
      <div className={cn('flex flex-wrap items-center gap-2', compact && 'gap-1')}>
        <IconButton
          label={t('voice.listen')}
          showLabel={showLabels}
          onClick={onListen}
          disabled={state === 'speaking'}
        >
          <Volume2 className="h-4 w-4" />
          {showLabels ? <span className="text-xs font-semibold">{t('voice.listen')}</span> : null}
        </IconButton>
        {capabilities.sttBrowser ? (
          <IconButton
            label={t('voice.mic')}
            showLabel={showLabels}
            onClick={onMic}
            disabled={state === 'listening'}
          >
            <Mic className="h-4 w-4" />
            {showLabels ? <span className="text-xs font-semibold">{t('voice.mic')}</span> : null}
          </IconButton>
        ) : null}
        {helpPhraseId ? (
          <IconButton label={t('voice.help')} showLabel={showLabels} onClick={onHelp}>
            <HelpCircle className="h-4 w-4" />
            {showLabels ? <span className="text-xs font-semibold">{t('voice.help')}</span> : null}
          </IconButton>
        ) : null}
        <IconButton label={t('voice.replay')} showLabel={showLabels} onClick={() => void voice.replay()}>
          <RotateCcw className="h-4 w-4" />
          {showLabels ? <span className="text-xs font-semibold">{t('voice.replay')}</span> : null}
        </IconButton>
        <IconButton label={t('voice.slower')} showLabel={showLabels} onClick={() => voice.setSlower()}>
          <Snail className="h-4 w-4" />
          {showLabels ? <span className="text-xs font-semibold">{t('voice.slower')}</span> : null}
        </IconButton>
        <IconButton label={t('voice.stop')} showLabel={showLabels} onClick={() => voice.stop()}>
          <Pause className="h-4 w-4" />
          {showLabels ? <span className="text-xs font-semibold">{t('voice.stop')}</span> : null}
        </IconButton>
        <IconButton
          label={mute ? t('voice.unmute') : t('voice.mute')}
          showLabel={showLabels}
          onClick={() => voice.toggleMute()}
        >
          {mute ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {showLabels ? (
            <span className="text-xs font-semibold">{mute ? t('voice.unmute') : t('voice.mute')}</span>
          ) : null}
        </IconButton>
      </div>
      {badge ? (
        <Badge tone="neutral" className="text-[11px]">
          {badge}
        </Badge>
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
    </div>
  );
}
