# ZeroMalaria — Progress

**Decision support tool. Not a replacement for clinical judgment.**  
**Synthetic demo data** only.

## Current sprint: Ardent visual merge (2026-09-30) — DONE

**Branch:** `test-merge-ardent` (do not touch `main`).

### Goal

Use Ardent’s liquid-glass landing + auth visuals while keeping local RBAC, auth gate, 4 roles, password-prompt modal, Kinyarwanda default, fixed shell (sticky header/sidebar, main scrolls), centered Modal.

### Assumptions

- No self-service forgot-password API → login hides forgot link; `ForgotPasswordPage.tsx` left unrouted.
- No `/signup`; `SignUpPage.tsx` deleted (admin creates accounts).
- Ardent `src/i18n/*.json` not used; keys live in `locales/{rw,en}/landing.json` + `authx.json` (draft in `_review.json`).
- Demo role-orb quick login removed from login UI (role auto-detection only).

### What shipped

1. **`/`** → lazy `LandingPage` (public); authed users → role home. **`/login`** under `AuthLayout`.
2. **LoginPage** restyled with AuthLayout / Field / PasswordField / PillButton; local login, 429/lockout, `canAccess` + role home redirect.
3. **App chrome** glass tokens on shells, Modal, PresenterMenu, PageHeader/SectionCard, Users bulk bar.
4. **i18n:** landing + authx namespaces; hard-coded Loading / Primary / image alts → `t()`.

### Gates

| Check | Result |
| --- | --- |
| pytest | **56 passed** |
| npm run build | **OK** (LandingPage lazy chunk) |
| npm run lint | **OK** |
| npm run i18n:check | **OK** (647 keys) |

### Not done / leftover

- Native RW review for draft landing/authx keys.
- `ForgotPasswordPage.tsx` still on disk but not routed (no backend endpoint).
- Place-name hardcode `Nyamata · Bugesera` on landing problem card (proper noun).
