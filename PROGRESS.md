# ZeroMalaria - Progress

**Decision support tool. Not a replacement for clinical judgment.**  
**Synthetic demo data** only.

## Current sprint: guided triage UX (2026-09-30) - DONE

**Branch:** `test-merge-ardent` (do not touch `main`).

### Problems fixed

1. **Empty question card / filter blur** - Removed `filter: blur()` from spring/step transitions (tween opacity+y only). `AnimatePresence mode="wait"` with keyed step card always ends at opacity 1, y 0.
2. **Auto-save on answer** - Choice chips/yes-no/sex/TDR advance after ~250 ms with selection checkmark. Stepper +/- debounced 800 ms (Continue stays). Free-text keeps Continue/Confirm. Input locked during transitions. Voice uses the same `selectChoice` path.
3. **Time + draft** - `started_at`, per-step `answered_at`, `duration_ms` stored in IndexedDB draft + `sessionStorage` result payload. **API `TriageRequest` has no timing fields** (kept local only). Draft resumes after refresh; cleared on submit.
4. **Answers so far** - Only user-answered steps show values; others show translated `-`.
5. **Layout** - ConversationBar is inline (not sticky overlay). Voice control labels no longer duplicated. Age chips follow Months/Years unit.
6. **Console** - `motion.create(Link)`; scroll mains `position: relative`; blur/filter keyframes removed from triage-adjacent motion.

### Gates

| Check | Result |
| --- | --- |
| pytest | **56 passed** |
| npm run build | **OK** |
| npm run lint | **OK** |
| npm run i18n:check | **OK** (652 keys) |

### Assumptions

- Timing is local-only until API schema is extended.
- Demo `?demo=A|B` still pre-fills and marks clinical steps answered.
