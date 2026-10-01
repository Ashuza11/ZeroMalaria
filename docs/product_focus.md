# ZeroMalaria product focus

## One demonstrable workflow

1. A CHW completes a Kinyarwanda-first guided malaria triage by voice or touch.
2. Deterministic RBC protocol rules produce the decision. Voice and AI never change it.
3. For a referral, AI turns the structured facts and rule result into a short nurse handoff brief.
4. The referral reaches the selected health-centre inbox.
5. A nurse confirms received, arrived, and treated status.
6. RBC sees referral completion, delays, stock pressure, and surge signals.

## Safety boundary

- `rules/malaria_rules.yaml` is the decision source of truth.
- Voice STT may fill a field only after the CHW confirms the transcript.
- AI may summarize facts already collected; it cannot diagnose, prescribe, downgrade urgency, or add facts.
- The handoff always carries the deterministic decision, triggered rules, missing information, and an AI/verification label.
- When cloud services are unavailable, touch triage, local rules, offline referral queueing, and recorded prompts continue to work.

## Keep

- CHW triage, result confirmation, handoff, offline sync, referrals, and overdue alerts.
- Health-centre referral inbox and arrival confirmation.
- RBC dashboard sections for referrals, stock, and surge.
- Authentication, role boundaries, audit records, translations, and clinical rule tests.
- Recorded Kinyarwanda audio as the offline voice fallback.

## Remove from the primary product path

- General-purpose AI chat, case Q&A, multi-agent consult, and AI activity screens.
- Separate patient, prevention, translation-review, and presentation/demo-board navigation.
- Duplicate routes and controls that do not support the end-to-end demo.
- English speech output. The interface may retain English for development, but the field workflow is Kinyarwanda-first.

## Provider boundary

- Voice: Pindo is the Kinyarwanda voice provider; recorded prompts and touch input remain offline fallbacks.
- Handoff AI: one server-side provider adapter with a deterministic template fallback. Provider output is constrained to the supplied structured facts.

## Implementation order

1. Simplify the visible routes and navigation.
2. Integrate and test Pindo voice support.
3. Replace generic AI surfaces with the nurse handoff generator.
4. Tighten referral receipt and arrival confirmation.
5. Reduce the RBC dashboard to operational signals for this workflow.
6. Run a scripted offline/online end-to-end demo and protocol regression suite.
