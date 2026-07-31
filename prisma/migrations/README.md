# Migrations Prisma (Postgres / Supabase)

Source de vérité du schéma : `prisma/schema.prisma` (provider `postgresql`).

- `20260731142000_init_postgres` — baseline tables + enums + indexes + FKs
- Appliquer sur une DB vide : `npx prisma migrate deploy` (nécessite `DATABASE_URL` + `DIRECT_URL`)

L’ancienne note SQLite / `db push` est obsolète.
