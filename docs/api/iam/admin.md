# IAM Admin APIs

Decisions locked on 2026-10-19. IAM-ADM-01 to IAM-ADM-14 are implemented and **COMPLETED** (tested and accepted according to project-owner confirmation on 2026-10-22). This update synchronizes documentation status only; no new test run or test artifacts are added here. Historical test evidence: `docs/plans/active/iam-admin-api.md`.

Owner: `iam-service` for rules and `iam` tables. HTTP owner: `api-gateway`. Main Flow: N/A (IAM admin extension, RBAC v1 approved 2026-10-15).

## Shared rules

- Prefix: `/api/v1`. Success envelope remains `{ statusCode, message, data, meta? }`.
- Every admin route requires a verified access token. The actor is that token's user. A body or header `userId`, `actorId`, or `x-actor-*` is not the actor.
- Permission checks use the existing Gateway guards. `CheckPermissions` is ALL, so a route that allows either of two codes must not send both codes in one ALL check. There is no ADMIN wildcard.
- Target ids in the path are resources. UUID path params that are not UUIDs are 400. Unknown users, roles, and permissions are 404.
- Admin user objects return id, email, fullName, status, authProvider, emailVerifiedAt, lastLoginAt, createdAt, and updatedAt. They omit phone, role codes, `passwordHash`, and `googleSub`.
- IAM-ADM-09 is the only response that includes a password, and only the one-time `initialPassword`. Do not log it.
- Security-audit metadata keeps the current redaction. Role assign and revoke write `role_assigned` and `role_revoked`. Status changes write `user_status_changed`.

## Existing surfaces

Do not add a second route for these.

| Surface | Where | Note |
| --- | --- | --- |
| `/api/v1/auth/*` | `auth.controller.ts`, `google-oauth.controller.ts` | Session and customer registration. Not staff provisioning. |
| `GetUserById` | `account.grpc.controller.ts` | Internal read. Gateway drops phone for the admin DTO. |
| `ValidateAccessToken`, `CheckRoles`, `CheckPermissions` | `authorization.grpc.controller.ts` | Guard implementation. Not an admin HTTP API. |

## IAM-ADM-01 — GET `/api/v1/admin/users/{userId}`

- Status: COMPLETED. Implemented; team-confirmed tested/accepted on 2026-10-22 (no new test evidence attached by this documentation update).
- Gateway: `apps/api-gateway/src/modules/iam/user-management/`
- Permission: `IAM_USER_READ`
- gRPC: reuse `GetUserById` after the Gateway check
- Success 200 `data`: the admin user object above
- Errors: 400, 401, 403, 404

## IAM-ADM-02 — GET `/api/v1/admin/users`

- Status: COMPLETED. Implemented; team-confirmed tested/accepted on 2026-10-22 (no new test evidence attached by this documentation update).
- Permission: `IAM_USER_READ`
- gRPC: new list RPC
- Query: `page` default 1, `limit` default 10, maximum 100, optional `status`
- Success 200 `data`: array of the IAM-ADM-01 object, plus the existing pagination meta
- Errors: 400, 401, 403
- No email search

## IAM-ADM-03 — GET `/api/v1/admin/roles`

- Status: COMPLETED. Implemented; team-confirmed tested/accepted on 2026-10-22 (no new test evidence attached by this documentation update).
- Permission: `IAM_USER_ROLE_ASSIGN` or `IAM_RBAC_MANAGE`
- gRPC: new list RPC
- Success 200 `data`: `{ code, name, description, isActive }[]`
- Errors: 401, 403
- Not in this spec: POST, PATCH, or DELETE role

## IAM-ADM-04 — GET `/api/v1/admin/permissions`

- Status: COMPLETED. Implemented; team-confirmed tested/accepted on 2026-10-22 (no new test evidence attached by this documentation update).
- Permission: `IAM_RBAC_MANAGE`
- gRPC: new list RPC
- Success 200 `data`: `{ code, name, description, isActive }[]`
- Errors: 401, 403
- Not in this spec: creating or editing permission codes

## IAM-ADM-05 — GET `/api/v1/admin/users/{userId}/roles`

- Status: COMPLETED. Implemented; team-confirmed tested/accepted on 2026-10-22 (no new test evidence attached by this documentation update).
- Permission: `IAM_USER_READ`
- gRPC: new read RPC over active `user_roles`
- Success 200 `data`: `{ assignmentId, roleCode, roleName, assignedAt }[]`
- Errors: 400, 401, 403, 404
- Revoked history is not returned

## IAM-ADM-06 — POST `/api/v1/admin/users/{userId}/roles`

- Status: COMPLETED. Implemented; team-confirmed tested/accepted on 2026-10-22 (no new test evidence attached by this documentation update).
- Permission: `IAM_USER_ROLE_ASSIGN`
- Body: `{ "roleCode": "STORE_STAFF" | "MANAGER" | "JEWELER" | "DELIVERY_STAFF" | "ADMIN" | "CUSTOMER" }`
- gRPC: new assign RPC
- Success 201 `data`: `{ assignmentId, roleCode, assignedAt }`
- Errors: 400, 401, 403, 404, 409
- Writes: `iam.user_roles.assigned_by_user_id` from the token, and audit `role_assigned`
- Assigning `ADMIN` to another user is allowed

## IAM-ADM-07 — POST `/api/v1/admin/users/{userId}/roles/{roleCode}/revoke`

