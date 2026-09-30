# Architecture — ZeroMalaria

**Synthetic demo data.** Decision support tool. Not a replacement for clinical judgment.

## Roles and access

See [docs/rbac.md](rbac.md) for the permission matrix and anti-escalation rules.

```mermaid
flowchart TB
  CHW[CHW — village triage PWA]
  HC[HEALTH_CENTER — facility inbox]
  Adm[RBC_ADMIN — national admin]
  SA[SUPER_ADMIN — matrix + all]

  CHW -->|JWT scope own| API[(FastAPI + SQLite)]
  HC -->|JWT scope facility| API
  Adm -->|JWT national| API
  SA -->|JWT all| API
```

```mermaid
sequenceDiagram
  participant U as Browser
  participant API as FastAPI
  U->>API: POST /auth/login
  API-->>U: access_token + refresh_token (+ httpOnly cookie)
  U->>API: API calls Authorization Bearer
  alt 401
    U->>API: POST /auth/refresh
    API-->>U: new access_token
  end
  U->>API: GET /events?access_token=…
  Note over API: SSE scoped via same role/permission helpers
```

### RBAC tables (ER)

```mermaid
erDiagram
  users ||--o{ refresh_tokens : has
  users ||--o{ user_permission_overrides : may_have
  roles ||--o{ role_permissions : grants
  permissions ||--o{ role_permissions : granted_by
  users ||--o{ audit_logs : acts
  users {
    string id PK
    string username
    string role
    bool must_change_password
    string password_prompt_status  // pending | changed | dismissed
    datetime deleted_at
    int version
  }
  permissions {
    string code PK
  }
  roles {
    string code PK
    bool locked
  }
  role_permissions {
    int id PK
    string role_code
    string permission_code
  }
```

| Role | Primary UI | API scope |
| --- | --- | --- |
| `CHW` | `/app/home` + `/app/triage`; phone `/m/*` | Own referrals; sync queue |
| `HEALTH_CENTER` | `/app/referrals` inbox | Facility referrals; status PATCH; CHWs read-only |
| `RBC_ADMIN` | `/app/dashboard` + admin CRUD | National (no matrix edit) |
| `SUPER_ADMIN` | All + `/app/permissions` | Full |

Login: username/password only → server returns role + permissions → redirect by role (or prior URL if allowed).

Demo-only logins: see README § Demo only.

Pilot districts in seed (synthetic; *source: RBC problem canvas, to be verified*): **Gisagara**, **Nyamagabe**, plus Nyamasheke / Nyagatare.

## Live cross-role events

```mermaid
sequenceDiagram
  participant CHW
  participant API
  participant Nurse
  participant RBC
  CHW->>API: Confirm urgent → POST /referrals
  API->>API: AppEvent referral.created
  Nurse->>API: GET /events/poll
  API-->>Nurse: new referral toast + inbox row
  Nurse->>API: PATCH status received + message
  API-->>CHW: poll → timeline + thread
  Note over API: If SLA overdue without arrived → alert CHW + supervisor + RBC feed
```

Frontend: `EventProvider` opens SSE `GET /events?access_token=…` with poll fallback (12s safety / 4s if SSE fails). Live Demo Board: `/demo/board` (three panes).

i18n: `apps/web/src/locales/{rw,en}/*.json` is the translation source of truth (`lng`/`fallbackLng`=`rw`; browser language ignored).

## Voice dialogue state machine

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> greeting: Start voice guided triage
  greeting --> asking
  asking --> listening: TTS finished
  listening --> confirming: intent match / danger always
  confirming --> asking: next slot
  confirming --> responding: triage complete
  responding --> idle: result catalog speech
```

Result speech = fixed catalog + `triggered_rules` only (never free LLM text). Playback: audio pack → `/voice/speak` → lang-matched browser TTS → text highlight.

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
    Voice[/voice/speak → Pindo Kinyarwanda TTS]
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
