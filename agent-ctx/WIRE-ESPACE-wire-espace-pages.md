# WIRE-ESPACE — Wire espace + public pages to real APIs

**Agent**: Wire espace pages
**Task ID**: WIRE-ESPACE
**Date**: session 2025

## Goal
Brancher tous les boutons/formulaires des pages espace +(vitrine) sur les API routes CRUD qui viennent d'être créées (POST /api/dossiers, PUT /api/dossiers/[id], POST /api/dossiers/[id]/pieces, PUT /api/profile/password, GET /api/attestations/[dossierId], PUT /api/messages/read, POST /api/contact). Conserver 100% de l'UI existante — ne changer que le data-flow.

## Work Log

### 1. /espace/dossier/page.tsx — Création + soumission de dossier
- Ajouté `useRouter` (next/navigation) pour la redirection après soumission.
- Ajouté 3 nouveaux states : `creatingDossier`, `submitting`, `togglingPiece`.
- Ajouté `goNext()` asynchrone : sur step 1 si pas de `existingDossier`, POST /api/dossiers avec `{ universiteId, formationId }`, stocke le dossier créé dans `existingDossier`, synchronise les pièces locales depuis la réponse (créées côté serveur avec statut "manquante"), affiche un toast avec la référence, puis passe à step 2. Si `existingDossier` existe déjà, passe simplement au step suivant.
- Réécrit `togglePiece()` asynchrone : update optimiste du state local, puis POST `/api/dossiers/${dossierId}/pieces` avec `{ libelle, statut, nomFichier, taille }` (nomFichier/taille envoyés seulement pour `televersee`/`validee`). En cas d'échec, revert du state local + toast.error.
- Réécrit `submit()` asynchrone : PUT `/api/dossiers/${dossierId}` avec `{ info, pieces }` (info mappée depuis `info.{prenom,nom,tel,nationalite,naissance,adresse}`, pieces mappées depuis `allPieces` + state local). Toast succès + `router.push("/espace")`.
- Bouton "Étape suivante" : appelle `goNext()`, disabled pendant `creatingDossier`, affiche Loader2 + "Création du dossier…" pendant la création.
- Bouton "Soumettre mon dossier" : disabled si `!canSubmit || submitting`, affiche Loader2 + "Soumission…" pendant la soumission.
- Composant `UploadZone` : ajouté prop optionnelle `loading` qui désactive le bouton et affiche Loader2 à la place de l'icône pendant que `togglePiece` est en flight.

### 2. /espace/profil/page.tsx — Changement de mot de passe
- Ajouté state `password` ({ current, next, confirm }) + `savingPassword`.
- Ajouté `changePassword()` asynchrone : validation côté client (3 champs renseignés, newPassword ≥ 8 caractères, newPassword === confirm), puis PUT /api/profile/password avec `{ currentPassword, newPassword }`. Toast succès + reset des 3 champs, toast.error avec `data.error` sinon.
- Les 3 inputs du tab "Sécurité" sont maintenant contrôlés (value + onChange) avec `autoComplete` approprié (current-password / new-password).
- Bouton "Mettre à jour" appelle `changePassword()` (et non plus `save("Sécurité")`), disabled pendant `savingPassword`, affiche Loader2 + "Mise à jour…".

### 3. /espace/messages/page.tsx — Mark as read
- Dans le `useEffect` qui fetch la conversation, après `setConversation(data)`, si `data.nonLusCandidat > 0` : lance un fetch PUT /api/messages/read avec `{ dossierId }`. En cas de succès, met à jour `conversation.nonLusCandidat = 0` en local. En cas d'échec, log via `console.error` (comportement existant préservé).
- Le badge "non lus" dans la sidebar se met donc à jour automatiquement à 0 après ouverture de la conversation.

### 4. /(vitrine)/contact/page.tsx — Submit form to API
- Réécrit `onSubmit()` asynchrone : remplace le `window.setTimeout` mock par fetch POST /api/contact.
- Le champ `telephone` est supprimé du payload s'il est vide (pour éviter de persister "" au lieu de null côté DB).
- Toast succès + reset form + reset errors si `res.ok`. Toast.error avec `data.error || "L'envoi a échoué. Réessayez."` sinon.
- Try/catch global pour les erreurs réseau.

### 5. /espace/attestation/page.tsx — Fetch real attestation
- Ajouté type `Attestation` + state `attestation`.
- Dans le `useEffect` initial, après `setDossier(d)`, si `d?.id` existe : fetch asynchrone `/api/attestations/${d.id}`. Si 200, stocke l'attestation réelle dans le state. 404 (dossier pas encore en état ATTESTATION) est ignoré silencieusement.
- `referenceAtt` et `codeVerification` utilisent prioritairement les valeurs de la DB (`attestation.reference` / `attestation.codeVerification`) si elles existent, fallback sur les valeurs générées localement (comportement précédent) pour l'aperçu.
- `emissionDate` utilise prioritairement `attestation.dateEmission` (DateTime ISO depuis DB), puis l'entrée d'historique ATTESTATION, puis la date du jour.

## Verification

### Lint
```
$ bun run lint
$ eslint .
# (no output = 0 erreur, 0 warning)
```

### Routes (curl)
- `GET /espace/dossier` (avec cookies candidat authentifié) → 200
- `GET /contact` (public) → 200
- `POST /api/contact` → 201 `{"success":true,"id":N}` (testé avec payload valide)

### Dev log
Toutes les routes câblées apparaissent dans `dev.log` avec des codes de succès :
- `POST /api/dossiers 201` (création de dossier)
- `POST /api/dossiers/[id]/pieces 200` (toggle de pièce)
- `PUT /api/dossiers/[id] 200` (soumission de dossier)
- `PUT /api/profile/password 200` (changement de mot de passe)
- `PUT /api/messages/read 200` (marquer comme lu)
- `GET /api/attestations/[id] 200` (attestation réelle fetchée)
- `POST /api/contact 201` (formulaire de contact)

Aucune erreur runtime, aucune erreur de compilation.

## Stage Summary
- 5 pages câblées sur les API CRUD réelles : /espace/dossier, /espace/profil, /espace/messages, /(vitrine)/contact, /espace/attestation.
- Toutes les opérations async ont des états de chargement (Loader2) et des gestionnaires d'erreur (toast.error avec description).
- UI 100% préservée : aucun changement de style, layout, copy, ou de structure. Seul le data-flow a changé.
- Aucune route API modifiée — toutes les routes CRUD existantes ont été consommées telles quelles.
- Lint : 0 erreur. Runtime : 0 erreur. Routes : 200.
