import { api } from '../api/client';
import { getPhrase, type PhraseId, type VoiceLang } from './phrases';

const MUTE_KEY = 'zm_voice_mute';
const SPEED_KEY = 'zm_voice_speed';

export type VoiceSpeed = 0.8 | 1 | 1.2;
export type PlaybackSource = 'pindo' | 'audio-pack' | 'text';

let audioUnlocked = false;
let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
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

function resumeAudioContext(): void {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return;
  audioContext ||= new window.AudioContext();
  if (audioContext.state === 'suspended') void audioContext.resume();
}

/** Call on first user gesture so mobile browsers allow playback. */
export function unlockAudio(): void {
  audioUnlocked = true;
  resumeAudioContext();
  if (gestureHookInstalled || typeof window === 'undefined') return;
  gestureHookInstalled = true;
  const unlock = () => {
    audioUnlocked = true;
    resumeAudioContext();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

export function stopSpeaking(): void {
  sequenceToken += 1;
  if (currentSource) {
    try {
      currentSource.stop();
    } catch {
      /* already stopped */
    }
    currentSource = null;
  }
}

function pindoSttAvailable(): boolean {
  return Boolean(
    typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function' &&
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
    audioPack: lang === 'rw',
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
): Promise<ArrayBuffer | null> {
  if (lang !== 'rw') return null;
  try {
    return await withTimeout(
      api.voiceSpeakAudio({ phrase_id: id, language: lang, text, speech_rate: speed }),
      CLOUD_TTS_MS,
      null,
    );
  } catch {
    return null;
  }
}

async function tryPindoAudio(bytes: ArrayBuffer, speed: VoiceSpeed): Promise<boolean> {
  const context = audioContext;
  if (!context) return false;
  try {
    if (context.state === 'suspended') await context.resume();
    const buffer = await context.decodeAudioData(bytes.slice(0));
    return await new Promise((resolve) => {
      const source = context.createBufferSource();
      currentSource = source;
      source.buffer = buffer;
      source.playbackRate.value = speed;
      source.connect(context.destination);
      const timeout = window.setTimeout(() => {
        if (currentSource === source) currentSource = null;
        resolve(false);
      }, Math.max(12_000, buffer.duration * 2000));
      source.onended = () => {
        window.clearTimeout(timeout);
        if (currentSource === source) currentSource = null;
        resolve(true);
      };
      source.start();
    });
  } catch {
    return false;
  }
}

async function tryBundledPindoAudio(id: PhraseId, speed: VoiceSpeed): Promise<boolean> {
  try {
    const response = await fetch(`/audio/rw/${encodeURIComponent(id)}.mp3`, { cache: 'force-cache' });
    if (!response.ok) return false;
    return tryPindoAudio(await response.arrayBuffer(), speed);
  } catch {
    return false;
  }
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

  const pindoAudio = await tryPindoTts(id, lang, text, speed);
  if (pindoAudio && audioUnlocked && (await tryPindoAudio(pindoAudio, speed))) {
    return { source: 'pindo' };
  }

  // Previously generated Pindo audio; never browser speech synthesis.
  if (audioUnlocked && (await tryBundledPindoAudio(id, speed))) {
    return { source: 'audio-pack' };
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
