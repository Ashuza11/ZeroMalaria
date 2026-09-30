# ZeroMalaria - Progress

**Decision support tool. Not a replacement for clinical judgment.**  
**Synthetic demo data** only.

## Current sprint: RBC hackathon AI triage (2026-09-30) - DONE

**Branch:** `test-merge-ardent` (do not touch `main`).

### Delivered

1. **Kinyarwanda audio** - Pre-recorded `/audio/rw/<id>.mp3` preferred; browser TTS skipped for `rw`; silent text fallback + DEV missing-file warnings; PWA CacheFirst + mp3 glob; `audio:manifest` / `audio:check` (+ repo-root wrappers). RW mic labelled experimental.
2. **Rules** - Thresholds in `rules/clinical_config.yaml` with protocol citations / `TODO_CLINICAL_REVIEW`; danger → urgent; unanswered ≠ No; public decisions `treat_locally|monitor|urgent_referral`; reason_details + missing_info; 30+ coverage tests.
3. **AI advisory** - `POST /ai/advisory` after rules; strict JSON; escalate-only code guardrail; Result UI rules-first + AI suggestion card (RW first, needs review) + CHW follow/override audit; handover attaches AI summary; overdue alerts keep `id`/`summary`.
4. **Eval / safety** - `apps/api/tests/eval_cases.json` (40) + `eval_rules_agreement.py`; `docs/ai_safety.md` + `docs/protocol/excerpts.md`.

### Measured eval

| Metric | Value |
| --- | --- |
| Agreement | **40/40 (100.0%)** |
| Mean triage duration_ms | **147175.0** (from vignette timestamps) |

### Gates

| Check | Result |
| --- | --- |
| pytest | **93 passed** |
| npm run build | **OK** |
| npm run lint | **OK** (2 existing warnings) |
| npm run i18n:check | **OK** (666 keys) |
| audio:check | **0/53 mp3 present** (native recording pending) |

### Assumptions

- No live Gemini/Groq calls without keys; local provider supplies advisory JSON.
- Pre-recorded RW audio files not yet recorded (checklist generated).
- Clinical cut-offs remain PLACEHOLDER pending clinician review.
