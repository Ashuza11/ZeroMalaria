import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { getPhrase, type PhraseId, type VoiceLang } from './phrases';
import {
  getLanguageCapabilities,
  getSpeed,
  isAudioUnlocked,
  isMuted,
  setMuted,
  setSpeed,
  speakSequence,
  stopSpeaking,
  unlockAudio,
  type PlaybackSource,
  type VoiceSpeed,
} from './speak';
import { parseVoiceIntents, type VoiceIntents } from './intents';

export type VoiceMachineState = 'idle' | 'speaking' | 'listening' | 'transcribing' | 'confirming';

export type { VoiceIntents };
export { parseVoiceIntents };

type ListenResult = { transcript: string; intents: VoiceIntents };

type VoiceContextValue = {
  state: VoiceMachineState;
  unlocked: boolean;
  mute: boolean;
  speed: VoiceSpeed;
  highlightId: PhraseId | null;
  playbackSource: PlaybackSource | null;
  pendingTranscript: string | null;
  pendingIntents: VoiceIntents | null;
  recordingError: boolean;
  unlock: () => void;
  play: (ids: PhraseId[]) => Promise<void>;
  stop: () => void;
  replay: () => Promise<void>;
  setSlower: () => void;
  setMute: (mute: boolean) => void;
  toggleMute: () => void;
  listen: () => Promise<ListenResult | null>;
  stopListening: () => void;
  confirmHeard: () => ListenResult | null;
  cancelHeard: () => void;
  capabilities: ReturnType<typeof getLanguageCapabilities>;
};

const VoiceContext = createContext<VoiceContextValue | null>(null);

function voiceLangFromI18n(code: string): VoiceLang {
  return code.startsWith('rw') ? 'rw' : 'en';
}

async function recordAnswer(
  maxDurationMs = 12000,
  onStopReady?: (stop: () => void) => void,
): Promise<{ blob: Blob; filename: string }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
  const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];
  try {
    return await new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, maxDurationMs);
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error('Audio recording failed'));
      };
      recorder.onstop = () => {
        window.clearTimeout(timer);
        const type = recorder.mimeType || 'audio/webm';
        const extension = type.includes('ogg') ? 'ogg' : 'webm';
        resolve({ blob: new Blob(chunks, { type }), filename: `triage-answer.${extension}` });
      };
      onStopReady?.(() => {
        if (recorder.state === 'recording') recorder.stop();
      });
      recorder.start(250);
    });
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

export function VoiceProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const lang = voiceLangFromI18n(i18n.language);

  const [state, setState] = useState<VoiceMachineState>('idle');
  const [unlocked, setUnlocked] = useState(() => isAudioUnlocked());
  const [mute, setMuteState] = useState(() => isMuted());
  const [speed, setSpeedState] = useState<VoiceSpeed>(() => getSpeed());
  const [highlightId, setHighlightId] = useState<PhraseId | null>(null);
  const [playbackSource, setPlaybackSource] = useState<PlaybackSource | null>(null);
  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);
  const [pendingIntents, setPendingIntents] = useState<VoiceIntents | null>(null);
  const [recordingError, setRecordingError] = useState(false);
  const [caps, setCaps] = useState(() => getLanguageCapabilities(lang));

  const lastIds = useRef<PhraseId[]>([]);
  const listenResolve = useRef<((value: ListenResult | null) => void) | null>(null);
  const stopRecording = useRef<(() => void) | null>(null);

  useEffect(() => {
    setCaps(getLanguageCapabilities(lang));
  }, [lang]);

  const unlock = useCallback(() => {
    unlockAudio();
    setUnlocked(true);
  }, []);

  const stop = useCallback(() => {
    stopSpeaking();
    setState('idle');
    setHighlightId(null);
  }, []);

  const play = useCallback(
    async (ids: PhraseId[]) => {
      if (!ids.length) return;
      lastIds.current = ids;
      stopSpeaking();
      setPlaybackSource(null);
      setState('speaking');
      try {
        await speakSequence(
          ids,
          lang,
          (id) => setHighlightId(id),
          (_id, source) => setPlaybackSource(source),
        );
      } finally {
        setState((s) => (s === 'speaking' ? 'idle' : s));
      }
    },
    [lang],
  );

  const replay = useCallback(async () => {
    if (lastIds.current.length) await play(lastIds.current);
  }, [play]);

  const setSlower = useCallback(() => {
    const prev = getSpeed();
    const next: VoiceSpeed = prev === 1.2 ? 1 : prev === 1 ? 0.8 : 0.8;
    setSpeed(next);
    setSpeedState(next);
    void play(['slower_hint', ...lastIds.current]);
  }, [play]);

  const setMute = useCallback((m: boolean) => {
    setMuted(m);
    setMuteState(m);
  }, []);

  const toggleMute = useCallback(() => {
    const next = !isMuted();
    setMuted(next);
    setMuteState(next);
  }, []);

  const listen = useCallback((): Promise<ListenResult | null> => {
    if (!caps.sttPindo || lang !== 'rw' || !navigator.onLine) return Promise.resolve(null);

    unlock();
    stopSpeaking();
    setRecordingError(false);

    return new Promise((resolve) => {
      listenResolve.current = resolve;
      setState('listening');
      void recordAnswer(12000, (stopRecorder) => {
        stopRecording.current = stopRecorder;
      })
        .then(({ blob, filename }) => {
          stopRecording.current = null;
          setState('transcribing');
          return api.voiceTranscribe(blob, filename);
        })
        .then((response) => {
          const transcript = response.transcript.trim();
          const intents = parseVoiceIntents(transcript, lang);
          setPendingTranscript(transcript);
          setPendingIntents(intents);
          setState('confirming');
          resolve({ transcript, intents });
          listenResolve.current = null;
        })
        .catch(() => {
          stopRecording.current = null;
          setState('idle');
          setRecordingError(true);
          resolve(null);
          listenResolve.current = null;
        });
    });
  }, [caps.sttPindo, lang, unlock]);

  const stopListening = useCallback(() => {
    stopRecording.current?.();
  }, []);

  const confirmHeard = useCallback((): ListenResult | null => {
    if (!pendingTranscript) return null;
    const out = { transcript: pendingTranscript, intents: pendingIntents || {} };
    setPendingTranscript(null);
    setPendingIntents(null);
    setRecordingError(false);
    setState('idle');
    return out;
  }, [pendingIntents, pendingTranscript]);

  const cancelHeard = useCallback(() => {
    setPendingTranscript(null);
    setPendingIntents(null);
    setState('idle');
  }, []);

  const value = useMemo(
    (): VoiceContextValue => ({
      state,
      unlocked,
      mute,
      speed,
      highlightId,
      playbackSource,
      pendingTranscript,
      pendingIntents,
      recordingError,
      unlock,
      play,
      stop,
      replay,
      setSlower,
      setMute,
      toggleMute,
      listen,
      stopListening,
      confirmHeard,
      cancelHeard,
      capabilities: caps,
    }),
    [
      state,
      unlocked,
      mute,
      speed,
      highlightId,
      playbackSource,
      pendingTranscript,
      pendingIntents,
      recordingError,
      unlock,
      play,
      stop,
      replay,
      setSlower,
      setMute,
      toggleMute,
      listen,
      stopListening,
      confirmHeard,
      cancelHeard,
      caps,
    ],
  );

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice(): VoiceContextValue {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error('useVoice must be used within VoiceProvider');
  return ctx;
}

export function useVoicePhraseText(id: PhraseId): string {
  const { i18n } = useTranslation();
  const lang = voiceLangFromI18n(i18n.language);
  return getPhrase(id, lang);
}
