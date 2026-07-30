# Task API-CRUD — Work Record

**Agent**: CRUD API builder
**Task ID**: API-CRUD
**Date**: 2026-07-30

## Context

Previous agents had built 19 Prisma models, 23 API routes, but many CRUD operations were missing. This task created all missing routes for full CRUD coverage.

## What was done

### Schema changes (prisma/schema.prisma)
- Added `ContactMessage` model (id, prenom, nom, email, telephone?, objet, message, createdAt, traite) with indexes on `traite` and `createdAt`.
- Added `Parametre` model (singleton id=1, fraisMin, fraisMax, paiementTranches) with sensible defaults.
- Ran `bun run db:push --accept-data-loss` after schema changes.

### Validations (src/lib/validations.ts)
Added 10 new Zod schemas:
- `passwordChangeSchema` — currentPassword required, newPassword 8-128 chars
- `dossierCreateSchema` — universiteId, formationId required
- `dossierUpdateSchema` — etapeActuelle (1-12), info (prenom/nom/etc.), pieces[]
- `pieceSchema` — libelle, statut enum, type/nomFichier/taille optional
- `universiteSchema` — full universite fields with defaults
- `adminUserCreateSchema` — prenom/nom/email + role enum
- `adminUserUpdateSchema` — actif/role optional
- `contactSchema` — prenom/nom/email/objet/message + telephone optional
- `markReadSchema` — dossierId required
- `manualTransactionSchema` — dossierId/montant/moyen + tranche optional
- `parametresSchema` — fraisMin/fraisMax/paiementTranches optional

### Utils (src/lib/utils.ts)
- `slugify(input)` — NFD normalization + ASCII collapse, handles accents
- `uniqueSlug(base, exists)` — collision-safe suffix incrementer

### Rate limiting (src/lib/rate-limit.ts)
Added 5 new buckets:
- `/api/contact` — 5/min
- `/api/profile/password` — 5/min
- `/api/dossiers` — 10/min
- `/api/admin/users` — 10/min
- `/api/admin/paiements` — 10/min

### Routes created/modified

| Route | Method | Status | File |
|-------|--------|--------|------|
| /api/dossiers | POST | NEW | route.ts (added to existing GET) |
| /api/dossiers/[id] | PUT | NEW | [id]/route.ts (added to existing GET) |
| /api/dossiers/[id]/pieces | POST + GET | NEW | [id]/pieces/route.ts |
| /api/universites | POST | NEW | route.ts (added to existing GET) |
| /api/universites/[id] | GET + PUT + DELETE | NEW | [id]/route.ts (replaced [slug]/route.ts) |
| /api/admin/users | POST | NEW | route.ts (added to existing GET) |
| /api/admin/users/[id] | PUT + DELETE | NEW | [id]/route.ts |
| /api/contact | POST + GET | NEW | contact/route.ts |
| /api/profile/password | PUT | NEW | profile/password/route.ts |
| /api/dossiers/[id]/workflow | POST | MODIFIED | [id]/workflow/route.ts (attestation auto-create on ATTESTATION) |
| /api/attestations/[dossierId] | GET | NEW | attestations/[dossierId]/route.ts |
| /api/messages/read | PUT | NEW | messages/read/route.ts |
| /api/admin/paiements | POST + GET | NEW | admin/paiements/route.ts |
| /api/admin/parametres | GET + PUT | NEW | admin/parametres/route.ts |

### Conflict resolution
- Removed `/api/universites/[slug]/route.ts` because Next.js doesn't allow two different dynamic param names (`[slug]` vs `[id]`) at the same path level. The new `[id]/route.ts` accepts either an ID or a slug via `findFirst({ where: { OR: [{ id }, { slug: id }] } })`.

## Verification

All endpoints tested with curl + real authenticated sessions:

- `POST /api/contact` → 201 with `{ success: true, id: 1 }`
- `POST /api/dossiers` → 201 with full dossier (reference `GETADM-2026-0003`, état `SOUMIS`, étape `2`, MRZ 2 lines, 5 pieces created, 1 historique, conversation created)
- `PUT /api/dossiers/[id]` → 200, updated etapeActuelle=3, candidat telephone, piece statut, historique note
- `POST /api/dossiers/[id]/pieces` → 200 (update existing) or 201 (create new)
- `POST /api/universites` → 201 with auto slug
- `PUT /api/universites/[id]` → 200 with re-slug if name changed
- `DELETE /api/universites/[id]` → 200 (or 409 if dossiers linked)
- `POST /api/admin/users` → 201 with defaultPassword returned
- `PUT /api/admin/users/[id]` → 200 (toggle actif / change role)
- `DELETE /api/admin/users/[id]` → 200 (soft delete if relations, hard delete otherwise)
- `PUT /api/profile/password` → 400 (wrong current) or 200 (correct)
- `POST /api/dossiers/[id]/workflow` (action=emettre_attestation) → 200, attestation auto-created with `ATT-2026-0048` ref + `VRF-XXXX-YYYY-0048` code
- `GET /api/attestations/[dossierId]` → 200 with full attestation + emetteur + dossier
- `PUT /api/messages/read` → 200 with reset counters
- `POST /api/admin/paiements` → 201 with paiementStatut auto-update (partiel/complet)
- `GET /api/admin/parametres` → 200 with default values (auto-create if missing)
- `PUT /api/admin/parametres` → 200 (SUPER_ADMIN only, ADMIN gets 403)

RBAC verified:
- CANDIDAT blocked from admin routes → 403
- ADMIN (non-super) blocked from PUT parametres → 403
- Unauthenticated requests → 401
- Self-disable/self-delete → 400
- Last SUPER_ADMIN protection → 400

Lint: `bun run lint` → 0 errors, 0 warnings.
Dev log: clean, no runtime errors.

## Files touched

- `prisma/schema.prisma` — +2 models (ContactMessage, Parametre)
- `src/lib/validations.ts` — +10 schemas
- `src/lib/utils.ts` — +2 helpers (slugify, uniqueSlug)
- `src/lib/rate-limit.ts` — +5 buckets
- `src/app/api/dossiers/route.ts` — +POST
- `src/app/api/dossiers/[id]/route.ts` — +PUT
- `src/app/api/dossiers/[id]/pieces/route.ts` — NEW (POST + GET)
- `src/app/api/dossiers/[id]/workflow/route.ts` — attestation auto-create on ATTESTATION
- `src/app/api/universites/route.ts` — +POST
- `src/app/api/universites/[id]/route.ts` — NEW (GET + PUT + DELETE), replaces [slug]/route.ts
- `src/app/api/universites/[slug]/route.ts` — DELETED (conflict)
- `src/app/api/admin/users/route.ts` — +POST
- `src/app/api/admin/users/[id]/route.ts` — NEW (PUT + DELETE)
- `src/app/api/contact/route.ts` — NEW (POST public + GET staff)
- `src/app/api/profile/password/route.ts` — NEW (PUT)
- `src/app/api/attestations/[dossierId]/route.ts` — NEW (GET)
- `src/app/api/messages/read/route.ts` — NEW (PUT)
- `src/app/api/admin/paiements/route.ts` — NEW (POST staff + GET alias)
- `src/app/api/admin/parametres/route.ts` — NEW (GET staff + PUT super_admin)
