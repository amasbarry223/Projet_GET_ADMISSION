# Déploiement Vercel + Supabase (Postgres + Auth OTP)

## Variables d’environnement (Production et Preview)

| Variable | Où la trouver | Exemple / notes |
|---|---|---|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string → **Transaction** (port **6543**) | `postgresql://postgres.bmkvwgrpgntpvkngcfku:[PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Même écran → **Session** ou **Direct** (port **5432**) | `postgresql://postgres.bmkvwgrpgntpvkngcfku:[PASSWORD]@db.bmkvwgrpgntpvkngcfku.supabase.co:5432/postgres` |
| `NEXTAUTH_SECRET` | Générer une chaîne aléatoire longue | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL publique du site | `https://ton-app.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API / Connect | `https://bmkvwgrpgntpvkngcfku.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API Keys → **anon** ou **publishable** | clé publique navigateur |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API Keys → **service_role** / secret | **jamais** en `NEXT_PUBLIC_*` |

Projet Supabase : [`bmkvwgrpgntpvkngcfku`](https://supabase.com/dashboard/project/bmkvwgrpgntpvkngcfku) (région `eu-west-3`).

Optionnel (mails métier paiements / workflow, **pas** pour l’auth candidats) : `RESEND_API_KEY`, `MAIL_FROM`.

## Auth candidats (OTP e-mail, sans Resend)

### Config automatique (recommandé)

1. Connecte-toi au **compte propriétaire** du projet `bmkvwgrpgntpvkngcfku`
2. Crée un PAT : https://supabase.com/dashboard/account/tokens
3. Exécute :
   ```powershell
   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
   $env:NEXTAUTH_URL = "https://get-admission-two.vercel.app"
   node scripts/configure-supabase-auth-otp.mjs
   ```
4. Le script met à jour Site URL / redirects (et le template OTP **si** un SMTP custom est configuré)
5. Ajoute `SUPABASE_SERVICE_ROLE_KEY` dans `.env` et Vercel (Production + Preview)

> **Free tier** : sans SMTP custom, Supabase refuse de modifier le template e-mail (code `{{ .Token }}`).  
> Dans ce cas l’app utilise le **lien magique** (clic dans l’e-mail → `/auth/callback`).  
> Pour un vrai code OTP à 6 chiffres : configure un SMTP (ex. Resend SMTP) dans  
> Authentication → SMTP, puis relance le script ou colle le template manuellement.

### Config manuelle

1. Dashboard → **Authentication → Email Templates → Magic Link** (nécessite SMTP custom en free tier) :
   ```html
   <h2>Votre code GET Admission</h2>
   <p>Entrez ce code : <strong>{{ .Token }}</strong></p>
   ```
2. **Authentication → URL Configuration**  
   - Site URL : `https://get-admission-two.vercel.app`
   - Redirect URLs : `https://get-admission-two.vercel.app/**`, `http://localhost:3000/**`
3. Flux app :
   - Inscription `/inscription` → e-mail Supabase → lien `/auth/callback` ou code `/verification-otp` → bridge NextAuth
   - Connexion candidat : OTP / magic link  
   - Staff / back-office : NextAuth Credentials (mot de passe) inchangé

## Build

- Commande : `npm run build` → `scripts/vercel-build.js` (`prisma generate` + `next build`)
- **Sans** `DATABASE_URL`, le build échoue volontairement (plus de fallback SQLite)

## Local

1. Copier `.env.example` → `.env`
2. Remplir Postgres + clés Supabase Auth + `NEXTAUTH_SECRET`
3. Si `DIRECT_URL` utilise un rôle app (`getadm_app`) et que les tables sont encore owned by `postgres` : exécuter `scripts/reassign-public-owner-to-app.sql` (SQL Editor Supabase)
4. `npx prisma migrate deploy`
5. `npm run db:seed:all` (optionnel)
6. `npm run dev`

## Architecture

- **Prisma** = ORM / migrations / données métier (`User`, dossiers…)
- **Supabase** = Postgres hébergé + **Auth Email OTP** (envoi du code)
- **NextAuth** = session JWT applicative (`/espace`, `/admin`) après bridge OTP pour les candidats

## Sécurité (RLS)

L’app accède à Postgres **uniquement via Prisma** (connection string serveur) pour le métier. La clé `anon` sert uniquement à Supabase Auth (OTP) côté navigateur — pas de lecture/écriture Data API sur les tables Prisma.

Ne commit jamais `SUPABASE_SERVICE_ROLE_KEY` ni le mot de passe DB.

## Seed

Les données de démo (users, universités, contenus) ont déjà été importées sur le projet `bmkvwgrpgntpvkngcfku`. Relancer `npm run db:seed:all` seulement après avoir mis le vrai mot de passe dans `.env` (upserts idempotents pour la plupart des entrées).
