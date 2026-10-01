# Voice setup — Vuga na Zero

**Decision support tool.** Result audio uses only rules-engine output + fixed catalog text — never LLM free text.

## Playback chain (Kinyarwanda only)

1. The Worker `POST /api/voice/speak` calls Pindo VoiceAI TTS in public or authenticated mode.
2. Pre-recorded `/public/audio/rw/<phrase_id>.mp3` is the offline fallback.
3. Silent fallback keeps the phrase highlighted on screen.

Browser `speechSynthesis` has been removed. English voice output is disabled because Pindo TTS currently supports Kinyarwanda only.

## Voice answers (Kinyarwanda only)

1. The browser records one short answer with `MediaRecorder`.
2. The Worker `POST /api/voice/transcribe` forwards it to Pindo VoiceAI STT.
3. The recognized text and parsed answer are shown to the CHW.
4. Nothing is entered into triage until the CHW confirms the transcript.

Voice answers require internet access. Touch input and the deterministic RBC rules continue to work offline.

## Pindo access modes

Public mode is enabled by default for development. It calls the free, per-IP rate-limited `/ai/tts/rw/public` and `/ai/stt/rw/public` endpoints and sends no token:

```dotenv
# Leave PINDO_API_TOKEN unset.
```

For authenticated production access:

1. Sign in or register at <https://app.pindo.io/login>.
2. Open your profile icon, then **Security**.
3. Copy the API token into `apps/worker/.dev.vars` for local development:

```dotenv
PINDO_API_TOKEN=your-real-token
```

The token is read only by the Cloudflare Worker and automatically selects authenticated mode. For deployment, store it with `wrangler secret put PINDO_API_TOKEN`. Never create a `VITE_PINDO_*` variable.

The existing reviewed audio files under `apps/web/public/audio` are the offline fallback. New fallback recordings should be reviewed by a native Kinyarwanda speaker before field use.

## Native review

Presenter menu (demo) or `/app/settings/voice-review`: play each phrase, mark Reviewed (stored in `localStorage`). In production mode, unreviewed urgent/result audio should not be used; demo mode allows unreviewed with a badge.

## Capability check

Settings → Voice reports Pindo TTS/STT availability. English is text-only and has no voice input.

## Env

| Variable | Purpose |
| --- | --- |
| `PINDO_ACCESS_MODE` | `public` for free rate-limited access or `authenticated` for account billing |
| `PINDO_API_TOKEN` | Pindo bearer token; server-side only |
| `PINDO_API_BASE_URL` | Defaults to `https://api.pindo.io` |
| `VITE_DEMO_MODE` | Unlock overlay + demo presenter tools |
