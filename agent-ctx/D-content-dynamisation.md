# Task ID: D — Content dynamisation expert

## Scope
Create 6 public API routes + dynamise 6 pages that still had hardcoded data (FAQ, contact, footer, inscription, paiement, attestations).

## Files created (6 API routes)
- src/app/api/public/faq/route.ts — `db.faq.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } })`
- src/app/api/public/contact-info/route.ts — `db.contactInfo.findUnique({ where: { id: 1 } })` with fallback `{}`
- src/app/api/public/modeles-attestation/route.ts — `db.modeleAttestation.findMany({ where: { actif: true } })`
- src/app/api/public/nationalites/route.ts — returns `string[]` of `n.nom`
- src/app/api/public/moyens-paiement/route.ts — `db.moyenPaiement.findMany({ where: { actif: true } })`
- src/app/api/public/objets-contact/route.ts — returns `string[]` of `o.nom`

## Files modified (6 pages)
1. **src/app/(vitrine)/faq/page.tsx** — server component, now `async`. Removed hardcoded `FAQ` array (10 Q/A). Uses `db.faq.findMany()`. Field mapping: `item.q` → `item.question`, `item.r` → `item.reponse`. Keyed by `item.id` (was index `i`).
2. **src/app/(vitrine)/contact/page.tsx** — client component. Removed hardcoded `OBJETS` array + hardcoded email/phone/adresses/horaires. Added `useEffect` fetching `/api/public/contact-info` + `/api/public/objets-contact`. Added `ContactInfo` type, `loadingInfo` state, `Loader2` spinner in coordonnées card, "Chargement…" placeholder for Objet Select. Added `telHref()` helper stripping non-digits for `tel:` link.
3. **src/components/site/footer.tsx** — server component, now `async`. Removed hardcoded `contact@getadm.com`, `+221 33 800 00 00`, `Dakar · Abidjan · Lomé`. Uses `db.contactInfo.findUnique({ where: { id: 1 } })`. Fallback to `"—"` when empty.
4. **src/app/inscription/page.tsx** — client component. Removed hardcoded `NATIONALITES` array (14 entries). Added `useEffect` fetching `/api/public/nationalites`. Added `loadingNationalites` state + "Chargement…" placeholder for Select. `Loader2` already imported.
5. **src/app/espace/paiement/page.tsx** — client component. Removed hardcoded `METHODS` array (4 entries). Added `MoyenPaiement` type, `methods`/`methodsLoading` state, `iconForMoyen()` helper mapping `"Smartphone"`→`<Smartphone>`, `"CreditCard"`→`<CreditCard>`. Fetches `/api/public/moyens-paiement` in `useEffect` alongside `loadDossier()`. Auto-selects `methods[0].nom` after load. `selectedMethod` lookup now by `m.nom` (was `m.id`). Confirm button disabled while `methodsLoading || !selectedMethod`. Receipt shows `selectedMethod?.nom ?? "—"`. POST body `moyen` uses `selectedMethod.nom`.
6. **src/app/admin/attestations/page.tsx** — client component. Removed hardcoded `MODELES` array (3 entries). Added `ModeleAttestation` type, `modeles` state. `useEffect` now `Promise.all`s `/api/dossiers` + `/api/public/modeles-attestation`. Mapped `m.used` → `m.nbUsages`. Empty-state Card with `Loader2` when `modeles.length === 0`.

## Infrastructure note
The 6 new Prisma models (Faq, ContactInfo, ModeleAttestation, Nationalite, MoyenPaiement, ObjetContact) were in `schema.prisma` but the running dev server's cached `PrismaClient` instance (in `globalForPrisma.prisma`) didn't know them — threw `TypeError: Cannot read properties of undefined (reading 'findMany')`. Fixed by:
1. `bun run db:generate` — regenerated `@prisma/client` with the new models.
2. Restarted the dev server (killed stale process holding old client; started fresh with `setsid -f` for persistence).

No schema or seed files were modified.

## Verification
- `bun run lint` — clean (0 errors, 0 warnings).
- curl tests (all pass):
  * `/api/public/faq` → JSON array of 10 FAQ items
  * `/api/public/contact-info` → `{"id":1,"email":"contact@getadm.com","telephone":"+221 33 800 00 00","adresses":"Dakar · Abidjan · Lomé","horaires":"Lun – Ven : 9h – 18h"}`
  * `/api/public/modeles-attestation` → 3 models
  * `/api/public/nationalites` → 14 nationality names
  * `/api/public/moyens-paiement` → 4 methods (with `icone` field: Smartphone/CreditCard)
  * `/api/public/objets-contact` → 5 object names
- Page status codes: `/` 200 (footer renders DB email/phone/adresses), `/faq` 200, `/contact` 200, `/inscription` 200, `/espace/paiement` 200 (auth), `/admin/attestations` 200 (admin auth).
- 0 runtime errors in `dev.log` after all changes.

## Issues encountered
1. **Stale PrismaClient cache** — the global PrismaClient singleton in `src/lib/db.ts` was created before the 6 new models existed. After `prisma generate`, the running dev server still held the old instance. Required a dev server restart. (No code change to `db.ts` — the global cache pattern is correct, it just needed a fresh process.)
2. **Dev server persistence** — `nohup ... &` and `setsid ... &` alone did not survive between Bash tool invocations. Used `setsid -f bash -c 'exec bun next dev ...'` (the `-f` flag forks before setsid) to fully detach the process into a new session. Verified persistent across multiple subsequent curl calls.
