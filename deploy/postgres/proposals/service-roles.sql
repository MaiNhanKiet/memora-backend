-- REVIEW ONLY. CI/CD step 4 does not execute this file.
-- Connect to database memora as the bootstrap superuser that owns the service schemas.
-- deploy/infra/compose.yaml defaults that user to memora. This script stops if the
-- live owner is different. It does not remove existing grants and does not change owners.
-- Set passwords from the secret store after review. Do not put passwords in this file.
--
-- Runtime roles: commerce_app, operations_app, experience_app.
-- Migration roles: commerce_migrate, operations_migrate, experience_migrate.
-- Migration roles can create new objects in their schemas. They cannot ALTER or DROP
-- existing objects until ownership is reviewed in service-roles-ownership.sql.

BEGIN;

DO $$
DECLARE
  commerce_schemas text[] := ARRAY['catalog', 'pricing', 'inventory', 'design', 'ordering'];
  operations_schemas text[] := ARRAY['personalization', 'production', 'fulfillment', 'after_sales'];
  experience_schemas text[] := ARRAY['memory', 'platform'];
  service_schemas text[];
  foreign_keys integer;
  wrong_owners integer;
BEGIN
  IF current_database() <> 'memora' THEN
    RAISE EXCEPTION 'connect to database memora before applying service roles';
  END IF;

  IF NOT (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) THEN
    RAISE EXCEPTION 'apply as the bootstrap superuser';
  END IF;

  service_schemas := commerce_schemas || operations_schemas || experience_schemas;

  IF (
    SELECT count(*)
    FROM pg_namespace
    WHERE nspname = ANY (service_schemas)
  ) <> cardinality(service_schemas) THEN
    RAISE EXCEPTION 'one or more service schemas are missing; review service-roles-review.sql';
  END IF;

  SELECT count(*)
  INTO wrong_owners
  FROM pg_namespace n
  JOIN pg_roles r ON r.oid = n.nspowner
  WHERE n.nspname = ANY (service_schemas)
    AND r.rolname <> 'memora';

  IF wrong_owners > 0 THEN
    RAISE EXCEPTION 'schema owner is not memora; do not apply until ownership is reviewed';
  END IF;

  SELECT count(*)
  INTO wrong_owners
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_roles r ON r.oid = c.relowner
  WHERE n.nspname = ANY (service_schemas)
    AND c.relkind IN ('r', 'p', 'S', 'v', 'm')
    AND r.rolname <> 'memora';

  IF wrong_owners > 0 THEN
    RAISE EXCEPTION 'table or sequence owner is not memora; do not apply until ownership is reviewed';
  END IF;

  SELECT count(*)
  INTO foreign_keys
  FROM pg_constraint con
  JOIN pg_class source_table ON source_table.oid = con.conrelid
  JOIN pg_namespace source_schema ON source_schema.oid = source_table.relnamespace
  JOIN pg_class referenced_table ON referenced_table.oid = con.confrelid
  JOIN pg_namespace referenced_schema ON referenced_schema.oid = referenced_table.relnamespace
  WHERE con.contype = 'f'
    AND (
      (
        source_schema.nspname = ANY (commerce_schemas)
        AND NOT (referenced_schema.nspname = ANY (commerce_schemas))
      )
      OR (
        source_schema.nspname = ANY (operations_schemas)
        AND NOT (referenced_schema.nspname = ANY (operations_schemas))
      )
      OR (
        source_schema.nspname = ANY (experience_schemas)
        AND NOT (referenced_schema.nspname = ANY (experience_schemas))
      )
    );

  IF foreign_keys > 0 THEN
    RAISE EXCEPTION 'cross-service foreign key found; do not apply until it is reviewed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname IN (
      'commerce_app',
      'operations_app',
      'experience_app',
      'commerce_migrate',
      'operations_migrate',
      'experience_migrate'
    )
      AND rolsuper
  ) THEN
    RAISE EXCEPTION 'a proposed service role already exists as SUPERUSER';
  END IF;
END
$$;

DO $$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY[
    'commerce_app',
    'operations_app',
    'experience_app',
    'commerce_migrate',
    'operations_migrate',
    'experience_migrate'
  ]
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format(
        'CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT',
        role_name
      );
    END IF;
  END LOOP;
END
$$;

GRANT CONNECT ON DATABASE memora TO commerce_app, operations_app, experience_app;
GRANT CONNECT ON DATABASE memora TO commerce_migrate, operations_migrate, experience_migrate;

DO $$
DECLARE
  schema_name text;
BEGIN
  FOREACH schema_name IN ARRAY ARRAY['catalog', 'pricing', 'inventory', 'design', 'ordering']
  LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO commerce_app', schema_name);
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO commerce_app',
      schema_name
    );
    EXECUTE format(
      'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO commerce_app',
      schema_name
    );
    EXECUTE format('GRANT USAGE, CREATE ON SCHEMA %I TO commerce_migrate', schema_name);
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO commerce_migrate',
      schema_name
    );
    EXECUTE format(
      'GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA %I TO commerce_migrate',
      schema_name
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE memora IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO commerce_app',
      schema_name
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE memora IN SCHEMA %I GRANT USAGE, SELECT ON SEQUENCES TO commerce_app',
      schema_name
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE commerce_migrate IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO commerce_app',
      schema_name
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE commerce_migrate IN SCHEMA %I GRANT USAGE, SELECT ON SEQUENCES TO commerce_app',
      schema_name
    );
  END LOOP;

  FOREACH schema_name IN ARRAY ARRAY['personalization', 'production', 'fulfillment', 'after_sales']
  LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO operations_app', schema_name);
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO operations_app',
      schema_name
    );
    EXECUTE format(
      'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO operations_app',
      schema_name
    );
    EXECUTE format('GRANT USAGE, CREATE ON SCHEMA %I TO operations_migrate', schema_name);
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO operations_migrate',
      schema_name
    );
    EXECUTE format(
      'GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA %I TO operations_migrate',
      schema_name
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE memora IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO operations_app',
      schema_name
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE memora IN SCHEMA %I GRANT USAGE, SELECT ON SEQUENCES TO operations_app',
      schema_name
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE operations_migrate IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO operations_app',
      schema_name
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE operations_migrate IN SCHEMA %I GRANT USAGE, SELECT ON SEQUENCES TO operations_app',
      schema_name
    );
  END LOOP;

  FOREACH schema_name IN ARRAY ARRAY['memory', 'platform']
  LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO experience_app', schema_name);
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO experience_app',
      schema_name
    );
    EXECUTE format(
      'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO experience_app',
      schema_name
    );
    EXECUTE format('GRANT USAGE, CREATE ON SCHEMA %I TO experience_migrate', schema_name);
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO experience_migrate',
      schema_name
    );
    EXECUTE format(
      'GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA %I TO experience_migrate',
      schema_name
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE memora IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO experience_app',
      schema_name
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE memora IN SCHEMA %I GRANT USAGE, SELECT ON SEQUENCES TO experience_app',
      schema_name
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE experience_migrate IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO experience_app',
      schema_name
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE experience_migrate IN SCHEMA %I GRANT USAGE, SELECT ON SEQUENCES TO experience_app',
      schema_name
    );
  END LOOP;
END
$$;

COMMIT;
