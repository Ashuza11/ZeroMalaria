# Architecture

```mermaid
flowchart LR
  CHW[CHW PWA] -->|online sync| Worker[Cloudflare Worker]
  CHW -->|offline| IDB[(IndexedDB queue)]
  Worker --> D1[(Cloudflare D1)]
  Worker --> Pindo[Pindo Kinyarwanda STT/TTS]
  Worker --> Brief[Handoff generator]
  Facility[Facility inbox] --> Worker
  RBC[RBC dashboard] --> Worker
```

## Safety boundary

- The PWA evaluates deterministic RBC rules locally.
- The Worker never asks Pindo or an AI model to choose clinical urgency.
- Voice transcripts fill a field only after CHW confirmation.
- The generated handoff contains supplied facts and the locked rules decision.
- Missing cloud services do not prevent touch triage or offline referral queueing.

## Runtime components

- `apps/web`: React, Vite, TypeScript, IndexedDB and service worker.
- `apps/worker`: TypeScript Worker, authentication, Pindo proxy and API routes.
- `apps/worker/migrations`: D1 database schema.
- `apps/worker/seed.sql`: synthetic development accounts and operational samples.
- `apps/web/src/rules`: deterministic client-side clinical engine.

## Referral sequence

```mermaid
sequenceDiagram
  participant C as CHW PWA
  participant W as Worker
  participant D as D1
  participant H as Health facility
  C->>C: Apply deterministic rules
  C->>C: CHW confirms referral
  C->>W: Sync referral
  W->>D: Store idempotently by client UUID
  H->>W: Mark received / arrived / treated
  W->>D: Store timestamp and event
  W-->>C: Updated referral timeline
```
