# Current status

- TypeScript-only React PWA and Cloudflare Worker runtime.
- Deterministic offline RBC triage rules.
- Local D1 migrations and demo seed accounts.
- Pindo Kinyarwanda TTS/STT proxy with transcript confirmation.
- Offline referral queue and idempotent synchronization.
- Health-center received/arrived/treated status flow.
- Generated nurse handoff template; external AI provider intentionally deferred.
- RBC referral funnel, overdue alerts and stock pressure endpoints.
- Local CHW → referral → facility arrival parity test passed.

Remaining before a real pilot:

- Native-speaker review of Kinyarwanda clinical wording.
- RBC clinician validation and sign-off of every rule and threshold.
- Privacy/DPIA, retention, incident-response and production identity decisions.
- Create the remote D1 database and configure Worker secrets.
- Add the selected handoff AI provider behind the existing Worker endpoint.
