-- À exécuter UNE FOIS en tant que postgres (SQL Editor Supabase / MCP),
-- si Prisma migrate échoue avec : must be owner of table ...
-- Rôle applicatif attendu : getadm_app (DIRECT_URL / DATABASE_URL)

GRANT USAGE, CREATE ON SCHEMA public TO getadm_app;

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT n.nspname, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND pg_get_userbyid(c.relowner) <> 'getadm_app'
    ORDER BY c.relname
  LOOP
    EXECUTE format('ALTER TABLE %I.%I OWNER TO getadm_app', rec.nspname, rec.relname);
  END LOOP;

  FOR rec IN
    SELECT n.nspname, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'S'
      AND pg_get_userbyid(c.relowner) <> 'getadm_app'
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.objid = c.oid AND d.deptype = 'a'
      )
  LOOP
    EXECUTE format('ALTER SEQUENCE %I.%I OWNER TO getadm_app', rec.nspname, rec.relname);
  END LOOP;

  FOR rec IN
    SELECT n.nspname, c.relname, c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('v', 'm')
      AND pg_get_userbyid(c.relowner) <> 'getadm_app'
  LOOP
    IF rec.relkind = 'v' THEN
      EXECUTE format('ALTER VIEW %I.%I OWNER TO getadm_app', rec.nspname, rec.relname);
    ELSE
      EXECUTE format('ALTER MATERIALIZED VIEW %I.%I OWNER TO getadm_app', rec.nspname, rec.relname);
    END IF;
  END LOOP;

  FOR rec IN
    SELECT n.nspname, t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typtype = 'e'
      AND pg_get_userbyid(t.typowner) <> 'getadm_app'
  LOOP
    EXECUTE format('ALTER TYPE %I.%I OWNER TO getadm_app', rec.nspname, rec.typname);
  END LOOP;
END $$;

ALTER DEFAULT PRIVILEGES FOR ROLE getadm_app IN SCHEMA public
  GRANT ALL ON TABLES TO getadm_app;
ALTER DEFAULT PRIVILEGES FOR ROLE getadm_app IN SCHEMA public
  GRANT ALL ON SEQUENCES TO getadm_app;
