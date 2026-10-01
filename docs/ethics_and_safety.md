# Ethics and safety — ZeroMalaria

**Decision support tool. Not a replacement for clinical judgment.**  
**Synthetic demo data** in this repository is not a basis for clinical or epidemiological claims.

## Privacy
- No real patient data in the prototype.
- Identifiers are pseudonymous (`CASE-…`, `CHW-…`).
- Minimal fields: age in months, sex, clinical signs, facility — no name, phone, national ID, or address.
- Offline storage stays on the device until an explicit sync to the facility/API.

## Bias
- Synthetic class balance and district weights are assumptions. They can encode bias if treated as truth.
- Models trained on synthetic labels (especially `severe_case` derived from the same features) can look artificially strong. Metrics in `ml/metrics.json` are architecture demos only.
- Language: Kinyarwanda is default; all `rw` strings require native-speaker review (`TODO_REVIEW_RW`).
- Before any pilot: stratify error rates by age, district, and sex on validated data; review false negatives on danger signs as a patient-safety metric.

## Clinical governance
- All clinical content lives in `rules/malaria_rules.yaml`.
- Banner in that file: PLACEHOLDER — TO BE VALIDATED against the Rwanda national malaria treatment guidelines and WHO iCCM guidance by a clinician.
- No invented temperature/Hb/dose thresholds. No dosing calculator.
- Deterministic RBC rules are the only source of the triage decision; voice and AI never decide.
- CHW confirmation is mandatory for every recommendation.

## Human in the loop
- The app recommends; the CHW confirms.
- The nurse updates referral status.
- RBC views aggregates; it does not remotely override a CHW encounter.

## Decision and handoff boundary
- **Rules:** `apps/web/src/rules`; urgent referral is deterministic and tested in Vitest.
- **Voice:** Pindo handles Kinyarwanda speech only; the CHW confirms transcripts.
- **Handoff:** the Worker sends only structured clinical fields and the locked rules result to any future AI provider.
- **Secrets:** provider credentials remain in Worker secrets and never enter the PWA bundle.
- **Hotspots / analytics:** language is *potential increase (statistical signal)*; not outbreak confirmation.

## Data governance under RBC
- Institutional owner: Rwanda Biomedical Centre.
- Future real data flows (cEMR, HMIS/DHIS2, eLMIS) require RBC-approved DPIA, access control, retention, and audit logs.
- Sync payloads should remain minimal and purpose-limited to triage and referral closure.
- Hackathon prototype uses JWT demo accounts; a pilot must use RBC SSO, audit logs, and DPIA before production data.

## Validation plan
1. Clinician review and sign-off of `malaria_rules.yaml`.
2. Concordance study: CHW + tool vs supervisor assessment on vignettes, then supervised live cases.
3. Process metrics: % encounters with complete danger-sign checklist; % referrals received; % arrived; time to arrival; alert response.
4. Monitor handoff quality only after rules validation; never allow AI to alter urgency.
5. Recalibrate synthetic generator weights using DHIS2/HMIS, MIS/DHS, Malaria Atlas Project, and eLMIS before public incidence claims.
6. Accessibility check on low-end Android with Kinyarwanda speakers.
