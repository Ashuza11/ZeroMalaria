# AI safety (one page) — ZeroMalaria

**Decision support tool. Not a replacement for clinical judgment.**  
**Synthetic demo data only.**

## What the AI may do

- After the **rules engine** produces a decision, an online advisory layer may
  explain answers, flag inconsistencies, draft caregiver advice (Kinyarwanda
  marked *needs review*), suggest a handover summary, and cite protocol section IDs
  from `docs/protocol/excerpts.md`.
- The AI may only **escalate urgency** relative to the rules result
  (e.g. monitor → urgent referral suggestion). Code enforces this; prompts alone
  are not trusted.

## What the AI must never do

- Decide the clinical outcome. Rules remain authoritative offline and online.
- Downgrade or override a rules decision (treat_locally stays at least that urgent).
- Prescribe medicines, doses, or invent clinical thresholds.
- Run when offline / timed out / invalid JSON: the CHW sees the **rules result alone**,
  with no error banner.

## Human in the loop

- The UI shows the **rules decision first**, then a clearly labelled
  **AI suggestion** card (Kinyarwanda first).
- The CHW must **confirm or adjust**; follow vs override is logged.
- Handover text may attach an AI summary for the nurse dashboard; overdue-referral
  alerts still key off referral status and timestamps.

## Offline fallback

- Triage, rules, and pre-recorded Kinyarwanda audio packs work without network.
- Browser TTS is not used for Kinyarwanda (no reliable `rw` voice).
- Missing audio files fall back to silent text highlight.

## Limits

- Placeholders pending clinician review (`TODO_CLINICAL_REVIEW` in
  `rules/clinical_config.yaml`).
- Kinyarwanda AI text is draft until native review.
- Not for real-patient care, outbreak claims, or dosing.
