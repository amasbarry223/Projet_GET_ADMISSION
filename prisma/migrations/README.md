# Migrations Prisma (Postgres / Supabase)

Source de vérité du schéma : `prisma/schema.prisma` (provider `postgresql`).

- `20260731142000_init_postgres` — baseline tables + enums + indexes + FKs
- Appliquer : `npx prisma migrate deploy` (nécessite `DATABASE_URL` + `DIRECT_URL`)

## Rôle DB et ownership

`migrate deploy` s’exécute via `DIRECT_URL`. Le rôle de cette URL **doit être propriétaire** des tables `public` (sinon erreur Postgres `42501` / Prisma `P3018` : *must be owner of table …*).

Ce projet utilise le rôle applicatif `getadm_app`. Si les objets ont été créés par `postgres` :

1. Exécuter une fois (SQL Editor Supabase / rôle postgres) : `scripts/reassign-public-owner-to-app.sql`
2. Relancer `npx prisma migrate deploy`

Alternative : mettre le rôle `postgres` (ou `postgres.<project_ref>` sur le pooler) dans `DIRECT_URL` uniquement pour les migrations.

L’ancienne note SQLite / `db push` est obsolète.
