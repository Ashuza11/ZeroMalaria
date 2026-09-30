# ZeroMalaria — Progress

**Decision support tool. Not a replacement for clinical judgment.**  
**Synthetic demo data** only.

## Current sprint: password prompt modal (2026-09-30) — DONE

### STEP 0 — Audit (`must_change_password`)

| Location | Role |
| --- | --- |
| `apps/api/app/db.py` | column + `_ensure_columns` |
| `apps/api/app/routers_auth.py` | login/me/create/reset/change |
| `apps/web/src/auth/guards.tsx` | was redirecting to `/app/change-password` — **removed** |
| `apps/web/src/auth/AuthContext.tsx` | session normalize |
| `apps/web/src/api/client.ts` | types |
| Locales `mustChangePassword` | kept (unused for gating) |
| Seed | demo users `dismissed` |
| Server blocking | none under `prompt`; middleware under `enforce` |

### Assumptions

- `must_change_password` kept synced (`pending`↔true) for legacy; gating uses `password_prompt_status` + `ZM_PASSWORD_CHANGE_POLICY`.
- Default policy `prompt`; document `enforce` for non-demo.
- Modal once after auth on home; server `dismissed` = never again on any device.
- Skip modal on `/login`, during `/triage`, or while voice `state !== idle`.

### What shipped

1. Backend: `password_prompt_status` (`pending|changed|dismissed`), migration v1 (+ reverse helper), `POST /auth/password-prompt/dismiss`, login fields `password_prompt_status` + `password_change_policy`, create/reset → pending, change → changed, demos → dismissed, enforce middleware.
2. Frontend: no redirect; `PasswordPromptModal` (centered / bottom sheet); Ignore dismisses server-side; Change password page still in Settings / avatar menu.
3. i18n RW/EN + draft `_review.json`.
4. Tests: `test_password_prompt.py` + Playwright `e2e/password-prompt.spec.ts` (3/3). Screenshots: `docs/screenshots/password-prompt-modal-light.png`, `password-prompt-modal-dark.png`, `password-prompt-modal-mobile.png`.

### Gates (final)

| Check | Result |
| --- | --- |
| pytest | **56 passed** |
| npm run build | **OK** |
| npm run lint | **OK** |
| npm run i18n:check | **OK** (485 keys) |
| Playwright password-prompt | **3 passed** |

### Step tracker

| Step | Status |
| --- | --- |
| 0 Audit | **Done** |
| 1 Backend | **Done** |
| 2 Frontend Modal | **Done** |
| 3 i18n | **Done** |
| 4 Tests / docs | **Done** |

### Mocked / not verified

- Native RW glossary review (draft keys in `_review.json`).
