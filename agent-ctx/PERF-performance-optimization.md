# Task ID: PERF — Agent: Performance optimization

## Task
Add DB pagination to 3 API routes (I6) + convert 5 admin pages from `'use client'` + `fetch()` waterfalls to async server components backed by Prisma (I5).

## Work Log
- **Task 1 — DB pagination (3 API routes)** — backward-compatible pattern: if `?page=` is present in the query, return `{ data, total, page, pageSize }`; otherwise return the legacy flat array.
  - `src/app/api/dossiers/route.ts` — added `page`, `pageSize` (default 20, max 50), `skip`/`take`, parallel `findMany + count` via `Promise.all`. Preserved the existing CANDIDAT vs staff `where`/`include` divergence.
  - `src/app/api/admin/transactions/route.ts` — same pattern; factored `mapToRow` so both branches share the same serialization.
  - `src/app/api/admin/users/route.ts` — same pattern; factored `mapToRow`.
- **Task 2 — Server component conversions (5 pages)**. For each page, extracted ALL existing interactive logic (DataTable, columns, toolbar, selectionBar, Alert, dialogs, sheets) into a new `'use client'` component that takes `initialData`/`initialX` props (no fetch). The page.tsx became an async server component that calls `getServerSession(authOptions)` + `redirect("/connexion")` guard + Prisma query + serialization, then renders the client component with the data as props.
  - **2a `/admin/dossiers`** — `src/components/admin/dossiers-client.tsx` + new page.tsx that calls `db.dossier.findMany({ include: { candidat, universite, formation, conseiller }, orderBy: { updatedAt: "desc" } })` and maps to a `DossierRow[]`.
  - **2b `/admin/utilisateurs`** — `src/components/admin/utilisateurs-client.tsx` + new page.tsx that calls `db.user.findMany({ select: { id, email, prenom, nom, role, actif, createdAt, _count: { dossiersConseiller } }, orderBy: { createdAt: "asc" } })` and maps DB enum roles to internal display roles.
  - **2c `/admin/finance`** — `src/components/admin/finance-client.tsx` + new page.tsx that fetches `db.paiement.findMany()` and computes the 4 finance KPIs (`encaisseMois`, `enAttente`, `impayes`, `totalEncaisse`) via 4 parallel `aggregate()` calls — eliminating the previous double-fetch of `/api/admin/transactions` + `/api/admin/stats`.
  - **2d `/admin/catalogue`** — `src/components/admin/catalogue-client.tsx` + new page.tsx that calls `db.universite.findMany({ include: { formations }, orderBy: { nom: "asc" } })` and uses the shared `normalizeUniversite()` helper from `@/lib/types.ts` to parse JSON-string fields (`domaines`, `pointsForts`, `prerequis`, `piecesRequises`) into real arrays.
  - **2e `/admin/attestations`** — `src/components/admin/attestations-client.tsx` + new page.tsx that runs 3 parallel Prisma queries: `db.dossier.findMany({ where: { etat: "PRE_ADMISSION" } })` (à émettre), `db.dossier.findMany({ where: { etat: { in: ["ATTESTATION", "CLOTURE"] } } })` (émises), and `db.modeleAttestation.findMany({ where: { actif: true } })`. The "Émettre" button keeps calling `/api/dossiers/[id]/workflow` and now optimistically moves the dossier from "à émettre" to "émises" locally.
- All existing UI, styling, props, and behavior preserved — only the data source was swapped (client fetch → server-side Prisma). The DataTable, the toolbar selects, the Alert box, the Sheet detail, the invite dialog, the new-transaction dialog, etc. are byte-for-byte identical.
- Used `serializeDossier()` / `normalizeUniversite()` from `@/lib/types.ts` where applicable (catalogue uses `normalizeUniversite`). For dossiers list / finance / attestations we used a lighter inline mapping because the displayed row shape is a strict subset and `serializeDossier` is meant for the full DossierWithRelations payload.

## Verification
- `bun run lint` → 0 errors, 0 warnings.
- Logged in as `y.bensaid@getadm.com` (admin) with NextAuth credentials flow → all 5 admin pages return **200**:
  - `/admin/dossiers` → 200 (data: GETADM-2026-0048, Sorbonne Université, Pré-admission accordée)
  - `/admin/utilisateurs` → 200 (9 membres, y.bensaid visible)
  - `/admin/finance` → 200 (KPIs + Rapprochement bancaire Alert rendered with real sums)
  - `/admin/catalogue` → 200 (10 universités, 13 formations, Sorbonne)
  - `/admin/attestations` → 200 (Fatou Diallo in "à émettre" queue, GETADM-2026-0048)
- Pagination tests (curl):
  - `/api/dossiers?page=1&pageSize=5` → `{ data: [...1], total: 1, page: 1, pageSize: 5 }` ✓
  - `/api/dossiers` (no `page=`) → flat array, length 1 ✓ (backward compatible)
  - `/api/admin/transactions?page=1&pageSize=2` → `{ data: [...2], total: 2, page: 1, pageSize: 2 }` ✓
  - `/api/admin/transactions` → flat array, length 2 ✓
  - `/api/admin/users?page=1&pageSize=2` → `{ data: [...2], total: 9, page: 1, pageSize: 2 }` ✓
  - `/api/admin/users` → flat array, length 9 ✓
  - `/api/admin/users?page=5&pageSize=2` → 1 record on the last partial page ✓
  - `/api/admin/users?page=1&pageSize=100` → pageSize clamped to 50 ✓
- Rendered HTML no longer contains `/api/dossiers`, `/api/admin/users`, `/api/admin/transactions`, or `/api/admin/stats` URLs → the client-side waterfall is fully eliminated for these 5 pages.
- `dev.log` scan: 0 errors, 0 warnings. Page render times dropped to 50–250 ms (server-rendered HTML).
- Backward compatibility: existing consumers of the flat-array API (espace/dossier/page.tsx, espace/paiement/page.tsx, espace/messages/page.tsx, espace/page.tsx, admin/dossiers/[id]/page.tsx, admin/attestations-page (now removed client-side fetch)) still work because no `?page=` is added by any of them.

## Stage Summary
- 3 API routes now support optional DB pagination (backward compatible — flat array when `?page=` is absent, `{ data, total, page, pageSize }` when present).
- 5 admin pages converted from `'use client'` + `useEffect(fetch)` waterfall to async server components backed by direct Prisma queries:
  - `/admin/dossiers` → `DossiersClient`
  - `/admin/utilisateurs` → `UtilisateursClient`
  - `/admin/finance` → `FinanceClient` (also consolidated the previous 2 fetches into a single server round-trip)
  - `/admin/catalogue` → `CatalogueClient` (uses shared `normalizeUniversite` helper)
  - `/admin/attestations` → `AttestationsClient` (filter pushed into Prisma `where` instead of client-side `.filter`)
- Net: client bundle smaller (no fetch logic, no loading/error state per page), HTML rendered with data on first paint (no flash of loading spinner), database queries now use targeted `where` clauses and parallel `Promise.all` (finance: 5 queries in 1 round-trip; attestations: 3 queries in 1 round-trip).
- Lint clean. Runtime clean. All existing UI preserved exactly.
