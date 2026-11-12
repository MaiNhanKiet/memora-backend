-- Verification script. Run AFTER MEMORA_BM04_PostgreSQL_74_tables.sql
-- Expected AFTER MEMORA_BM04_Drop_Cross_Service_FKs.sql: 12 domain schemas, 74 tables, 960 columns, 106 FK constraints (225 in the baseline minus 119 cross-service).
WITH target_schemas(schema_name) AS (VALUES ('iam'), ('catalog'), ('pricing'), ('design'), ('ordering'), ('inventory'), ('personalization'), ('production'), ('fulfillment'), ('memory'), ('after_sales'), ('platform')),
actual AS (
 SELECT n.nspname AS schema_name, count(DISTINCT c.oid) AS tables, count(a.attnum) AS columns
 FROM pg_namespace n JOIN pg_class c ON c.relnamespace=n.oid AND c.relkind IN ('r','p')
 LEFT JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
 WHERE n.nspname IN (SELECT schema_name FROM target_schemas)
 GROUP BY n.nspname
)
SELECT t.schema_name, coalesce(a.tables,0) AS tables, coalesce(a.columns,0) AS columns
FROM target_schemas t LEFT JOIN actual a USING (schema_name) ORDER BY t.schema_name;

SELECT count(*) AS fk_count FROM pg_constraint co JOIN pg_namespace n ON n.oid=co.connamespace
WHERE co.contype='f' AND n.nspname IN ('iam', 'catalog', 'pricing', 'design', 'ordering', 'inventory', 'personalization', 'production', 'fulfillment', 'memory', 'after_sales', 'platform');

DO $$
DECLARE actual_tables integer; actual_columns integer; actual_fk integer;
BEGIN
 SELECT count(DISTINCT c.oid), count(a.attnum) INTO actual_tables, actual_columns
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 LEFT JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
 WHERE c.relkind IN ('r','p') AND n.nspname IN ('iam', 'catalog', 'pricing', 'design', 'ordering', 'inventory', 'personalization', 'production', 'fulfillment', 'memory', 'after_sales', 'platform');
 SELECT count(*) INTO actual_fk FROM pg_constraint co JOIN pg_namespace n ON n.oid=co.connamespace
 WHERE co.contype='f' AND n.nspname IN ('iam', 'catalog', 'pricing', 'design', 'ordering', 'inventory', 'personalization', 'production', 'fulfillment', 'memory', 'after_sales', 'platform');
 IF actual_tables<>74 OR actual_columns<>960 OR actual_fk<>106 THEN
  RAISE EXCEPTION 'MEMORA mismatch: tables %, columns %, FKs % (expected 74/960/106)',actual_tables,actual_columns,actual_fk;
 END IF;
 RAISE NOTICE 'MEMORA logical structure verified: 74 tables, 960 columns, 106 FK';
END $$;
