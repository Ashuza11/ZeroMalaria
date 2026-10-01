# QA answers

| Question | Answer |
| --- | --- |
| Where is AI used? | Only to draft a nurse handoff from structured facts. The current fallback is a deterministic template; a protected provider can be added later. |
| What chooses the decision? | Deterministic TypeScript RBC rules running inside the PWA. |
| Does it work offline? | Touch triage, decisions, local storage and referral queueing work offline. Voice and cross-device synchronization require internet. |
| Where are private keys? | Worker secrets. They are never placed in `VITE_*` variables or browser bundles. |
| How do roles communicate? | Referral rows, status events and message threads stored in D1. |
| Is voice a chatbot? | No. Pindo reads fixed prompts and transcribes short Kinyarwanda answers which the CHW confirms. |
