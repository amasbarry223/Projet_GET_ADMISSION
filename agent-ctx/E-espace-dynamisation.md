# Task ID: E — Espace dynamisation

## Scope
Make 4 espace (candidate) pages + 1 inscription page fetch from APIs instead of importing mock data.

## Files modified
- `src/app/espace/paiement/page.tsx` — fetch `/api/dossiers` (first dossier) → use `dossier.fraisAgence`, `dossier.universite.nom`, `dossier.formation.intitule`, `dossier.paiements` for history. "Confirmer le paiement" POSTs to `/api/paiements` with `{ dossierId, montant, moyen, tranche }`. On success: stores `paiement.reference` for the receipt and re-fetches the dossier to refresh the history table. Loading (Loader2) + error (Alert) gates added.
- `src/app/espace/messages/page.tsx` — fetch `/api/dossiers` for dossierId, then `/api/messages?dossierId=xxx` for the conversation. Messages use `m.auteur.role === "CANDIDAT"` to determine side (candidat right / conseiller left). Send button POSTs to `/api/messages` with `{ dossierId, texte }` and appends the returned message locally. Conversation sidebar shows last message + nonLusCandidat badge. Loading + error gates added.
- `src/app/espace/attestation/page.tsx` — fetch `/api/dossiers` for dossier. Derives `isAvailable = etat ∈ {ATTESTATION, CLOTURE}` (locked state shown otherwise). Document content uses `dossier.candidat.prenom/nom`, `dossier.formation.intitule`, `dossier.universite.nom/ville/pays`. Pre-admission date found via `d.historiques.find(h => h.etat.toUpperCase() === "PRE_ADMISSION")`. Reference generated as `ATT-${dossier.reference.slice(-4)}` and verification code from `dossier.id`. Preview toggle, golden seal, download button, remise switch all preserved.
- `src/app/espace/dossier/page.tsx` (multi-step form) — fetch `/api/universites` for step 1 selectors (universités + nested formations). Fetch `/api/dossiers` to pre-fill `univId`, `formId`, info state, and pieces state from the existing dossier if present. `parseStringList()` helper handles `formation.prerequis` and `formation.piecesRequises` either as a parsed array or a JSON string (DB returns them as strings even when `/api/universites` already parses domaines/pointsForts). BoardingPass at step 5 falls back to a placeholder reference/MRZ when no existing dossier.
- `src/app/inscription/page.tsx` — removed `@/lib/mock/*` imports and the `BoardingPass` component (the user has no dossier yet). Replaced the boarding pass slot in the left panel with a small "Déjà un compte ?" card pointing to /connexion. Also removed the legacy `useAuth` import + destructure that was shadowing `signIn` from `next-auth/react` and silently breaking the auto-login after registration — the next-auth `signIn("credentials", { redirect: false })` is now correctly invoked. Form still POSTs to `/api/register` then auto-logs in.

## API route fix
- `src/app/api/dossiers/route.ts` — added `candidat: { select: { prenom, nom, email, nationalite, telephone } }` to the CANDIDAT-role include. Previously the CANDIDAT query only included universite/formation/conseiller/pieces/paiements/historiques — meaning pages couldn't render the candidat's own name/email/nationalité. This matches the documented API contract (`candidat: { prenom, nom, email, nationalite, telephone }`) and unblocks the attestation document body + the dossier form's pre-filled info step.

## Key decisions
- Kept `@/lib/mock/etats` imports (`ETATS`, `etatParCode`, `COULEUR_BADGE`) only where needed — the attestation page no longer needs it (uses `etat.toUpperCase()` directly to compare with `ATTESTATION`/`CLOTURE`/`PRE_ADMISSION`).
- All 5 pages use the same loading pattern as `/espace/page.tsx`: `Loader2` spinner centered + `Alert` with `AlertCircle` for errors + `Link` to `/espace/dossier` to create a dossier.
- `parseStringList()` helper in dossier page handles both string and array inputs (defensive against API evolution).
- Paiement METHODS array now uses the DB moyen values (`"Orange Money"`, `"Moov Money"`, `"Wave"`, `"Carte bancaire"`) as IDs so the POST body matches the schema and the receipts table displays them unchanged.
- For attestation, when `isAvailable` is false, the locked state Alert + card is rendered; when true, a green "Attestation disponible" Alert is shown with the same preview/download UI.
- After a successful POST to `/api/paiements`, the page calls `loadDossier()` again so the new transaction appears in the history table immediately.

## Verification
- `bun run lint` — clean (0 errors, 0 warnings).
- curl tests logged in as `fatou.diallo@demo.getadm` (candidat):
  - GET `/espace` → 200
  - GET `/espace/paiement` → 200
  - GET `/espace/messages` → 200
  - GET `/espace/attestation` → 200
  - GET `/espace/dossier` → 200
  - GET `/inscription` → 200
- API tests:
  - GET `/api/dossiers` → 200, returns 1 dossier with `candidat: { prenom, nom, email, nationalite, telephone }` + 5 pieces + 1 paiement + 7 historiques + 1 conseiller.
  - GET `/api/messages?dossierId=xxx` → 200, returns conversation with `candidat`, `conseiller`, `nonLusCandidat: 2`, 5 messages each with `auteur.role` (`CANDIDAT` or `CONSEILLER`).
  - POST `/api/paiements` → 201 with `{ success: true, paiement: {...} }`.
  - POST `/api/messages` → 201 with the created message including `auteur.role`.
  - POST `/api/register` → 201 with new user.
  - GET `/api/universites` → 200, returns 10 universités with nested `formations` (prerequis/piecesRequises still JSON strings — handled by `parseStringList()`).
- dev.log shows 0 errors, all routes return 200/201.
