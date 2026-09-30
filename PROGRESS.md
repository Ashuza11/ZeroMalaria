# ZeroMalaria — Progress

**Decision support tool. Not a replacement for clinical judgment.**  
**Synthetic demo data** only.

## Design + voice polish (Steps 1–7)

| Step | Status | Notes |
| --- | --- | --- |
| 1 Design system + templates | **Done** | `PageHeader`, `SectionCard`, `TwoPanelLayout`, `StepperLayout`, `ErrorState`, `SyntheticBadge`; labeled header IconButtons; full role names |
| 2 Layouts by device | **Done** | Desktop `/app/*` WebShell; CHW `/app/chw` + `/app/triage` StepperLayout; `/m/*` mobile shell |
| 3 Triage redesign | **Done** | Age +/- + chips + years toggle; temp 0.1; danger cards; Listen/Mic/Help; live summary |
| 4 Voice engine | **Done** | `VoiceProvider` state machine; audio_pack→cloud→browser(lang-match)→text; settings honest per language; Voice review; Mock audio pack scripts |
| 5 Dashboard coherence | **Done** | RBC `PageHeader` + SyntheticBadge; Facility inbox `PageHeader`; shared tokens |
| 6 Security hygiene | **Done** | Startup refuse demo JWT/password when `ZM_DEMO_MODE=false`; `.env` gitignored |
| 7 Verification | **Done** | pytest 29; vitest 19; build/lint/i18n:check pass |

### Observed problems fixed

1. **Voice unwired / mute / false Available** — VoiceControls on triage; unmute default; RW never uses EN TTS; capability check per language.
2. **Bare triage column** — Desktop StepperLayout (stepper | question | help+summary).
3. **Header icons / RBC·CHW badge** — Labeled IconButtons; “Malaria triage” under logo; readable Synthetic badge; full role names.
4. **Incoherent screens** — Shared layout templates on login shells, CHW, nurse, RBC.

## How to test

```powershell
.\scripts\demo.ps1
# Voice pack (optional Mock manifests):
cd apps\web; node scripts/export_phrases_json.mjs; python scripts/generate_audio_pack.py
```

| Check | Expect |
| --- | --- |
| `pytest apps/api/tests -q` | 29 passed |
| `npm run i18n:check` | OK |
| `npm test` | 19 passed |
| `npm run build && npm run lint` | Pass |
| CHW desktop triage | `/app/triage` — Listen autoplays after tap-to-enable |
| CHW → `/app/dashboard` | Not authorized / 403 analytics |
| Voice settings (rw) | Not “Available” for browser TTS without rw voice |

## Mocked / notes

- Audio pack generator writes **manifests** (Mock); real MP3s need native recording or licensed TTS (see [docs/voice_setup.md](docs/voice_setup.md)).
- Cloud TTS/STT Mock without keys.
- Playwright screenshot sweep: run `npm run screenshots` with API+web up for final visual QA.
- 117 RW keys still listed in `needs_review.rw.json` for native speaker pass.

## Medical safety (unchanged)

Rules decide urgency; ML escalate-only; LLM/voice language-only; CHW confirms; disclaimer + synthetic badge; no drugs/doses from AI.
