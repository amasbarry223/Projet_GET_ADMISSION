# Task 5 — Vitrine builder (full-stack-developer)

## Scope delivered
6 routes under route group `(vitrine)`:
- `/` — Accueil (7 sections, hero with boarding pass + CTA)
- `/universites` — Catalogue (filters, sort, pagination)
- `/universites/[slug]` — Détail université (server component, static-prerendered)
- `/a-propos` — Editorial page (mission, piliers, équipe, chiffres)
- `/faq` — FAQ accordion (10 Q/A in French)
- `/contact` — Contact form with client validation + sonner toast

## Files created
- `src/app/(vitrine)/layout.tsx` — SmoothScrollProvider + sticky footer
- `src/app/(vitrine)/page.tsx` — Accueil
- `src/app/(vitrine)/universites/page.tsx` — Catalogue (client)
- `src/app/(vitrine)/universites/[slug]/page.tsx` — Détail (server, generateStaticParams)
- `src/app/(vitrine)/a-propos/page.tsx`
- `src/app/(vitrine)/faq/page.tsx`
- `src/app/(vitrine)/contact/page.tsx` — client, sonner toast
- `src/components/site/universite-card.tsx` — shared card component

## Reused (no recreation)
- BoardingPass (variant="hero", animateOnMount) with DOSSIER_DEMO_CANDIDAT data
- SiteHeader, SiteFooter, SmoothScrollProvider
- Reveal, RevealStagger, RevealItem, Eyebrow
- shadcn/ui: Button, Card, Badge, Input, Label, Textarea, Select, Accordion, Table, Breadcrumb
- mock data: UNIVERSITES, formationsParUniversite, formationParId, DOSSIER_DEMO_CANDIDAT, ETATS
- format utils: formatFCFA, formatFCFACompact
- lucide-react icons

## Verification
- curl: all 6 routes → 200, /universites/unknown → 404, /inscription → 404 (expected, other agent's scope)
- agent-browser: home renders with boarding pass + visa stamp + MRZ visible, nav works, filters apply (Pays=France → Sorbonne + Nantes), "Charger plus" loads remaining 2, accordion FAQ toggles single-collapsible, contact form: empty submit → toast error + inline errors, filled submit → toast success "Message envoyé"
- Lint: 0 errors on my files (4 pre-existing errors in src/lib/auth-context.tsx, src/lib/smooth-scroll.tsx, tailwind.config.ts left to previous tasks)
- No console errors after clean reload, no hydration mismatches, no dark backgrounds

## Notes for next agents
- The vitrine layout mounts SmoothScrollProvider ONCE — please don't add another instance.
- UniversiteCard is shared between home and catalogue; reuse it instead of duplicating.
- The /inscription route is referenced from many CTAs (header, hero, card hover, detail sidebar, faq sidebar, contact sidebar) — currently 404. The inscription agent must implement it.
- The /connexion route is referenced from header — also currently 404. The auth agent must implement it.
- Detail page uses `generateStaticParams` for SSG of all 10 university slugs; no DB needed.
- All formatting is fr-FR (FCFA, dates "JJ mois AAAA"). Keep the convention.
