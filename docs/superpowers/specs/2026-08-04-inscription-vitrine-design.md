# Design — Refonte `/inscription` (alignement vitrine)

**Date :** 2026-08-04  
**Statut :** validé (conversation) — en attente relecture utilisateur avant plan d’implémentation  
**Page :** `http://localhost:3000/inscription`  
**Référence visuelle :** espace public `/` (hero, tokens, boutons)

---

## Objectif

Aligner la page d’inscription candidat sur le design pattern de la vitrine publique : même ambiance atmosphérique, typographie, tokens sémantiques et boutons — sans intégrer le shell header/footer.

**Critères de succès**

- Sensation visuelle proche du hero d’accueil (fond campus, dégradé, glows)
- Contraste lisible en dark **et** light
- Formulaire usable sur mobile
- Logique métier inchangée (API register, signIn, callbackUrl, destination dossier)

---

## Décisions actées

| Sujet | Choix |
|--------|--------|
| Scope | Refonte complète visuelle (fond, titres, champs, CTA) |
| Shell | Autonome — pas de `SiteHeader` / `SiteFooter` |
| Layout | Fond type hero + panneau formulaire glass centré |
| Thème | `VitrineThemeProvider` + `ThemeToggle` (même clé localStorage que la vitrine) |
| Carrousel campus | Supprimé (trop lourd vs hero) |
| `/connexion` | Hors scope |

---

## Architecture UI

```
InscriptionPage
├── VitrineThemeProvider
│   └── min-h-dvh relative
│       ├── Background (Image campus + gradients + glow-primary)
│       ├── Top bar (Logo → / · ThemeToggle)
│       └── Form panel (glass / border-border)
│           ├── Eyebrow + titre + sous-texte
│           ├── Destination banner (si callback dossier)
│           ├── Formulaire (logique existante)
│           └── Lien « Se connecter »
```

### Fond (pattern hero)

Réutiliser le même vocabulaire que `HomeHero` :

- Image : `/images/campus-sorbonne.jpg` (ou équivalent déjà utilisé sur l’accueil)
- Overlay : `bg-gradient-to-b from-background via-background/90 to-background`
- Accents : `glow-primary` (2 blobs)
- Couleurs via tokens : `background`, `foreground`, `primary`, `border`, `muted-foreground`

### Top bar

- `BrandLogo` vers `/`
- `ThemeToggle` aligné à droite
- Pas de navigation complète

### Panneau formulaire

- Centré horizontalement et verticalement (`max-w-md`)
- Conteneur type `glass-card` ou `rounded-xl border border-border bg-card/80 backdrop-blur`
- Eyebrow mono : « Compte candidat »
- Titre display : « Créer mon compte »
- Sous-texte : inscription courte, accès espace dossier
- Banniere destination : conserver le comportement actuel si `callbackUrl` pointe vers `/espace/dossier?...`
- Champs : prénom, nom, email, nationalité, mot de passe, confirmation, consentement
- Indicateur solidité MDP : conserver
- CTA : `MotionButton` variant default / primary, full width
- Lien secondaire outline ou texte vers `/connexion` (+ `callbackUrl` préservé)

### Motion

- Fade-up du panneau au mount
- Respect `useReducedMotion`
- Supprimer : carrousel `CAMPUS_AFRIQUE`, Ken Burns, barre de progression, thumbnails

---

## Comportement métier (inchangé)

Conserver dans `src/app/inscription/page.tsx` (ou extrait hors UI si découpage) :

- `safeCallback` / `parseDossierCallback`
- Fetch nationalités `/api/public/nationalites`
- Fetch destination `/api/universites/:id` si université dans callback
- Validation client existante
- `POST /api/register` puis `signIn("credentials", { portal: "candidat" })`
- Redirection `/espace` ou `callbackUrl` espace
- Toasts d’erreur / succès existants

---

## Fichiers touchés

| Fichier | Action |
|---------|--------|
| `src/app/inscription/page.tsx` | Refonte JSX/styles ; purge carousel ; wrap thème |
| `docs/superpowers/specs/2026-08-04-inscription-vitrine-design.md` | Spec (ce document) |

Pas de changement API, Prisma, ni layout `(vitrine)`.

Possibles imports réutilisés : `VitrineThemeProvider`, `ThemeToggle`, `MotionButton`, `BrandLogo`, `fadeInUp` / `motionSafeVariants`, composants UI existants.

---

## Dark / light

- Ne plus utiliser de couleurs figées type `bg-blanc` + `text-encre` sans variants dark
- Champs : `bg-background` / `border-border` / `text-foreground` / placeholders `text-muted-foreground`
- Outline / liens : contraste suffisant en dark (même logique que correctif `MotionButton` outline)

---

## Hors scope

- Refonte `/connexion` et `/verification-otp`
- Intégration dans `(vitrine)/layout.tsx`
- Changement des champs ou du flux d’inscription
- Nouveaux endpoints

---

## Risques & mitigations

| Risque | Mitigation |
|--------|------------|
| Flash de thème hors vitrine | Script anti-FOUC déjà dans `VitrineThemeProvider` |
| Nettoyage thème au leave | Cleanup existant du provider au unmount |
| Panel trop bas sur mobile avec clavier | Padding vertical + scroll naturel (`min-h-dvh`, pas de `overflow-hidden` sur body) |

---

## Plan de test manuel

- [ ] `/inscription` dark : fond + panneau + CTA lisibles
- [ ] Toggle light : champs et labels lisibles
- [ ] Mobile &lt; 640px : formulaire scrollable, CTA accessible
- [ ] Inscription valide → redirection espace
- [ ] `callbackUrl` dossier → bannière destination + redirect correcte
- [ ] Compte déjà existant → toast + lien connexion
- [ ] `prefers-reduced-motion` : pas d’animation intrusive
