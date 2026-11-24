-- RBAC v1.1 (user-approved 2026-11-13, D-P-01): two CUSTOMER permissions for
-- Operations Personalization. Data-only, idempotent, no DDL.
-- Source of truth: libs/contracts/src/iam/permissions.ts (PERMISSION_DEFINITIONS,
-- RBAC_V1_ROLE_PERMISSIONS). Keep names and descriptions identical.
--
-- Safety:
-- - Existing permission rows are never updated or re-activated (ON CONFLICT DO NOTHING).
-- - A grant is added only when the CUSTOMER role and the permission are both active,
--   and only if the pair is missing. No other grant is touched.
-- - On a fresh database (roles not seeded yet) only the permission rows are inserted.
--   The RBAC v1 bootstrap then adds the grants from the catalog.
-- Rollback (only if no API depends on them yet):
--   DELETE FROM "iam"."role_permissions" rp USING "iam"."permissions" p
--     WHERE rp."permission_id" = p."id"
--       AND p."code" IN ('CONSENT_MANAGE_OWN', 'DESIGN_CHANGE_REQUEST_OWN');
--   DELETE FROM "iam"."permissions"
--     WHERE "code" IN ('CONSENT_MANAGE_OWN', 'DESIGN_CHANGE_REQUEST_OWN');

INSERT INTO "iam"."permissions" ("code", "name", "description", "is_active")
VALUES
    (
        'CONSENT_MANAGE_OWN',
        'Manage own personalization consent',
        'Accept, read and revoke own source- and ring item-scoped Consent.',
        true
    ),
    (
        'DESIGN_CHANGE_REQUEST_OWN',
        'Request change to own design',
        'Request a change to own submitted ring item design; service enforces stage and ownership.',
        true
    )
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "iam"."role_permissions" ("role_id", "permission_id", "granted_by_user_id")
SELECT r."id", p."id", NULL
FROM "iam"."roles" r
JOIN "iam"."permissions" p
    ON p."code" IN ('CONSENT_MANAGE_OWN', 'DESIGN_CHANGE_REQUEST_OWN')
WHERE r."code" = 'CUSTOMER'
  AND r."is_active"
  AND p."is_active"
  AND NOT EXISTS (
      SELECT 1
      FROM "iam"."role_permissions" existing
      WHERE existing."role_id" = r."id"
        AND existing."permission_id" = p."id"
  );
