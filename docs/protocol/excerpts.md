# Protocol excerpts (PLACEHOLDER — synthetic demo)

**Not clinical guidance.** Section IDs are cited by the rules engine and AI advisory layer.
All thresholds live in `rules/clinical_config.yaml` and require clinician validation
(`TODO_CLINICAL_REVIEW`).

## DS-01 — Danger signs (urgent referral)

Any confirmed danger sign at community level requires **urgent referral**:

- Convulsions / fits
- Unable to drink or feed
- Vomiting everything
- Lethargy / unconsciousness
- Severe breathing difficulty

Unanswered danger signs must never be treated as “No”.

## YI-01 — Young infant referral

Infants below the configured age cutoff (see `infant_refer_months` in
`rules/clinical_config.yaml`) are referred from community care under common iCCM
practice. Exact cutoff: `TODO_CLINICAL_REVIEW`.

## FE-01 — Persistent fever / RDT-negative follow-up

When fever persists at or beyond the configured day threshold and RDT is negative,
refer for further evaluation (`persistent_fever_days`). Exact day count:
`TODO_CLINICAL_REVIEW`.

## TDR-01 — Invalid rapid diagnostic test

An invalid RDT is an operational referral trigger in this demo (not a severity
grade). Re-test or refer per facility SOP.

## PR-01 — Pre-referral treatment

Pre-referral medicines and doses are **not implemented** in this prototype.
Any dosing requires RBC clinician approval (`TODO_CLINICAL_REVIEW`).

## GEN-01 — Treat locally / monitor

When assessment is complete, no danger sign is present, and no referral rule
fires, the demo default is community follow-up / treat-locally path. This does
**not** prescribe drugs or doses.
