-- Read-only review. CI/CD step 4 does not execute this file.
-- Do not insert, update, or delete. Run while connected to database memora.
-- Section A can run before any role is created. Section B runs after service-roles.sql.

BEGIN;
SET TRANSACTION READ ONLY;

-- A1. Role attributes. Empty before apply. After apply, rolsuper must be false.
SELECT rolname,
       rolsuper,
       rolcreatedb,
       rolcreaterole,
       rolbypassrls,
       rolinherit,
       rolcanlogin
FROM pg_roles
WHERE rolname IN (
  'memora',
  'commerce_app',
  'operations_app',
  'experience_app',
  'commerce_migrate',
  'operations_migrate',
  'experience_migrate'
)
ORDER BY rolname;

-- A2. Role membership. Runtime roles must not be members of memora or each other.
SELECT member_role.rolname AS member_name,
       granted_role.rolname AS granted_name
FROM pg_auth_members membership
JOIN pg_roles member_role ON member_role.oid = membership.member
JOIN pg_roles granted_role ON granted_role.oid = membership.roleid
WHERE member_role.rolname IN (
  'commerce_app',
  'operations_app',
  'experience_app',
  'commerce_migrate',
  'operations_migrate',
  'experience_migrate'
)
   OR granted_role.rolname IN (
     'commerce_app',
     'operations_app',
     'experience_app',
     'commerce_migrate',
     'operations_migrate',
     'experience_migrate'
   )
ORDER BY member_name, granted_name;

-- A3. Schema and object ownership. service-roles.sql expects every row to be memora.
SELECT n.nspname AS schema_name,
       'schema' AS object_kind,
       n.nspname AS object_name,
       owner_role.rolname AS owner_name
FROM pg_namespace n
JOIN pg_roles owner_role ON owner_role.oid = n.nspowner
WHERE n.nspname IN (
  'iam',
  'public',
  'catalog',
  'pricing',
  'inventory',
  'design',
  'ordering',
  'personalization',
  'production',
  'fulfillment',
  'after_sales',
  'memory',
  'platform'
)
UNION ALL
SELECT n.nspname,
       c.relkind,
       c.relname,
       owner_role.rolname
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_roles owner_role ON owner_role.oid = c.relowner
WHERE n.nspname IN (
  'catalog',
  'pricing',
  'inventory',
  'design',
  'ordering',
  'personalization',
  'production',
  'fulfillment',
  'after_sales',
  'memory',
  'platform'
)
  AND c.relkind IN ('r', 'p', 'S', 'v', 'm')
ORDER BY schema_name, object_kind, object_name;

-- A4. Privileges already granted to PUBLIC. Do not revoke these from this proposal.
SELECT n.nspname AS schema_name,
       'schema' AS object_kind,
       n.nspname AS object_name,
       COALESCE(n.nspacl::text, '(default)') AS privilege_list
FROM pg_namespace n
WHERE n.nspname IN (
  'public',
  'iam',
  'catalog',
  'pricing',
  'inventory',
  'design',
  'ordering',
  'personalization',
  'production',
  'fulfillment',
  'after_sales',
  'memory',
  'platform'
)
UNION ALL
SELECT datname,
       'database',
       datname,
       COALESCE(datacl::text, '(default)')
FROM pg_database
WHERE datname = 'memora'
ORDER BY object_kind, schema_name;

-- A5. Default privileges that would affect future tables.
SELECT owner_role.rolname AS owner_name,
       n.nspname AS schema_name,
       default_acl.defaclobjtype AS object_type,
       default_acl.defaclacl::text AS privilege_list
FROM pg_default_acl default_acl
JOIN pg_roles owner_role ON owner_role.oid = default_acl.defaclrole
LEFT JOIN pg_namespace n ON n.oid = default_acl.defaclnamespace
WHERE owner_role.rolname IN (
  'memora',
  'commerce_app',
  'operations_app',
  'experience_app',
  'commerce_migrate',
  'operations_migrate',
  'experience_migrate'
)
   OR n.nspname IN (
     'iam',
     'catalog',
     'pricing',
     'inventory',
     'design',
     'ordering',
     'personalization',
     'production',
     'fulfillment',
     'after_sales',
     'memory',
     'platform'
   )
