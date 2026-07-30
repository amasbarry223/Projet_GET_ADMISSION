# Task WIRE-ADMIN — Work Record

**Agent**: Wire admin pages
**Task ID**: WIRE-ADMIN
**Date**: 2026-07-30

## Context

Previous agent (API-CRUD) built all the CRUD API routes (`/api/universites`, `/api/admin/users`, `/api/admin/paiements`, `/api/admin/parametres`, `/api/dossiers/[id]/workflow`) but the admin client components were still calling `toast.success()` instead of hitting the real APIs. This task wires every admin button to its real endpoint.

## What was done

### catalogue-client.tsx
- Added `useRouter` from `next/navigation` and `Loader2` from lucide-react.
- Converted the "Ajouter une université" Dialog's 6 inputs (nom, ecusson, ville, pays, fraisMin, fraisMax) from uncontrolled to controlled state.
- `handleNew` → `POST /api/universites` with full `universiteSchema` body (defaults for `drapeau`, `domaines`, `description`, `pointsForts`, `imageCouleur`, `partenaire: true`).
- `handleSave` (Sheet "Enregistrer") → `PUT /api/universites/[id]` with the current `detailUniversite` fields.
- `handleDelete` → `DELETE /api/universites/[id]` — used by both the Sheet "Supprimer" button AND the actions dropdown AlertDialog confirm.
- Every handler: `Loader2` on the active button, `toast.error` on failure (parses server `error` field), `toast.success` + `router.refresh()` on success.
- **Critical fix**: removed `useState<UniversiteNormalized[]>(initialData)` wrapper → now `const universites = initialData;` so that `router.refresh()` (which re-renders the server component and passes fresh props) actually updates the table.

### utilisateurs-client.tsx
- Added `useRouter` + `Loader2`.
- Added `ROLE_FR_TO_DB` map: `Conseiller → CONSEILLER`, `Financier → FINANCIER`, `Admin → ADMIN`, `Super Admin → SUPER_ADMIN`.
- Converted invite Dialog inputs to controlled state.
- `handleInvite` → `POST /api/admin/users` with `{ prenom, nom, email, role: ROLE_FR_TO_DB[formRole] }`. Toast displays the returned `defaultPassword` so the staff member can communicate it to the new user.
- `toggleActif(id, currentActif, nom)` → `PUT /api/admin/users/[id]` with `{ actif: !currentActif }`. Wired to the Switch in the "Actif" column.
- `suspendre(id, nom)` → same PUT with `{ actif: false }`. Wired to the AlertDialog "Suspendre l'accès".
- `supprimer(id, nom)` → `DELETE /api/admin/users/[id]`. Wired to the AlertDialog "Supprimer le compte".
- Added `updatingId` state to disable the Switch during the API call; added `updatingId` to the columns useMemo deps (otherwise the `disabled` prop would have a stale closure).
- Removed `useState<UserRow[]>(initialData)` → `const data = initialData;`.

### finance-client.tsx
- Added `useRouter` + `Loader2`.
- Converted "Nouvelle transaction" Dialog inputs to controlled state (`formDossierId`, `formMontant`, `formMoyen`).
- `handleNewTransaction` → `POST /api/admin/paiements` with `{ dossierId, montant, moyen }`.
- Removed `useState<TransactionRow[]>(initialTransactions)` → `const rows = initialTransactions;`.

### parametres/page.tsx
- Added `Loader2`.
- Introduced controlled state: `fraisMin`, `fraisMax`, `paiementTranches`, plus `loading` and `saving` flags.
- `useEffect` on mount → `GET /api/admin/parametres` to populate the three form fields (replaces static `defaultValue="350000"` etc.).
- "Enregistrer les modifications" button → `PUT /api/admin/parametres` with `{ fraisMin, fraisMax, paiementTranches }`.
- Button is `disabled={saving || loading || !isSuperAdmin}` (PUT would 403 for non-SUPER_ADMIN).
- Other tab toggles (moyens de paiement, notifications, cache, reset) left as toasts — not in the schema.

### attestations-client.tsx
- Added `useRouter` + `Loader2`.
- Added `emittingId` state to show a spinner on the "Émettre" button during the workflow API call.
- Added `router.refresh()` after successful `POST /api/dossiers/[id]/workflow { action: "emettre_attestation" }`.
- Added two `useEffect` hooks to sync `aEmettre`/`emises` state with `initialAEmettre`/`initialEmises` after `router.refresh()` (optimistic UI is eventually replaced by server truth).
- "Télécharger" / "Aperçu" buttons left as toasts (real PDF generation out of scope).

### dossiers-client.tsx
- Unchanged per spec. The selection-bar "Affecter un conseiller" and "Exporter" buttons remain toasts (documented as "démonstration" in the Alert below the table).

## Critical insight: useState vs router.refresh()

The four list client components all used `useState(initialData)` to capture the server prop. This pattern freezes the table at the initial render — `router.refresh()` re-renders the server component but does NOT reinitialize client `useState`, so mutations would never appear in the UI.

Fix:
- `catalogue`, `utilisateurs`, `finance`: removed the `useState` wrapper, read the prop directly.
- `attestations`: kept `useState` (needed for optimistic UI) but added `useEffect` syncs.

## Verification

- `bun run lint` → 0 errors, 0 warnings.
- All `/admin/*` routes return 200 when authenticated (catalogue, utilisateurs, finance, parametres, attestations, dossiers).
- End-to-end curl tests with admin session (y.bensaid@getadm.com):
  - `POST /api/universites` → 201 → `PUT` → 200 → `DELETE` → 200 ✓
  - `POST /api/admin/users` → 201 (returned `defaultPassword`) → `PUT { actif: false }` → 200 → `DELETE` → 200 ✓
  - `GET /api/admin/parametres` → 200 ✓
  - `POST /api/admin/paiements` → 201 (new `REC-2026-7950`) ✓
- Dev log: clean, no runtime errors after the changes.

## Files touched

- `src/components/admin/catalogue-client.tsx`
- `src/components/admin/utilisateurs-client.tsx`
- `src/components/admin/finance-client.tsx`
- `src/components/admin/attestations-client.tsx`
- `src/app/admin/parametres/page.tsx`
