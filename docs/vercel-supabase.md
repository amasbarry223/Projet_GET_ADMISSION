# Déploiement Vercel + Supabase (Postgres)

## Variables d’environnement (Production et Preview)

| Variable | Où la trouver | Exemple / notes |
|---|---|---|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string → **Transaction** (port **6543**) | `postgresql://postgres.bmkvwgrpgntpvkngcfku:[PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Même écran → **Session** ou **Direct** (port **5432**) | `postgresql://postgres.bmkvwgrpgntpvkngcfku:[PASSWORD]@db.bmkvwgrpgntpvkngcfku.supabase.co:5432/postgres` |
| `NEXTAUTH_SECRET` | Générer une chaîne aléatoire longue | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL publique du site | `https://ton-app.vercel.app` |

Projet Supabase : [`bmkvwgrpgntpvkngcfku`](https://supabase.com/dashboard/project/bmkvwgrpgntpvkngcfku) (région `eu-west-3`).

## Build

- Commande : `npm run build` → `scripts/vercel-build.js` (`prisma generate` + `next build`)
- **Sans** `DATABASE_URL`, le build échoue volontairement (plus de fallback SQLite)

## Local

1. Copier `.env.example` → `.env`
2. Remplacer `[PASSWORD]` par le mot de passe database Supabase
3. `npx prisma migrate deploy`
4. `npm run db:seed:all`
5. `npm run dev`

## Architecture

- **Prisma** = ORM / migrations / seeds
- **Supabase** = Postgres hébergé (pooler pour le runtime Vercel)
- **NextAuth** inchangé (Credentials + JWT)

## Sécurité (RLS)

L’app accède à Postgres **uniquement via Prisma** (connection string serveur), pas via la clé `anon` Supabase. Les tables ont été créées sans RLS (usage ORM classique).

Si tu actives plus tard le client Supabase côté navigateur, active RLS + policies — sinon les tables seraient exposées avec la clé `anon`. En attendant, révoque les droits `anon` / `authenticated` sur `public` (déjà appliqué une fois via MCP) et ne commit jamais le mot de passe DB.

## Seed

Les données de démo (users, universités, contenus) ont déjà été importées sur le projet `bmkvwgrpgntpvkngcfku`. Relancer `npm run db:seed:all` seulement après avoir mis le vrai mot de passe dans `.env` (upserts idempotents pour la plupart des entrées).