- Status: COMPLETED. Implemented; team-confirmed tested/accepted on 2026-10-22 (no new test evidence attached by this documentation update).
- Permission: `IAM_USER_ROLE_ASSIGN`
- Body: `{ "reason": "string" }` optional
- gRPC: new revoke RPC
- Success 200 `data`: `{ assignmentId, roleCode, revokedAt }`
- Errors: 400, 401, 403, 404, 409
- Writes: `revokedAt`, `revokeReason`, audit `role_revoked`. The row stays.
- The caller cannot revoke their own active `ADMIN` role.
- Reject the call when no `ACTIVE` user would still hold an active `ADMIN` role.

## IAM-ADM-08 — PATCH `/api/v1/admin/users/{userId}/status`

- Status: COMPLETED. Implemented; team-confirmed tested/accepted on 2026-10-22 (no new test evidence attached by this documentation update).
- Permission: `IAM_USER_STATUS_MANAGE`
- Body: `{ "status": "ACTIVE" | "LOCKED" | "DISABLED" }`
- gRPC: new status RPC
- Success 200 `data`: `{ userId, status }`
- Errors: 400, 401, 403, 404
- `LOCKED` or `DISABLED` calls `logoutAll` and writes `user_status_changed` with the previous and next status.
- `verifyAccessToken` rejects a non-ACTIVE account on the next request.
- `ACTIVE` does not create a session.
- The same last-active-ADMIN rule as IAM-ADM-07 applies.

## IAM-ADM-09 — POST `/api/v1/admin/users`

- Status: COMPLETED. Implemented; team-confirmed tested/accepted on 2026-10-22 (no new test evidence attached by this documentation update).
- Permission: `IAM_USER_PROVISION`
- Body: `{ "email", "fullName", "roleCode" }`
- gRPC: new provision RPC
- Success 201 `data`: `{ userId, email, status, roleCode, initialPassword }`
- Errors: 400, 401, 403, 404, 409
- The server generates a unique password, stores only the hash, and returns the plaintext once.
- User is `LOCAL`, `ACTIVE`, and `emailVerifiedAt` is set at creation. `createdByUserId` comes from the token.
- `CUSTOMER` is rejected.
- Do not call `POST /api/v1/auth/register`.
- The new user later changes the password with `POST /api/v1/auth/password/change`. Nothing forces that change.

## IAM-ADM-10 — GET `/api/v1/admin/users/{userId}/authorization`

- Status: COMPLETED. Implemented; team-confirmed tested/accepted on 2026-10-22 (no new test evidence attached by this documentation update).
- Permission: `IAM_USER_READ`
- gRPC: new read RPC over `AuthorizationService.getEffectiveAuthorization`
- Success 200 `data`: `{ userId, status, roleCodes, permissionCodes }`
- LOCKED and DISABLED: empty code arrays
- Errors: 400, 401, 403, 404

## IAM-ADM-11 — GET `/api/v1/admin/roles/{roleCode}/permissions`

- Status: COMPLETED. Implemented; team-confirmed tested/accepted on 2026-10-22 (no new test evidence attached by this documentation update).
- Permission: `IAM_RBAC_MANAGE`
- gRPC: new read RPC
- Success 200 `data`: `{ roleCode, permissionCodes }`
- Errors: 401, 403, 404

## IAM-ADM-12 — POST `/api/v1/admin/roles/{roleCode}/permissions`

- Status: COMPLETED. Implemented; team-confirmed tested/accepted on 2026-10-22 (no new test evidence attached by this documentation update).
- Permission: `IAM_RBAC_MANAGE`
- Body: `{ "permissionCode": "<existing catalog code>" }`
- gRPC: `GrantRolePermission`. `grantedByUserId` comes from the verified token.
- Success 201 `data`: `{ roleCode, permissionCode }`
- Errors: 400, 401, 403, 404, 409
- Inserts one `iam.role_permissions` row. Does not create a permission code.

## IAM-ADM-13 — DELETE `/api/v1/admin/roles/{roleCode}/permissions/{permissionCode}`

- Status: COMPLETED. Implemented; team-confirmed tested/accepted on 2026-10-22 (no new test evidence attached by this documentation update).
- Permission: `IAM_RBAC_MANAGE`
- gRPC: `RevokeRolePermission`
- Success 200 `data`: `{ roleCode, permissionCode }`
- Errors: 400, 401, 403, 404
- Deletes the matching `iam.role_permissions` row. Role and permission catalog rows stay.

## IAM-ADM-14 — GET `/api/v1/admin/users/{userId}/security-audit-events`

- Status: COMPLETED. Implemented; team-confirmed tested/accepted on 2026-10-22 (no new test evidence attached by this documentation update).
- Permission: `IAM_SECURITY_AUDIT_READ`
- Query: `page`, `limit`
- gRPC: `ListUserSecurityAuditEvents`
- Success 200 `data`: `{ id, action, outcome, createdAt, metadata }[]` with pagination `meta`
- Errors: 400, 401, 403, 404
- Reads `iam.security_audit_events` for that user, newest first. Does not write a row. Metadata omits secret keys and values.

## Not specified

- Creating or deactivating roles
- Creating or editing permission codes
- Guest authentication
- Data-rights request processing
- A must-change-password column
- A shared audit table outside `iam.security_audit_events`
