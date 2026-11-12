-- REVIEW ONLY. Do not apply in CI/CD step 4.
-- Existing Commerce, Operations and Experience tables were introspected. This repo does
-- not contain their Prisma migrations, and their live owner has not been queried.
-- service-roles.sql grants DML without taking ownership. ALTER and DROP of those
-- existing objects still require the current owner, expected to be memora.
-- Apply this file only after service-roles-review.sql shows every object in the
-- service schemas is owned by memora and no foreign key leaves the owning service.
-- It does not touch schema iam.

BEGIN;

DO $$
DECLARE
  service_schemas text[] := ARRAY[
    'catalog', 'pricing', 'inventory', 'design', 'ordering',
    'personalization', 'production', 'fulfillment', 'after_sales',
    'memory', 'platform'
  ];
  wrong_owners integer;
BEGIN
  IF current_database() <> 'memora' THEN
    RAISE EXCEPTION 'connect to database memora before changing ownership';
  END IF;

  IF NOT (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) THEN
    RAISE EXCEPTION 'ownership transfer must run as the bootstrap superuser';
  END IF;

  IF current_setting('memora.confirm_ownership_transfer', true) IS DISTINCT FROM 'YES' THEN
    RAISE EXCEPTION 'set memora.confirm_ownership_transfer=YES for this session before applying';
  END IF;

  SELECT count(*)
  INTO wrong_owners
  FROM (
    SELECT n.nspowner AS owner_oid
    FROM pg_namespace n
    WHERE n.nspname = ANY (service_schemas)
    UNION
    SELECT c.relowner
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = ANY (service_schemas)
      AND c.relkind IN ('r', 'p', 'S', 'v', 'm')
  ) owned
  JOIN pg_roles r ON r.oid = owned.owner_oid
  WHERE r.rolname <> 'memora';

  IF wrong_owners > 0 THEN
    RAISE EXCEPTION 'refusing ownership transfer because an object is not owned by memora';
  END IF;

  IF (
    SELECT count(*)
    FROM pg_roles
    WHERE rolname IN (
      'commerce_migrate',
      'operations_migrate',
      'experience_migrate'
    )
      AND NOT rolsuper
      AND rolcanlogin
  ) <> 3 THEN
    RAISE EXCEPTION 'apply service-roles.sql before transferring ownership';
  END IF;
END
$$;

DO $$
DECLARE
  object_name text;
  object_kind "char";
  schema_name text;
  target_role text;
BEGIN
  FOR schema_name, target_role IN
    SELECT *
    FROM (
      VALUES
        ('catalog', 'commerce_migrate'),
        ('pricing', 'commerce_migrate'),
        ('inventory', 'commerce_migrate'),
        ('design', 'commerce_migrate'),
        ('ordering', 'commerce_migrate'),
        ('personalization', 'operations_migrate'),
        ('production', 'operations_migrate'),
        ('fulfillment', 'operations_migrate'),
        ('after_sales', 'operations_migrate'),
        ('memory', 'experience_migrate'),
        ('platform', 'experience_migrate')
    ) AS owned (schema_name, target_role)
  LOOP
    EXECUTE format('ALTER SCHEMA %I OWNER TO %I', schema_name, target_role);
    FOR object_name, object_kind IN
      SELECT c.relname, c.relkind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = schema_name
        AND c.relkind IN ('r', 'p', 'S', 'v', 'm')
    LOOP
      IF object_kind = 'S' THEN
        EXECUTE format(
          'ALTER SEQUENCE %I.%I OWNER TO %I',
          schema_name,
          object_name,
          target_role
        );
      ELSE
        EXECUTE format(
          'ALTER TABLE %I.%I OWNER TO %I',
          schema_name,
          object_name,
          target_role
        );
      END IF;
    END LOOP;
  END LOOP;
END
$$;

COMMIT;