ORDER BY owner_name, schema_name, object_type;

-- A6. Foreign keys whose referenced schema is outside the source service.
SELECT source_schema.nspname AS source_schema,
       source_table.relname AS source_table,
       referenced_schema.nspname AS referenced_schema,
       referenced_table.relname AS referenced_table,
       con.conname AS constraint_name
FROM pg_constraint con
JOIN pg_class source_table ON source_table.oid = con.conrelid
JOIN pg_namespace source_schema ON source_schema.oid = source_table.relnamespace
JOIN pg_class referenced_table ON referenced_table.oid = con.confrelid
JOIN pg_namespace referenced_schema ON referenced_schema.oid = referenced_table.relnamespace
WHERE con.contype = 'f'
  AND (
    (
      source_schema.nspname IN ('catalog', 'pricing', 'inventory', 'design', 'ordering')
      AND referenced_schema.nspname NOT IN ('catalog', 'pricing', 'inventory', 'design', 'ordering')
    )
    OR (
      source_schema.nspname IN ('personalization', 'production', 'fulfillment', 'after_sales')
      AND referenced_schema.nspname NOT IN ('personalization', 'production', 'fulfillment', 'after_sales')
    )
    OR (
      source_schema.nspname IN ('memory', 'platform')
      AND referenced_schema.nspname NOT IN ('memory', 'platform')
    )
  )
ORDER BY source_schema, source_table, constraint_name;

-- B1. Run after service-roles.sql. Schema privileges outside the owning service must be false.
SELECT role_name,
       schema_name,
       has_schema_privilege(role_name, schema_name, 'USAGE') AS schema_usage,
       has_schema_privilege(role_name, schema_name, 'CREATE') AS schema_create
FROM (
  VALUES
    ('commerce_app'),
    ('operations_app'),
    ('experience_app'),
    ('commerce_migrate'),
    ('operations_migrate'),
    ('experience_migrate')
) AS roles(role_name)
CROSS JOIN (
  VALUES
    ('iam'),
    ('public'),
    ('catalog'),
    ('pricing'),
    ('inventory'),
    ('design'),
    ('ordering'),
    ('personalization'),
    ('production'),
    ('fulfillment'),
    ('after_sales'),
    ('memory'),
    ('platform')
) AS schemas(schema_name)
ORDER BY role_name, schema_name;

-- B2. Any table privilege outside the role's own schemas. Expected: no rows.
SELECT 'commerce_app' AS role_name,
       n.nspname AS schema_name,
       c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p', 'v', 'm')
  AND n.nspname NOT IN ('catalog', 'pricing', 'inventory', 'design', 'ordering', 'information_schema', 'pg_catalog', 'pg_toast')
  AND (
    has_table_privilege('commerce_app', c.oid, 'SELECT')
    OR has_table_privilege('commerce_app', c.oid, 'INSERT')
    OR has_table_privilege('commerce_app', c.oid, 'UPDATE')
    OR has_table_privilege('commerce_app', c.oid, 'DELETE')
  )
UNION ALL
SELECT 'operations_app',
       n.nspname,
       c.relname
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p', 'v', 'm')
  AND n.nspname NOT IN ('personalization', 'production', 'fulfillment', 'after_sales', 'information_schema', 'pg_catalog', 'pg_toast')
  AND (
    has_table_privilege('operations_app', c.oid, 'SELECT')
    OR has_table_privilege('operations_app', c.oid, 'INSERT')
    OR has_table_privilege('operations_app', c.oid, 'UPDATE')
    OR has_table_privilege('operations_app', c.oid, 'DELETE')
  )
UNION ALL
SELECT 'experience_app',
       n.nspname,
       c.relname
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p', 'v', 'm')
  AND n.nspname NOT IN ('memory', 'platform', 'information_schema', 'pg_catalog', 'pg_toast')
  AND (
    has_table_privilege('experience_app', c.oid, 'SELECT')
    OR has_table_privilege('experience_app', c.oid, 'INSERT')
    OR has_table_privilege('experience_app', c.oid, 'UPDATE')
    OR has_table_privilege('experience_app', c.oid, 'DELETE')
  )
ORDER BY role_name, schema_name, table_name;

ROLLBACK;
