# ZeroMalaria

ZeroMalaria is an offline-first, Kinyarwanda-first malaria triage and referral PWA for Community Health Workers in Rwanda.

## Focused workflow

1. A CHW completes a guided triage by touch or Kinyarwanda voice.
2. Deterministic RBC rules produce the clinical decision locally, including offline.
3. Pindo provides Kinyarwanda speech-to-text and text-to-speech when online.
4. A generated nurse handoff brief summarizes structured facts but cannot alter the RBC decision.
5. The health facility marks the referral received, arrived and treated.
6. RBC sees referral completion, overdue referrals, stock pressure and operational signals.

## Architecture

```text
React + TypeScript PWA
├── deterministic local triage rules
├── IndexedDB offline queue
└── service worker
        │
        ▼
Cloudflare Worker (TypeScript)
├── authentication
├── Pindo proxy
├── handoff generator
├── referral synchronization
├── facility status updates
└── RBC operational APIs
        │
        ▼
Cloudflare D1
```

Private tokens remain inside the Worker and are never compiled into the PWA.

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run db:local
npm run db:seed:local
cp apps/worker/.dev.vars.example apps/worker/.dev.vars
npm run dev
```

Open the URL printed by Vite, normally <http://localhost:5173>. The Worker API runs at <http://localhost:8787/api/health>.

Demo accounts use password `demo1234`:

| Username | Role |
| --- | --- |
| `chw.demo` | CHW triage and referrals |
| `health.center` | Facility referral inbox |
| `rbc.admin` | RBC dashboard |

## Commands

```bash
npm run dev             # PWA + local Worker
npm test                # web and Worker tests
npm run build           # production PWA + Worker type-check
npm run db:local        # apply local D1 migrations
npm run db:seed:local   # seed local demo data
npm run deploy          # build and deploy through Wrangler
```

## Safety boundary

- Clinical decisions come only from the deterministic rules under `apps/web/src/rules`.
- Missing danger-sign answers are never interpreted as “No”.
- Voice transcripts require CHW confirmation before filling an answer.
- AI may summarize supplied facts but cannot diagnose, prescribe or change urgency.
- Touch triage, local decisions and referral queueing remain available offline.
- The current protocol configuration requires RBC clinician validation before real patient use.

## Configuration and deployment

See [docs/cloudflare_deployment.md](docs/cloudflare_deployment.md) for local secrets, D1 creation and Cloudflare deployment.

Pindo setup is documented in [docs/voice_setup.md](docs/voice_setup.md).

## Repository

```text
apps/web/       React PWA
apps/worker/    Cloudflare Worker API and D1 migrations
rules/          auditable clinical protocol source
docs/           architecture, safety and deployment notes
```
