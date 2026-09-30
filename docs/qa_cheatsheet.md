# Judge Q&A cheat sheet — ZeroMalaria

**Synthetic demo data.** Decision support tool. Not a replacement for clinical judgment.

| Question | Short answer |
| --- | --- |
| **Where is the AI?** | Layer 3 only: optional NLP (`/nlp/extract`, `/ai/extract-symptoms`, `/ai/explain`, `/ai/insights`) to parse free text and draft explanations. Layer 1 rules and Layer 2 ML decide triage; the CHW always confirms on device. Provider chain: Gemini → Groq → Local mock (`ZM_AI_PROVIDER_ORDER`). |
| **What if the AI is wrong?** | AI cannot change the rules outcome: urgent referral is locked. Wrong extractions are corrected on the form before confirm. External calls use `sanitize_for_ai` (allowlisted clinical fields only). Explanations are advisory copy, not orders. |
| **Who creates accounts?** | Demo: seeded users (`seed.py`) and supervisors via **Users** (`POST /users`, JWT). Production: RBC SSO / facility admin — not built in this hackathon beyond role-scoped JWT. |
| **Offline?** | CHW PWA runs the same YAML rules locally (TypeScript), stores in IndexedDB, queues sync. Nurse/RBC views need network for live inbox/dashboard; triage + urgent referral work in airplane mode. |
| **Data from?** | **Synthetic CSVs** in `/data` plus richer seed referrals. Pilot framing: Gisagara / Nyamagabe (*source: RBC problem canvas, to be verified*). UI shows **Synthetic demo data** badge. Hotspot banner says *statistical signal*, never outbreak confirmation. |
| **How do roles talk to each other?** | Live event poll (`/events/poll`) + referral messages. Presenter **Live Demo Board** (`/demo/board`) shows CHW / nurse / RBC side by side. |
| **Is voice a chatbot?** | Guided dialogue graph + fixed catalog for clinical speech. Free chat (online) is explain-only with drug/dose filters; danger signs always need CHW confirm. |

## Extra talking points

- **Roles:** `chw`, `nurse`, `supervisor`, `rbc` — JWT scopes referrals and events.
- **vs RapidSMS / ePOCT+ / drones:** closes village→clinic loop and decision support gaps (canvas).
- **Hotspots:** statistical signal only — verify with registers before any public claim.
- **Tests:** `pytest` (35+), `npm test` (25+), i18n:check, no urgent downgrade.
