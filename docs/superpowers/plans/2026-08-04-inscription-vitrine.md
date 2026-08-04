# Refonte `/inscription` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aligner `/inscription` sur le pattern visuel du hero vitrine (fond campus, tokens sémantiques, MotionButton) en page autonome avec thème clair/sombre.

**Architecture:** Un seul fichier page client encapsulé dans `VitrineThemeProvider`. Fond type `HomeHero` + panneau `glass-card` centré. Logique métier (register, signIn, callback, nationalités) conservée ; carrousel campus retiré.

**Tech Stack:** Next.js App Router, React client, Framer Motion, `VitrineThemeProvider`, `ThemeToggle`, `MotionButton`, tokens CSS (`background` / `foreground` / `primary` / `border`).

## Global Constraints

- Page autonome : pas de `SiteHeader` / `SiteFooter`
- Thème : même `VitrineThemeProvider` + `ThemeToggle` que la vitrine
- Ne pas casser `POST /api/register`, `signIn`, `callbackUrl`, bannière destination
- Tokens sémantiques (pas de `bg-blanc` + `text-encre` sans dark variants)
- Respect `prefers-reduced-motion` via `useReducedMotion` / `motionSafeVariants`
- Pas de commit sauf demande explicite utilisateur

## File map

| Fichier | Rôle |
|---------|------|
| `src/app/inscription/page.tsx` | Refonte complète UI (seul fichier code) |
| Spec | `docs/superpowers/specs/2026-08-04-inscription-vitrine-design.md` |
| Plan | ce fichier |

---

### Task 1: Remplacer le shell UI de `/inscription`

**Files:**
- Modify: `src/app/inscription/page.tsx`

**Interfaces:**
- Consumes: `VitrineThemeProvider`, `ThemeToggle`, `MotionButton`, `BrandLogo`, `fadeInUp`, `motionSafeVariants` from `@/lib/animations`
- Produces: page renderable à `/inscription` avec thème + formulaire fonctionnel

- [x] **Step 1: Purger le carrousel et les constantes associées**

Supprimer de `page.tsx` :
- `CAMPUS_AFRIQUE`, `SLIDE_MS`
- state `campusIndex`, `paused`
- effets intervalle carrousel
- imports inutiles : `AnimatePresence` (si plus besoin hors strength bar — **garder** `AnimatePresence` pour la barre de solidité MDP), `MapPin`, `Check`, `Sparkles` si non réutilisés ; réintroduire `Sparkles` pour l’eyebrow si souhaité
- sections JSX colonne gauche cinema + thumbnails

Conserver :
- helpers `passwordStrength`, `safeCallback`, `parseDossierCallback`
- state formulaire + validation + `onSubmit`
- fetch nationalités + destination
- `fieldClass` → le réécrire (étape 2)

- [x] **Step 2: Implémenter le nouveau layout**

Structure cible du `return` de `InscriptionInner` :

```tsx
return (
  <VitrineThemeProvider>
    <div className="relative flex min-h-dvh flex-col bg-background text-foreground">
      {/* Fond type HomeHero */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Image
          src="/images/campus-sorbonne.jpg"
          alt=""
          fill
          priority
          className="object-cover opacity-25"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
        <div className="glow-primary absolute -left-24 top-10 h-80 w-80 blur-3xl" />
        <div className="glow-primary absolute -right-16 bottom-0 h-72 w-72 opacity-60 blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" …>
          <BrandLogo height={48} priority />
        </Link>
        <ThemeToggle />
      </div>

      {/* Panneau */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 pb-12 pt-2 sm:px-6">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={motionSafeVariants(reduce, fadeInUp)}
          className="glass-card w-full max-w-md rounded-xl p-6 shadow-lg sm:p-8"
        >
          {/* eyebrow, titre, destination, form, lien connexion */}
        </motion.div>
      </div>
    </div>
  </VitrineThemeProvider>
);
```

Wrappers :
- `InscriptionPage` fallback Suspense : `bg-background` + spinner `text-primary` (plus `bg-encre` / `text-or`)

Imports à ajouter :
```tsx
import { VitrineThemeProvider } from "@/components/site/vitrine-theme-provider";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { MotionButton } from "@/components/site/motion-button";
import { fadeInUp, motionSafeVariants } from "@/lib/animations";
```

- [x] **Step 3: Restyler formulaire + CTA**

`fieldClass` :
```ts
const fieldClass =
  "h-12 rounded-md border-border bg-background text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";
```

Labels : `text-foreground`  
Textes secondaires : `text-muted-foreground`  
Eyebrow : classes type hero — `font-mono text-[11px] uppercase tracking-eyebrow text-primary`  
Titre : `font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl`  
Select / checkbox : tokens `border-border`, `bg-background`, checked `bg-primary`  
Erreur bordure : `border-destructive` ou `border-carmin` (existant OK)  

CTA submit : remplacer `Button` plein custom par :
```tsx
<MotionButton type="submit" size="lg" className="w-full" disabled={loading}>
  …
</MotionButton>
```

Lien connexion : texte `text-primary` underline hover, ou `MotionButton variant="outline"` compact selon place.

Bannière destination :
```tsx
className="mt-5 flex … rounded-lg border border-primary/25 bg-primary/10 px-3.5 py-3"
```

Solidité MDP : conserver barres ; tons `bg-destructive` / `bg-ambre` / `bg-primary` / `bg-primary` pour fort (éviter `bg-or` ambigu).

- [x] **Step 4: Vérifier manuellement**

Run: démarrer / ouvrir `http://localhost:3000/inscription`

Checklist :
- Dark par défaut (ou dernière préférence vitrine) : contraste panneau + CTA
- Toggle → light : champs lisibles
- Mobile resize : scroll OK
- Submit invalide : toasts + FieldError
- (si possible) register → redirect `/espace`
- URL avec `callbackUrl=/espace/dossier?universite=…` : bannière destination

Expected: UI alignée hero, pas de régression flux.

- [x] **Step 5: Lint rapide**

Run: vérifier absence d’imports morts / erreurs TS sur `page.tsx`.

---

## Spec coverage (self-review)

| Exigence spec | Task |
|---------------|------|
| Fond hero campus + glows | Task 1 Step 2 |
| Tokens sémantiques | Task 1 Step 3 |
| Glass panel + copy | Task 1 Step 2–3 |
| ThemeProvider + Toggle | Task 1 Step 2 |
| Pas header/footer | Task 1 (structure) |
| Supprimer carrousel | Task 1 Step 1 |
| Métier inchangé | Task 1 (conserve handlers) |
| Motion réduit | Task 1 Step 2 (`motionSafeVariants`) |
| Hors scope connexion | — |
