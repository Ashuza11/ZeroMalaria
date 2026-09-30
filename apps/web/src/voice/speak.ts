import { api } from '../api/client';
import { getPhrase, type PhraseId, type VoiceLang } from './phrases';

const MUTE_KEY = 'zm_voice_mute';
const SPEED_KEY = 'zm_voice_speed';

export type VoiceSpeed = 0.8 | 1 | 1.2;
export type PlaybackSource = 'audio_pack' | 'cloud' | 'browser' | 'text';

let audioUnlocked = false;
let currentAudio: HTMLAudioElement | null = null;
let sequenceToken = 0;
let gestureHookInstalled = false;
const audioPackCache: Partial<Record<VoiceLang, boolean>> = {};
const missingAudioLogged = new Set<string>();

/** Fail-fast probe for missing pack files (never hang the UI). */
const MP3_PROBE_MS = 400;
const CLOUD_TTS_MS = 2000;
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
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function speechLang(lang: VoiceLang): string {
  return lang === 'rw' ? 'rw-RW' : 'en-US';
}

function voiceLangMatches(voiceLang: string, target: VoiceLang): boolean {
  const v = voiceLang.toLowerCase();
  if (target === 'rw') {
    return v.startsWith('rw') || v.includes('kin');
  }
  return v.startsWith('en');
}

export function browserTtsMatchesLang(lang: VoiceLang): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return lang === 'en';
  return voices.some((voice) => voiceLangMatches(voice.lang, lang));
}

function pickVoice(lang: VoiceLang): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !window.speechSynthesis) return undefined;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => voiceLangMatches(v.lang, lang));
}

function sttBrowserAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function getLanguageCapabilities(lang: VoiceLang): {
  ttsBrowser: boolean;
  sttBrowser: boolean;
  audioPack: boolean;
  cloudReachable: boolean;
} {
  const cachedPack = audioPackCache[lang];
  return {
    ttsBrowser: browserTtsMatchesLang(lang),
    sttBrowser: sttBrowserAvailable(),
    audioPack: cachedPack ?? false,
    cloudReachable: typeof navigator !== 'undefined' ? navigator.onLine : false,
  };
}

/** @deprecated use getLanguageCapabilities */
export function getVoiceCapabilities(): {
  speechSynthesis: boolean;
  speechRecognition: boolean;
  speechSynthesisLangEn: boolean;
  speechSynthesisLangRw: boolean;
} {
  return {
    speechSynthesis: typeof window !== 'undefined' && 'speechSynthesis' in window,
    speechRecognition: sttBrowserAvailable(),
    speechSynthesisLangEn: browserTtsMatchesLang('en'),
    speechSynthesisLangRw: browserTtsMatchesLang('rw'),
  };
}

function warnMissingAudio(lang: VoiceLang, id: string) {
  const key = `${lang}/${id}`;
  if (missingAudioLogged.has(key)) return;
  missingAudioLogged.add(key);
  if (import.meta.env.DEV) {
    console.warn(`[voice] Missing pre-recorded audio: /audio/${lang}/${id}.mp3 (falling back to text)`);
  }
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

async function probeMp3Exists(url: string): Promise<boolean> {
  if (typeof fetch === 'undefined') return true;
  try {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), MP3_PROBE_MS);
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal, cache: 'force-cache' });
    window.clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

async function tryMp3(id: PhraseId, lang: VoiceLang, speed: VoiceSpeed): Promise<boolean> {
  const url = `/audio/${lang}/${id}.mp3`;
  // Play directly — do not await a HEAD probe on the UI path (HEAD can hang or 405).
  // Optional short existence cache warm-up runs in the background only.
  void withTimeout(probeMp3Exists(url), MP3_PROBE_MS, false).then((exists) => {
    if (exists) audioPackCache[lang] = true;
  });
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.playbackRate = speed;
    currentAudio = audio;
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(failTimer);
      if (!ok) warnMissingAudio(lang, id);
      resolve(ok);
    };
    const failTimer = window.setTimeout(() => finish(false), 8000);
    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);
    void audio.play().then(
      () => {
        /* playing — resolve onended */
      },
      () => finish(false),
    );
  });
}

async function tryCloudTts(id: PhraseId, lang: VoiceLang, text: string): Promise<string | null> {
  try {
    const res = await withTimeout(
      api.voiceSpeak({ phrase_id: id, language: lang, text }),
      CLOUD_TTS_MS,
      { audio_url: null } as Record<string, unknown>,
    );
    const url = typeof res.audio_url === 'string' ? res.audio_url : null;
    return url;
  } catch {
    return null;
  }
}

async function tryCloudMp3(url: string, speed: VoiceSpeed): Promise<boolean> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.playbackRate = speed;
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

function trySpeechSynthesis(text: string, lang: VoiceLang, speed: VoiceSpeed): Promise<boolean> {
  return new Promise((resolve) => {
    if (!browserTtsMatchesLang(lang)) {
      resolve(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = speechLang(lang);
    utter.rate = speed;
    const voice = pickVoice(lang);
    if (voice) utter.voice = voice;
    utter.onend = () => resolve(true);
    utter.onerror = () => resolve(false);
    window.speechSynthesis.speak(utter);
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

  // Prefer pre-recorded pack (required for Kinyarwanda - browsers lack rw TTS voices).
  if (audioUnlocked && (await tryMp3(id, lang, speed))) {
    audioPackCache[lang] = true;
    return { source: 'audio_pack' };
  }

  // Cloud TTS optional when online (hard timeout — never block triage UX).
  if (typeof navigator === 'undefined' || navigator.onLine) {
    const cloudUrl = await tryCloudTts(id, lang, text);
    if (cloudUrl && audioUnlocked && (await tryCloudMp3(cloudUrl, speed))) {
      return { source: 'cloud' };
    }
  }

  // Never use English browser TTS for Kinyarwanda. Short text fallback only.
  if (lang !== 'rw' && (await trySpeechSynthesis(text, lang, speed))) {
    return { source: 'browser' };
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

export async function probePreRecordedAudio(
  lang: VoiceLang = 'en',
  sampleId: PhraseId | string = 'disclaimer',
): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch(`/audio/${lang}/${sampleId}.mp3`, { method: 'HEAD' });
    const ok = res.ok;
    audioPackCache[lang] = ok;
    return ok;
  } catch {
    audioPackCache[lang] = false;
    return false;
  }
}

export async function probeCloudReachable(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  try {
    await api.health();
    return true;
  } catch {
    return false;
  }
}
