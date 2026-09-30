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

function estimateSilentMs(text: string, speed: VoiceSpeed): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  const base = Math.max(1200, words * 380);
  return Math.round(base / speed);
}

async function tryMp3(id: PhraseId, lang: VoiceLang, speed: VoiceSpeed): Promise<boolean> {
  const url = `/audio/${lang}/${id}.mp3`;
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.playbackRate = speed;
    currentAudio = audio;
    audio.onended = () => resolve(true);
    audio.onerror = () => resolve(false);
    void audio.play().catch(() => resolve(false));
  });
}

async function tryCloudTts(id: PhraseId, lang: VoiceLang, text: string): Promise<string | null> {
  try {
    const res = await api.voiceSpeak({ phrase_id: id, language: lang, text });
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
    audio.onended = () => resolve(true);
    audio.onerror = () => resolve(false);
    void audio.play().catch(() => resolve(false));
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

async function silentHighlight(text: string, speed: VoiceSpeed): Promise<void> {
  await new Promise((r) => setTimeout(r, estimateSilentMs(text, speed)));
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
    await silentHighlight(text, speed);
    return { source: 'text' };
  }

  if (audioUnlocked && (await tryMp3(id, lang, speed))) {
    return { source: 'audio_pack' };
  }

  const cloudUrl = await tryCloudTts(id, lang, text);
  if (cloudUrl && audioUnlocked && (await tryCloudMp3(cloudUrl, speed))) {
    return { source: 'cloud' };
  }

  if (await trySpeechSynthesis(text, lang, speed)) {
    return { source: 'browser' };
  }

  await silentHighlight(text, speed);
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
