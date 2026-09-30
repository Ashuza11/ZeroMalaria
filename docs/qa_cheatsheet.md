# Judge Q&A cheat sheet — ZeroMalaria

**Synthetic demo data.** Decision support tool. Not a replacement for clinical judgment.

| Question | Short answer |
| --- | --- |
| **Where is the AI?** | Layer 3 only: optional NLP (`/nlp/extract`, `/ai/extract-symptoms`, `/ai/explain`, `/ai/insights`) to parse free text and draft explanations. Layer 1 rules and Layer 2 ML decide triage; the CHW always confirms on device. Provider chain: Gemini → Groq → Local mock (`ZM_AI_PROVIDER_ORDER`). |
| **What if the AI is wrong?** | AI cannot change the rules outcome: urgent referral is locked. Wrong extractions are corrected on the form before confirm. External calls use `sanitize_for_ai` (allowlisted clinical fields only). Explanations are advisory copy, not orders. |
| **Who creates accounts?** | Demo: seeded users (`seed.py`) and supervisors via **Users** (`POST /users`, JWT). Production: RBC SSO / facility admin — not built in this hackathon beyond role-scoped JWT. |
| **Offline?** | CHW PWA runs the same YAML rules locally (TypeScript), stores in IndexedDB, queues sync. Nurse/RBC views need network for live inbox/dashboard; triage + urgent referral work in airplane mode. |
| **Data from?** | **Synthetic CSVs** in `/data` (cases, facilities, stock). Generator documented in `data/README.md`. UI shows **Synthetic demo data** badge. Hotspot banner says *statistical signal*, never outbreak confirmation. Real pilot would use cEMR/HMIS/eLMIS under RBC governance. |

## Extra talking points

- **Roles:** `chw`, `nurse`, `supervisor`, `rbc` — JWT scopes referrals (`/referrals/scoped`).
- **Hotspots:** `/analytics/hotspots` compares recent case counts to a baseline window; for verification workflows, not automated alerts to the public.
- **Tests:** `pytest apps/api/tests`, `npm test` in `apps/web`, decision-layer tests prevent downgrading urgent referral.
