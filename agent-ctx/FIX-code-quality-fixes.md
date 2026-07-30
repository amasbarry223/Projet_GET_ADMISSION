# Task FIX — Code quality fixes

**Task ID**: FIX
**Agent**: Code quality fixes expert
**Scope**: Fix N+1 + Zod validation + rate limiting + error logging + cache.

## Files modified

### API routes (5 files for Zod + 3 of those for rate limit)
- `src/app/api/register/route.ts` — Zod validation + rate limit (3/min)
- `src/app/api/dossiers/[id]/workflow/route.ts` — Zod validation
- `src/app/api/messages/route.ts` — Zod validation + rate limit (30/min)
- `src/app/api/paiements/route.ts` — Zod validation + rate limit (10/min)
- `src/app/api/profile/route.ts` — Zod validation (PUT only)

### N+1 fix
- `src/app/api/admin/stats/route.ts` — topUniversites (findUnique per item → findMany + Map) + topConseillers (count per item → groupBy + Map)

### Cache (revalidate = 3600)
- `src/app/api/public/faq/route.ts`
- `src/app/api/public/contact-info/route.ts`
- `src/app/api/public/equipe/route.ts`
- `src/app/api/public/modeles-attestation/route.ts`
- `src/app/api/public/moyens-paiement/route.ts`
- `src/app/api/public/nationalites/route.ts`
- `src/app/api/public/objets-contact/route.ts`
- `src/app/api/public/stats/route.ts`
- `src/app/api/public/temoignages/route.ts`

### Error logging on silent catches (16 files, 21 occurrences)
- `src/app/admin/utilisateurs/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/dossiers/[id]/page.tsx`
- `src/app/admin/dossiers/page.tsx`
- `src/app/admin/catalogue/page.tsx`
- `src/app/admin/attestations/page.tsx` (2 occurrences)
- `src/app/admin/finance/page.tsx`
- `src/app/connexion/page.tsx`
- `src/app/(vitrine)/contact/page.tsx`
- `src/app/espace/paiement/page.tsx` (2 occurrences)
- `src/app/espace/messages/page.tsx` (3 occurrences)
- `src/app/espace/page.tsx`
- `src/app/espace/attestation/page.tsx`
- `src/app/espace/dossier/page.tsx` (2 occurrences)
- `src/app/espace/profil/page.tsx`
- `src/app/inscription/page.tsx`

## Approach for silent catches
Different replacement strategies based on the original code structure:
- `.catch(() => {});` → `.catch((e) => console.error("fetch error:", e));`
- `.catch(() => setLoading(false));` → `.catch((e) => { console.error("fetch error:", e); setLoading(false); });`
- `.catch(() => { setError(...); setLoading(false); });` → `.catch((e) => { console.error("fetch error:", e); setError(...); setLoading(false); });`

Existing UI behavior (setError/setLoading) is preserved in all cases — only added error logging.

## Verification
- `bun run lint`: 0 errors, 0 warnings ✓
- dev.log: 0 runtime errors, 0 compile errors ✓
- `curl /api/public/faq`: 200, valid JSON ✓
- `curl POST /api/register -d '{}'`: 400 + Zod error message ✓
- 4 rapid POST to /api/register (unique IP): 201, 409, 409, 429 ✓ (4th blocked by rate limit)
- /api/admin/stats: 200, GROUP BY query visible in dev.log (no more N+1 COUNT queries) ✓
