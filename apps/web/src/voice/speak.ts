import { api } from '../api/client';
import { getPhrase, type PhraseId, type VoiceLang } from './phrases';

const MUTE_KEY = 'zm_voice_mute';
const SPEED_KEY = 'zm_voice_speed';

export type VoiceSpeed = 0.8 | 1 | 1.2;
export type PlaybackSource = 'pindo' | 'text';

let audioUnlocked = false;
let currentAudio: HTMLAudioElement | null = null;
let sequenceToken = 0;
let gestureHookInstalled = false;
const CLOUD_TTS_MS = 12000;
/** Silent text highlight must not feel like a stalled step. */
const SILENT_FALLBACK_MS = 80;

function readMute(): boolean {
  return localStorage.getItem(MUTE_KEY) === '1';
}

function readSpeed(): VoiceSpeed {
  const v = Number(localStorage.getItem(SPEED_KEY));
  if (v === 0.8 || v === 1 || v === 1.2) return v;
  return 1;
}

export function isMuted(): boolean {
  return readMute();
}

export function setMuted(mute: boolean): void {
  localStorage.setItem(MUTE_KEY, mute ? '1' : '0');
}

export function getSpeed(): VoiceSpeed {
  return readSpeed();
}

export function setSpeed(speed: VoiceSpeed): void {
  localStorage.setItem(SPEED_KEY, String(speed));
}

export function isAudioUnlocked(): boolean {
  return audioUnlocked;
}

/** Call on first user gesture so mobile browsers allow playback. */
export function unlockAudio(): void {
  audioUnlocked = true;
  if (gestureHookInstalled || typeof window === 'undefined') return;
  gestureHookInstalled = true;
  const unlock = () => {
    audioUnlocked = true;
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

export function stopSpeaking(): void {
  sequenceToken += 1;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

function pindoSttAvailable(): boolean {
  return Boolean(
    typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined',
  );
}

export function getLanguageCapabilities(lang: VoiceLang): {
  ttsPindo: boolean;
  sttPindo: boolean;
  audioPack: boolean;
} {
  return {
    ttsPindo: lang === 'rw' && (typeof navigator === 'undefined' || navigator.onLine),
    sttPindo:
      lang === 'rw' &&
      (typeof navigator === 'undefined' || navigator.onLine) &&
      pindoSttAvailable(),
    audioPack: false,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const t = window.setTimeout(() => resolve(fallback), ms);
    promise
      .then((v) => {
        window.clearTimeout(t);
        resolve(v);
      })
      .catch(() => {
        window.clearTimeout(t);
        resolve(fallback);
      });
  });
}


async function tryPindoTts(
  id: PhraseId,
  lang: VoiceLang,
  text: string,
  speed: VoiceSpeed,
): Promise<string | null> {
  if (lang !== 'rw') return null;
  try {
    const res = await withTimeout(
      api.voiceSpeak({ phrase_id: id, language: lang, text, speech_rate: speed }),
      CLOUD_TTS_MS,
      { audio_url: null } as Record<string, unknown>,
    );
    const url = typeof res.audio_url === 'string' ? res.audio_url : null;
    return url;
  } catch {
    return null;
  }
}

async function tryPindoAudio(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    currentAudio = audio;
    const t = window.setTimeout(() => resolve(false), 8000);
    audio.onended = () => {
      window.clearTimeout(t);
      resolve(true);
    };
    audio.onerror = () => {
      window.clearTimeout(t);
      resolve(false);
    };
    void audio.play().catch(() => {
      window.clearTimeout(t);
      resolve(false);
    });
  });
}

async function silentHighlight(): Promise<void> {
  await new Promise((r) => setTimeout(r, SILENT_FALLBACK_MS));
}

export async function speakPhrase(
  id: PhraseId,
  lang: VoiceLang,
  onHighlight?: (id: PhraseId) => void,
): Promise<{ source: PlaybackSource }> {
  unlockAudio();
  const speed = readSpeed();
  const text = getPhrase(id, lang);
  onHighlight?.(id);

  if (readMute()) {
    await silentHighlight();
    return { source: 'text' };
  }

  // Pindo TTS currently supports Kinyarwanda only. English remains text-only.
  if (lang !== 'rw') {
    await silentHighlight();
    return { source: 'text' };
  }

  const pindoUrl = await tryPindoTts(id, lang, text, speed);
  if (pindoUrl && audioUnlocked && (await tryPindoAudio(pindoUrl))) {
    return { source: 'pindo' };
  }

  await silentHighlight();
  return { source: 'text' };
}

export async function speakSequence(
  ids: PhraseId[],
  lang: VoiceLang,
  onHighlight?: (id: PhraseId) => void,
  onSource?: (id: PhraseId, source: PlaybackSource) => void,
): Promise<void> {
  const token = ++sequenceToken;
  for (const id of ids) {
    if (token !== sequenceToken) break;
    const { source } = await speakPhrase(id, lang, onHighlight);
    onSource?.(id, source);
  }
}

export async function probeCloudReachable(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  try {
    const status = await api.voiceStatus();
    return status.provider === 'pindo' && status.configured && status.supported_languages.includes('rw');
  } catch {
    return false;
  }
}
