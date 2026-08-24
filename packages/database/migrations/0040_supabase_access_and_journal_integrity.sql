-- RoboWorkPool uses its authenticated API as the client authorization boundary.
-- No public-schema application object is called directly by browser Supabase clients.
-- Keep the objects in public for compatibility, but make that boundary explicit.

CREATE TABLE database_object_access_classification (
  schema_name text NOT NULL,
  object_name text NOT NULL,
  object_kind text NOT NULL CHECK (object_kind IN ('TABLE','PARTITIONED_TABLE','VIEW','MATERIALIZED_VIEW','SEQUENCE','FUNCTION')),
  access_classification text NOT NULL CHECK (access_classification IN ('CLIENT','SERVER_ONLY')),
  client_roles text[] NOT NULL DEFAULT '{}',
  read_policy text NOT NULL,
  write_policy text NOT NULL,
  organization_scope text NOT NULL,
  notes text NOT NULL,
  classified_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (schema_name, object_name, object_kind)
);

-- Tables remain available to their owner/backend database role. RLS plus explicit
-- privilege revocation prevents PostgREST/GraphQL access by browser JWT roles.
DO $access_control$
DECLARE object_record record;
BEGIN
  FOR object_record IN
    SELECT c.oid, n.nspname AS schema_name, c.relname AS object_name, c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r','p','v','m','S')
    ORDER BY c.relkind, c.relname
  LOOP
    IF object_record.relkind IN ('r','p') THEN
      EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', object_record.schema_name, object_record.object_name);
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM PUBLIC', object_record.schema_name, object_record.object_name);
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM anon', object_record.schema_name, object_record.object_name);
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM authenticated', object_record.schema_name, object_record.object_name);
      END IF;
    ELSIF object_record.relkind IN ('v','m') THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM PUBLIC', object_record.schema_name, object_record.object_name);
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM anon', object_record.schema_name, object_record.object_name);
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM authenticated', object_record.schema_name, object_record.object_name);
      END IF;
    ELSE
      EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE %I.%I FROM PUBLIC', object_record.schema_name, object_record.object_name);
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE %I.%I FROM anon', object_record.schema_name, object_record.object_name);
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE %I.%I FROM authenticated', object_record.schema_name, object_record.object_name);
      END IF;
    END IF;

    INSERT INTO database_object_access_classification(
      schema_name, object_name, object_kind, access_classification, client_roles,
      read_policy, write_policy, organization_scope, notes
    ) VALUES (
      object_record.schema_name,
      object_record.object_name,
      CASE object_record.relkind WHEN 'r' THEN 'TABLE' WHEN 'p' THEN 'PARTITIONED_TABLE'
        WHEN 'v' THEN 'VIEW' WHEN 'm' THEN 'MATERIALIZED_VIEW' ELSE 'SEQUENCE' END,
      'SERVER_ONLY', '{}', 'Backend API authorization only', 'Backend API authorization only',
      'Enforced by RoboWorkPool API authorization services',
      'RLS/revocation is defense in depth; no direct browser Data API access'
    ) ON CONFLICT (schema_name, object_name, object_kind) DO UPDATE SET
      access_classification = EXCLUDED.access_classification,
      client_roles = EXCLUDED.client_roles,
      read_policy = EXCLUDED.read_policy,
      write_policy = EXCLUDED.write_policy,
      organization_scope = EXCLUDED.organization_scope,
      notes = EXCLUDED.notes,
      classified_at = now();
  END LOOP;
END
$access_control$;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. Remove that
-- implicit RPC surface from existing functions and from functions created later.
DO $function_access$
DECLARE function_record record;
BEGIN
  FOR function_record IN
    SELECT p.oid, n.nspname AS schema_name, p.proname AS object_name,
           p.oid::regprocedure AS function_identity
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
    ORDER BY p.proname, p.oid
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', function_record.function_identity);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', function_record.function_identity);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', function_record.function_identity);
    END IF;
    INSERT INTO database_object_access_classification(
      schema_name, object_name, object_kind, access_classification, client_roles,
      read_policy, write_policy, organization_scope, notes
    ) VALUES (
      function_record.schema_name, function_record.function_identity::text, 'FUNCTION',
      'SERVER_ONLY', '{}', 'No browser RPC execution', 'No browser RPC execution',
      'Backend/database-owner only', 'Trigger and service functions are not public RPCs'
    ) ON CONFLICT (schema_name, object_name, object_kind) DO NOTHING;
  END LOOP;
END
$function_access$;

-- Safe defaults for objects created by the same migration owner in the future.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
DO $default_client_privileges$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM anon';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM authenticated';
  END IF;
END
$default_client_privileges$;

-- Keep every RoboWorkPool-managed Storage bucket private. The backend issues
-- authorized upload/download operations; no anonymous object policy is created.
DO $storage_security$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    UPDATE storage.buckets
    SET public = false
    WHERE id IN ('training-data-private','manufacturer-documents-private','contract-documents-private');
  END IF;
END
$storage_security$;

-- A journal must be assembled as draft and posted through the one controlled
-- draft -> posted transition used by the financial services.
CREATE OR REPLACE FUNCTION reject_direct_posted_journal_insert() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'posted' THEN
    RAISE EXCEPTION 'journal entries must be inserted in a pre-posted state and posted through the controlled transition';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER journal_entry_reject_direct_posted_insert
BEFORE INSERT ON journal_entries
FOR EACH ROW EXECUTE FUNCTION reject_direct_posted_journal_insert();

-- Lock journal parents before any line mutation. This serializes posting against
-- concurrent inserts and also handles a line being moved between two journals.
CREATE OR REPLACE FUNCTION protect_posted_journal_lines() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE parent_record record;
BEGIN
  FOR parent_record IN
    SELECT id, status
    FROM journal_entries
    WHERE id IN (
      CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN OLD.journal_entry_id ELSE NULL END,
      CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN NEW.journal_entry_id ELSE NULL END
    )
    ORDER BY id
    FOR UPDATE
  LOOP
    IF parent_record.status = 'posted' THEN
      RAISE EXCEPTION 'posted journal lines are immutable';
    END IF;
  END LOOP;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posted_journal_lines_immutable ON journal_lines;
CREATE TRIGGER posted_journal_lines_immutable
BEFORE INSERT OR UPDATE OR DELETE ON journal_lines
FOR EACH ROW EXECUTE FUNCTION protect_posted_journal_lines();

