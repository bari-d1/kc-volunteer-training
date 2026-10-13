-- Lock the Supabase Data API (PostgREST) out of every table in public.
--
-- All data access goes through the server via Prisma, which connects as the
-- table owner. Owners bypass RLS and keep their privileges, so Prisma is
-- unaffected. Supabase's anon and authenticated roles get nothing.

-- 1. Enable RLS with no policies: any query through the API sees zero rows,
--    even if a privilege is granted later by mistake.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- 2. Revoke the privileges Supabase grants its API roles by default, on the
--    existing tables and on anything this role creates in public later.
--    Guarded so the migration also runs on plain Postgres (CI, shadow DB),
--    where these roles don't exist.
DO $$
DECLARE
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
    END IF;
  END LOOP;
END $$;
