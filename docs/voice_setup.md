# Voice setup — Vuga na Zero

**Decision support tool.** Result audio uses only rules-engine output + fixed catalog text — never LLM free text.

## Playback chain (per phrase + language)

1. Pre-recorded `/public/audio/{rw|en}/<phrase_id>.mp3` (offline, SW-cacheable)
2. Backend `POST /voice/speak` (cloud TTS if configured; Mock otherwise)
3. Browser `speechSynthesis` **only** if `getVoices()` has a matching language (`rw` / `rw-RW` / `kin`, or `en*`)
4. Silent fallback with on-screen highlighted text

Kinyarwanda is **never** spoken with an English voice.

## Generate audio pack (demo / Mock)

```powershell
cd apps\web
node scripts/export_phrases_json.mjs
python scripts/generate_audio_pack.py
```

Writes manifests under `public/audio/{en,rw}/manifest.json`. Placeholder audio is labeled **needs native review**.

Optional future: MMS-TTS kin via Hugging Face (check model license — often non-commercial). Document any commercial restriction before field use.

## Native review

Presenter menu (demo) or `/app/settings/voice-review`: play each phrase, mark Reviewed (stored in `localStorage`). In production mode, unreviewed urgent/result audio should not be used; demo mode allows unreviewed with a badge.

## Capability check

Settings → Voice: reports TTS/STT/audio pack **per language**. “Available” for Kinyarwanda browser TTS only appears when a matching voice exists; otherwise show Audio pack only / Text only.

## Env

| Variable | Purpose |
| --- | --- |
| Cloud TTS keys | Server-side only (`ZM_*`); never `VITE_*` |
| `VITE_DEMO_MODE` | Unlock overlay + demo presenter tools |
