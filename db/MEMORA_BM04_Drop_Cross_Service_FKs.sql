-- ============================================================================
-- MEMORA — service boundary: drop cross-service foreign keys.
-- Decision: keep FKs inside one service, drop FKs that point to another service.
-- "Does this id exist?" across services is checked in code via contracts (gRPC),
-- not by PostgreSQL. This matches the Prisma models, which keep these columns
-- as plain UUID scalars.
--
-- Service ownership:
--   iam         : iam
--   commerce    : catalog, pricing, inventory, design, ordering
--   operations  : personalization, production, fulfillment, after_sales
--   experience  : memory, platform
--
-- Run AFTER MEMORA_BM04_PostgreSQL_74_tables.sql (or on a database that already
-- has those schemas). Idempotent: running it twice drops nothing the second time.
-- Metadata-only change; no rows are touched. To undo, re-add the FKs from the
-- baseline DDL.
-- ============================================================================

BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
  r record;
  dropped integer := 0;
  remaining integer;
BEGIN
  FOR r IN
    WITH svc(schema_name, service) AS (VALUES
      ('iam','iam'),
      ('catalog','commerce'), ('pricing','commerce'), ('inventory','commerce'),
      ('design','commerce'), ('ordering','commerce'),
      ('personalization','operations'), ('production','operations'),
      ('fulfillment','operations'), ('after_sales','operations'),
      ('memory','experience'), ('platform','experience')
    )
    SELECT ns.nspname AS src_schema, cs.relname AS src_table, co.conname AS constraint_name
    FROM pg_constraint co
    JOIN pg_class cs ON cs.oid = co.conrelid
    JOIN pg_namespace ns ON ns.oid = cs.relnamespace
    JOIN pg_class ct ON ct.oid = co.confrelid
    JOIN pg_namespace nt ON nt.oid = ct.relnamespace
    JOIN svc a ON a.schema_name = ns.nspname
    JOIN svc b ON b.schema_name = nt.nspname
    WHERE co.contype = 'f' AND a.service <> b.service
    ORDER BY ns.nspname, cs.relname, co.conname
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I',
                   r.src_schema, r.src_table, r.constraint_name);
    dropped := dropped + 1;
  END LOOP;

  SELECT count(*) INTO remaining
  FROM pg_constraint co
  JOIN pg_class cs ON cs.oid = co.conrelid
  JOIN pg_namespace ns ON ns.oid = cs.relnamespace
  JOIN pg_class ct ON ct.oid = co.confrelid
  JOIN pg_namespace nt ON nt.oid = ct.relnamespace
  JOIN (VALUES
      ('iam','iam'),
      ('catalog','commerce'), ('pricing','commerce'), ('inventory','commerce'),
      ('design','commerce'), ('ordering','commerce'),
      ('personalization','operations'), ('production','operations'),
      ('fulfillment','operations'), ('after_sales','operations'),
      ('memory','experience'), ('platform','experience')
    ) a(schema_name, service) ON a.schema_name = ns.nspname
  JOIN (VALUES
      ('iam','iam'),
      ('catalog','commerce'), ('pricing','commerce'), ('inventory','commerce'),
      ('design','commerce'), ('ordering','commerce'),
      ('personalization','operations'), ('production','operations'),
      ('fulfillment','operations'), ('after_sales','operations'),
      ('memory','experience'), ('platform','experience')
    ) b(schema_name, service) ON b.schema_name = nt.nspname
  WHERE co.contype = 'f' AND a.service <> b.service;

  IF remaining <> 0 THEN
    RAISE EXCEPTION 'MEMORA: % cross-service FKs still present', remaining;
  END IF;
  RAISE NOTICE 'MEMORA: dropped % cross-service FKs; 0 remain', dropped;
END $$;

COMMIT;
