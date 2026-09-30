# Architecture — ZeroMalaria

**Synthetic demo data.** Decision support tool. Not a replacement for clinical judgment.

## Roles and access

```mermaid
flowchart TB
  CHW[chw — village triage PWA]
  Nurse[nurse — facility inbox]
  Sup[supervisor — users + scoped referrals]
  RBC[rbc — district dashboard + all referrals]

  CHW -->|JWT scoped to chw_code| API[(FastAPI + SQLite)]
  Nurse -->|JWT scoped to facility_id| API
  Sup -->|JWT facility + POST /users| API
  RBC -->|JWT all analytics| API
```

| Role | Primary UI | API scope |
| --- | --- | --- |
| `chw` | Desktop `/app/chw` + `/app/triage` (StepperLayout); phone `/m/*` | Own referrals; sync queue |
| `nurse` | `/app/referrals` TwoPanel inbox | Facility referrals; status PATCH |
| `supervisor` | `/app/dashboard` scoped + Users | Facility referrals; create CHW users |
| `rbc` | `/app/dashboard` analytics + hotspots | Analytics, hotspots, all referrals |

Demo logins: `chw.demo`, `nurse.demo`, `supervisor.demo`, `rbc.demo` (password `demo1234`).

## Offline vs online tiers

```mermaid
flowchart LR
  subgraph tier1 [Tier 1 — always local]
    RulesTS[YAML rules in TS]
    IDB[(IndexedDB)]
    Queue[Sync queue]
  end

  subgraph tier2 [Tier 2 — online optional]
    TriageAPI[POST /triage]
    NLP[/nlp / ai routes]
    Voice[/voice/speak]
  end

  subgraph tier3 [Tier 3 — online required]
    Inbox[Facility inbox poll]
    Dash[RBC KPIs + hotspots]
    Auth[JWT login]
  end

  RulesTS --> IDB --> Queue
  Queue -->|POST /sync| DB[(SQLite)]
  tier2 --> DB
  tier3 --> DB
```

- **Tier 1:** CHW can complete triage and urgent referral with no network; decisions use the same rules file as the server.
- **Tier 2:** When online, server triage/AI can enrich; failures fall back to local rules + mock NLP.
- **Tier 3:** Nurse/RBC operational views poll the API; RBC hotspots are skipped when offline (empty signals, no error banner).

## AI provider fallback

```mermaid
flowchart LR
  Req[AI route] --> Sanitize[sanitize_for_ai allowlist]
  Sanitize --> Router[ZM_AI_PROVIDER_ORDER]
  Router --> G[Gemini]
  Router --> Q[Groq]
  Router --> L[LocalNlpProvider mock]
  G -->|timeout / error| Q
  Q -->|timeout / error| L
```

Env: `ZM_GEMINI_API_KEY`, `ZM_GROQ_API_KEY`, `ZM_AI_PROVIDER_ORDER`, `ZM_AI_TIMEOUT_SECONDS`. No keys → Local only.

## System context

```mermaid
flowchart LR
  subgraph phone [CHW PWA]
    UI[Guided triage UI]
    RulesTS[TypeScript rules from YAML]
    IDB[(Dexie IndexedDB + sync queue)]
  end

  subgraph api [FastAPI]
    Triage["POST /triage"]
    RulesPY[Python rules engine]
    ML[GB / LR + SHAP]
    DB[(SQLite)]
    Sync["POST /sync idempotent"]
  end

  Inbox[Health center inbox]
  Dash[RBC dashboard]

  UI --> RulesTS --> IDB
  IDB --> Sync --> DB
  UI -.online.-> Triage --> RulesPY --> ML
  DB --> Inbox
  DB --> Dash
```

## Decision layers

```mermaid
flowchart TD
  In[Structured signs + optional free text]
  NLP[Layer 3 NLP: extract / explain only]
  R[Layer 1 rules YAML]
  Lock[urgent_refer locked]
  M[Layer 2 ML risk]
  Esc[Escalate only via max decision]
  H[CHW confirms + sees why]
  Out[Handover / queue / alerts / dashboard]

  In --> NLP --> In
  In --> R
  R -->|danger sign or infant placeholder| Lock
  R -->|no lock| M
  M --> Esc
  Lock --> H
  Esc --> H
  H --> Out
```

## Single source of clinical truth
- `rules/malaria_rules.yaml` → `apps/api/engine/rules.py`
- Same YAML → `apps/web/scripts/generate_rules_ts.py` → `src/rules/malariaRules.generated.ts` → offline `evaluateRules`

## Offline sync
1. CHW completes triage with local rules.
2. Referral stored in IndexedDB and sync queue with client UUID.
3. On connectivity, `POST /sync` upserts by `client_uuid` (idempotent).
4. Facility and CHW UIs poll for status changes.

## Safety invariant
`final_decision = max_rank(rules_decision, ml_proposed_decision)`  
Unit tests in `apps/api/tests/test_decision.py` and `apps/web/src/rules/engine.test.ts` enforce that urgent referral cannot be downgraded.
