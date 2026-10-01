import type { Env } from './types';

export function pindoAccessMode(env: Env): 'public' | 'authenticated' {
  const hasToken = Boolean(env.PINDO_API_TOKEN && env.PINDO_API_TOKEN !== 'your-token');
  return env.PINDO_ACCESS_MODE || (hasToken ? 'authenticated' : 'public');
}

function configuration(env: Env, service: 'tts' | 'stt') {
  const base = (env.PINDO_API_BASE_URL || 'https://api.pindo.io').replace(/\/$/, '');
  const authenticated = pindoAccessMode(env) === 'authenticated';
  if (authenticated && (!env.PINDO_API_TOKEN || env.PINDO_API_TOKEN === 'your-token')) {
    throw new Error('Pindo is not configured');
  }
  const headers: Record<string, string> = {};
  if (authenticated) headers.Authorization = `Bearer ${env.PINDO_API_TOKEN}`;
  return {
    endpoint: `${base}/ai/${service}/rw${authenticated ? '' : '/public'}`,
    base,
    headers,
    authenticated,
  };
}

export async function speakWithPindo(env: Env, text: string, speechRate: number): Promise<string> {
  const { endpoint, base, headers, authenticated } = configuration(env, 'tts');
  const request = (url: string, requestHeaders: Record<string, string>) => fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...requestHeaders },
    body: JSON.stringify({ text, lang: 'rw', speech_rate: speechRate }),
  });
  let response = await request(endpoint, headers);
  if (authenticated && response.status === 409) {
    const error = (await response.clone().json().catch(() => null)) as
      | { error?: { details?: string; message?: string } }
      | null;
    const detail = `${error?.error?.details || ''} ${error?.error?.message || ''}`.toLowerCase();
    if (detail.includes('insufficient balance')) {
      response = await request(`${base}/ai/tts/rw/public`, {});
    }
  }
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as
      | { error?: { details?: string; message?: string } }
      | null;
    const detail = error?.error?.details || error?.error?.message;
    throw new Error(`Pindo TTS failed (${response.status}${detail ? `: ${detail}` : ''})`);
  }
  const payload = (await response.json()) as { data?: { generated_audio_url?: string } };
  const path = payload.data?.generated_audio_url;
  if (!path) throw new Error('Pindo returned no audio URL');
  return new URL(path, `${base}/`).toString();
}

export async function transcribeWithPindo(env: Env, audio: File): Promise<string> {
  const { endpoint, headers } = configuration(env, 'stt');
  const form = new FormData();
  form.append('audio', audio, audio.name || 'triage-answer.webm');
  const response = await fetch(endpoint, { method: 'POST', headers, body: form });
  if (!response.ok) throw new Error(`Pindo STT failed (${response.status})`);
  const payload = (await response.json()) as { data?: { text?: string } };
  const transcript = payload.data?.text?.trim();
  if (!transcript) throw new Error('Pindo returned no transcript');
  return transcript;
}
