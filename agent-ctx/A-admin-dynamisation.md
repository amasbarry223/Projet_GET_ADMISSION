# Task ID: A — Admin dynamisation

## Scope
Make 7 admin pages fetch from real APIs instead of importing mock data.

## Files modified
- src/app/admin/page.tsx (dashboard) — fetch /api/admin/stats
- src/app/admin/dossiers/page.tsx (list) — fetch /api/dossiers
- src/app/admin/dossiers/[id]/page.tsx (detail) — fetch /api/dossiers/[id]; workflow POST /api/dossiers/[id]/workflow
- src/app/admin/finance/page.tsx — fetch /api/admin/transactions + /api/admin/stats
- src/app/admin/utilisateurs/page.tsx — fetch /api/admin/users
- src/app/admin/catalogue/page.tsx — fetch /api/universites
- src/app/admin/attestations/page.tsx — fetch /api/dossiers; émettre POST workflow

## Key decisions
- Kept `@/lib/mock/etats` imports (ETATS, etatParCode, COULEUR_BADGE) — legitimate static config, NOT mock data.
- Normalized DB uppercase `etat` (e.g. `PRE_ADMISSION`) → lowercase in Row so filter values (lowercase `e.code`) match.
- For users: defined `RoleInterne` type locally + `mapRole()` to convert DB enum (`CONSEILLER`→`Conseiller`).
- For transactions: added `normalizeStatut()` to map DB `reussi`/`echoue` → display `réussi`/`échoué` (preserves STATUT_TONE map).
- All pages use the same loading pattern: `Loader2` spinner + `Alert`/`AlertTriangle` for errors.
- Workflow actions refresh the dossier via `loadDossier()` callback after success.

## Verification
- `bun run lint` — clean (0 errors).
- curl tests: logged in as y.bensaid@getadm.com (admin), all 7 admin pages return 200, all 5 API endpoints return 200.
- dev.log shows clean renders with no errors.
