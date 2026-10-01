# RBAC — 4 roles, permissions, scope

**Decision support tool. Not a replacement for clinical judgment.**  
Synthetic demo data only.

## Roles

| Code | Scope | Summary |
| --- | --- | --- |
| `SUPER_ADMIN` | national | Full access including permissions matrix; all users; config; audit. Only role that can create/edit/deactivate SUPER_ADMIN or RBC_ADMIN. |
| `RBC_ADMIN` | national | Manages HEALTH_CENTER and CHW; geography, facilities, stock, SLA; all dashboards, alerts, funnel, overdue referrals, audit; messages + reassign follow-ups. Cannot edit permissions matrix or SUPER_ADMIN accounts. |
| `HEALTH_CENTER` | facility | Referral inbox; status updates; messages; own-facility stock; read-only list of CHWs at own facility. |
| `CHW` | own / village | Own triages, referrals, follow-ups, voice triage. |

Legacy `SUPERVISOR` / `RBC_OFFICER` (and lowercase `supervisor` / `rbc`) are **migrated** on startup — never left as live roles. Mapping is audited (`role_migration_4roles`).

## Permission format

`resource:action` with actions `read | create | update | delete | export | assign`.  
Default role checks are implemented in `apps/worker/src/auth.ts`. SUPER_ADMIN has all permissions; RBC_ADMIN receives national operational read access.

## Scope

| Role | Scope |
| --- | --- |
| SUPER_ADMIN / RBC_ADMIN | national |
| HEALTH_CENTER | facility |
| CHW | own |

Enforced in query helpers and SSE — never trust client role/scope.

## Anti-escalation

- Nobody grants a permission/role they do not hold.
- Only SUPER_ADMIN manages SUPER_ADMIN / RBC_ADMIN.
- RBC_ADMIN cannot edit SUPER_ADMIN.
- Nobody deactivates/deletes self.
- Last active SUPER_ADMIN cannot be deactivated, deleted, or demoted.
- SUPER_ADMIN matrix row is locked.

## Login

Role is never chosen in the UI. `/auth/login` returns role + permissions from the account record. Frontend stores server response only.

## Password prompt

| Field | Values |
| --- | --- |
| `password_prompt_status` | `pending` \| `changed` \| `dismissed` |
| `ZM_PASSWORD_CHANGE_POLICY` | `prompt` (default; dismissible modal) or `enforce` (must change; dismiss blocked; API limited until changed) |

- Admin create / password reset → `pending`.
- User changes password → `changed`.
- User dismisses via `POST /auth/password-prompt/dismiss` → `dismissed` (prompt policy only; remembered server-side forever).
- Demo/seed accounts start as `dismissed` (no interrupt).
- Frontend never redirects to `/app/change-password` after login; optional page stays in Settings / avatar menu.
- Non-demo deployments should consider `ZM_PASSWORD_CHANGE_POLICY=enforce`.
