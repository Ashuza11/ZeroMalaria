# ZeroMalaria - Progress

**Decision support tool. Not a replacement for clinical judgment.**  
**Synthetic demo data** only.

## Current sprint: AI visibility + consult (2026-09-30)

**Branch:** `test-merge-ardent` (do not touch `main`).

### Done

1. **AI insights on Result** — risk gauge, top-3 SHAP factors, provenance chips, provider/latency/fallback; Rules only / Rules+AI toggle; ML escalation banner; offline message; visit summary via `/ai/visit-summary` (attached to handover).
2. **Ask about this case** — chips + free text + mic; `POST /ai/ask` on sanitized snapshot; protocol-only answers; out-of-scope → nurse.
3. **AI consult** — three agents (Triage/Guideline/Referral), max 2 rounds / 6 turns / timeouts; final answer first; expandable transcript; follow-up round; escalate-only + dose/injection rejection; activity logging without free text.
4. **AI activity page** (`/app/ai-activity`) for RBC/supervisor roles — aggregate counts only.
5. **Seeded demo** — `/m/triage?demo=ml` → rules `treat_at_home`, synthetic ML score 0.42 escalates to `refer` (threshold unchanged at 0.35).
6. **UI** — full ZeroMalaria logo text; voice aria-labels (Read aloud / Record / Repeat / Slow / Pause / Volume) in rw/en/fr; French locale pack + language picker.

### Gates (this sprint)

| Check | Result |
| --- | --- |
| pytest | **101 passed** |
| npm run build | **OK** |
| npm run lint | **OK** (2 warnings) |
| npm run i18n:check | **OK** (725 keys) |

### Known limits

- Live Gemini/Groq still fall back to local without keys (empty in `.env.example`).
- RW AI strings marked needs native review / draft in `_review.json`.
- ML escalate demo uses `demo_scenario=ml_escalate` synthetic score (architecture demo); real model scores are often below threshold on uncomplicated cases.
- French UI falls back to English for namespaces not fully translated beyond the en→fr clone + AI overlays.
- Pre-recorded RW MP3 pack still missing (text fallback).
