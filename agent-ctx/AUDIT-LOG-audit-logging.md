# AUDIT-LOG — Audit logging

**Task ID**: AUDIT-LOG
**Agent**: Audit logging
**Goal**: Add `logAudit` calls to 7 API routes that were missing audit trail entries.

## Context references

- `logAudit` is defined in `src/lib/audit.ts`. It is non-blocking (catches its own errors and
  logs them to `console.error`) and writes to the Prisma `AuditLog` model.
- Existing reference usage: `src/app/api/dossiers/[id]/workflow/route.ts` (POST handler).
- AuditLog Prisma model accepts `action: String` and `resource: String`, so the typed unions in
  `audit.ts` are validated at the helper level, not at the DB level.

## Files modified

| # | File | Handler | Action / Resource |
|---|------|---------|-------------------|
| 1 | `src/app/api/universites/route.ts` | POST | CREATE / universite |
| 2 | `src/app/api/admin/users/route.ts` | POST | CREATE / user |
| 3 | `src/app/api/paiements/route.ts` | POST | CREATE / paiement |
| 4 | `src/app/api/admin/paiements/route.ts` | POST | CREATE / paiement |
| 5 | `src/app/api/profile/password/route.ts` | PUT | UPDATE / user |
| 6 | `src/app/api/universites/[id]/route.ts` | DELETE | DELETE / universite |
| 7 | `src/app/api/admin/users/[id]/route.ts` | PUT + DELETE (soft & hard) | UPDATE / user, DELETE / user |

Total: **9 `logAudit` calls** across 7 files (the `admin/users/[id]` DELETE handler has both a
soft-delete and hard-delete path, both logged).

## Implementation notes

- Each file received `import { logAudit } from "@/lib/audit";` placed alphabetically with the
  other `@/lib/*` imports.
- Each call was placed **after** the successful DB mutation but **before** the `NextResponse.json`
  return, so a failed audit insert (caught by `logAudit`) cannot falsely report success to the
  client, and a failed DB mutation never produces a spurious audit row.
- `await` was used (as allowed by the spec) since `logAudit` swallows its own errors — the route's
  response latency is not blocked on the audit insert failing.
- Variable name adaptations vs. the spec template:
  - `universites/route.ts` POST: the spec wrote `univ.id` / `univ.nom` but the actual local
    variable is `created` → used `created.id` / `created.nom`.
  - `admin/users/route.ts` POST: the spec wrote `(${role})` but `role` in that scope is the
    **session user's** role. Used `newRole` (the created user's role from `parsed.data`) for a
    meaningful audit message (`Utilisateur créé : bob@example.com (ADMIN)`).
  - `admin/users/[id]/route.ts` DELETE: there are two distinct code paths (soft-delete via
    `actif=false` and hard-delete via `db.user.delete`). Added a `logAudit` call on **both** so
    the audit trail records the actual operation that occurred.
  - For routes where the task spec only gave a generic template (universites DELETE, users PUT,
    users DELETE), I composed a concise French `details` string consistent with the workflow route
    style (`Resource action : identifier`).

## Verification

- `bun run lint` → **clean** (no errors, no warnings).
- Dev server log (`dev.log`) shows no compile/runtime errors after the changes; existing routes
  continue to return 200/201/302 as before.

## Did NOT touch (per rules)

- No business logic changes; all guards, validations, RBAC checks, and response shapes are
  unchanged.
- No new dependencies installed.
- No changes to `src/lib/audit.ts` or the Prisma schema (the existing `AuditLog` model already
  supports all the action/resource combinations used).
