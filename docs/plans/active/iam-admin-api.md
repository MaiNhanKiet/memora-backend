# IAM Admin API plan

## 1. Metadata

- Branch: `feat/iam-admin-api`
- Domain: `iam`
- Service: `iam-service`
- Feature: `iam-admin-api`
- HTTP owner: `api-gateway`
- Plan status: COMPLETED (owner confirmed testing/acceptance; original plan approval retained)
- Updated: 2026-10-22

## 2. Scope and references

- In scope: administrative reads and mutations over existing `iam` tables that an approved RBAC v1 permission already names. Gateway stays HTTP. IAM owns rules, persistence, and security-audit writes.
- Out of scope: customer authentication, Google OAuth, refresh, CSRF, logging changes, `DATA_RIGHTS_PROCESS`, new roles, a new microservice, production migration, and any API not listed here. `IAM_SECURITY_AUDIT_READ` is the one permission code added for IAM-ADM-14.
- Read:
  - `docs/architecture/memora-backend-4-service.md` (ADR-001, MF01–MF06). IAM admin is not a lead flow in that table. These APIs are the IAM admin extension, Main Flow `N/A`.
  - `docs/architecture/iam-permission-matrix.md` (APPROVED 2026-10-15, plus `IAM_SECURITY_AUDIT_READ` on 2026-10-20: 6 roles, 46 permissions, 49 mappings, no ADMIN wildcard).
  - `docs/architecture/api-gateway-structure.md`.
  - `libs/contracts/src/iam/permissions.ts` (`RBAC_V1_APPROVAL_STATUS = APPROVED`).
  - `apps/iam-service/prisma/schema.prisma` and IAM migrations through `20261019020000_iam_security_audit_events`.
  - `apps/iam-service/prisma/approved-permissions.ts`.
  - `proto/iam/v1/iam.proto`, `libs/contracts/src/iam/iam.grpc.ts`.
  - Gateway `apps/api-gateway/src/modules/iam/auth/controllers/auth.controller.ts` and `google-oauth.controller.ts`.
  - IAM account, authorization, user, role, permission, user-role, role-permission, and security-audit code.
  - `.cursor/skills/implement-api/SKILL.md`.
- Not found, and accepted as such:
  - No file named `MEMORA — API MASTER SPECIFICATION` in this workspace.
  - `rbac-v1.approved.json` is not in this workspace. The matrix and `permissions.ts` are the catalog.

**Current implementation status (2026-10-22):** Project owner confirmed IAM-ADM-01 through IAM-ADM-14 have been tested and completed. This update synchronizes the plan/status with that confirmation; it does not claim an additional independently executed test run. Earlier acceptance evidence and incomplete historical checkboxes are preserved as they were recorded.

The user locked the open decisions on 2026-10-19. On 2026-10-19 the user approved IAM-ADM-01 to IAM-ADM-11. On 2026-10-20 the user approved IAM-ADM-12, IAM-ADM-13, and `IAM_SECURITY_AUDIT_READ` for IAM-ADM-14.

## 3. API inventory

| API ID | Method | Endpoint | Flow | Permission | gRPC | Status |
| --- | --- | --- | --- | --- | --- | --- |
| IAM-AUTH | existing auth methods | `/api/v1/auth/*` | N/A | public or session JWT | existing auth RPCs | EXISTING |
| IAM-GRPC-USER | gRPC only | `IamService/GetUserById` | N/A | internal caller secret only | `GetUserById` | EXISTING |
| IAM-GRPC-AUTHZ | gRPC only | `ValidateAccessToken`, `CheckRoles`, `CheckPermissions` | N/A | verified access token | those three RPCs | EXISTING |
| IAM-ADM-01 | GET | `/api/v1/admin/users/{userId}` | N/A | `IAM_USER_READ` | reuse `GetUserById` | COMPLETED |
| IAM-ADM-02 | GET | `/api/v1/admin/users` | N/A | `IAM_USER_READ` | new list RPC | COMPLETED |
| IAM-ADM-03 | GET | `/api/v1/admin/roles` | N/A | `IAM_USER_ROLE_ASSIGN` or `IAM_RBAC_MANAGE` | new list RPC | COMPLETED |
| IAM-ADM-04 | GET | `/api/v1/admin/permissions` | N/A | `IAM_RBAC_MANAGE` | new list RPC | COMPLETED |
| IAM-ADM-05 | GET | `/api/v1/admin/users/{userId}/roles` | N/A | `IAM_USER_READ` | new read RPC | COMPLETED |
| IAM-ADM-06 | POST | `/api/v1/admin/users/{userId}/roles` | N/A | `IAM_USER_ROLE_ASSIGN` | new assign RPC | COMPLETED |
| IAM-ADM-07 | POST | `/api/v1/admin/users/{userId}/roles/{roleCode}/revoke` | N/A | `IAM_USER_ROLE_ASSIGN` | new revoke RPC | COMPLETED |
| IAM-ADM-08 | PATCH | `/api/v1/admin/users/{userId}/status` | N/A | `IAM_USER_STATUS_MANAGE` | new status RPC | COMPLETED |
| IAM-ADM-09 | POST | `/api/v1/admin/users` | N/A | `IAM_USER_PROVISION` | new provision RPC | COMPLETED |
| IAM-ADM-10 | GET | `/api/v1/admin/users/{userId}/authorization` | N/A | `IAM_USER_READ` | new read RPC | COMPLETED |
| IAM-ADM-11 | GET | `/api/v1/admin/roles/{roleCode}/permissions` | N/A | `IAM_RBAC_MANAGE` | new read RPC | COMPLETED |
| IAM-ADM-12 | POST | `/api/v1/admin/roles/{roleCode}/permissions` | N/A | `IAM_RBAC_MANAGE` | new grant RPC | COMPLETED |
| IAM-ADM-13 | DELETE | `/api/v1/admin/roles/{roleCode}/permissions/{permissionCode}` | N/A | `IAM_RBAC_MANAGE` | new revoke-grant RPC | COMPLETED |
| IAM-ADM-14 | GET | `/api/v1/admin/users/{userId}/security-audit-events` | N/A | `IAM_SECURITY_AUDIT_READ` | `ListUserSecurityAuditEvents` | COMPLETED |

Field-level contract is in `docs/api/iam/admin.md`.

## 4. Dependencies and order

1. IAM-ADM-01 — one-user read reuses `GetUserById` and fixes the admin response shape.
2. IAM-ADM-02 — list uses the same user projection.
3. IAM-ADM-03 and IAM-ADM-04 — role and permission catalogs must be readable before assignment.
4. IAM-ADM-05 — current assignments for one user.
5. IAM-ADM-06 then IAM-ADM-07 — assign, then revoke. Both write `iam.user_roles` and `iam.security_audit_events`.
6. IAM-ADM-08 — status change, `logoutAll`, and `user_status_changed` audit. The last-active-ADMIN rule applies here too.
7. IAM-ADM-09 — staff provision generates one password, returns it once, and does not use `POST /api/v1/auth/register`.
8. IAM-ADM-10 — effective authorization for one user.
9. IAM-ADM-11 — read grants. IAM-ADM-12 and IAM-ADM-13 write grants. IAM-ADM-14 reads audit events.

## 5. API checklists

### IAM-AUTH — existing `/api/v1/auth/*`

- Status: EXISTING
- Domain / Feature / Service: `iam` / `auth` / `iam-service`
- Main Flow: N/A
- Purpose: customer and session authentication already shipped.
- Actor: anonymous or the verified session user.
- Permission: no admin permission. `@Public()` only on the routes that already use it.
- Existing code: `apps/api-gateway/src/modules/iam/auth/controllers/auth.controller.ts`, `google-oauth.controller.ts`.
- Dependencies: none.
- Do not rebuild these routes as admin APIs. `POST /api/v1/auth/register` creates a customer and must not provision staff.

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### IAM-GRPC-USER — `GetUserById`

- Status: EXISTING
- Domain / Feature / Service: `iam` / `account` / `iam-service`
- Main Flow: N/A
- Purpose: internal read of one user by id.
- Actor: trusted internal gRPC caller. The RPC does not check `IAM_USER_READ`.
- Permission: internal caller secret.
- Request: `user_id`. No Gateway HTTP route calls it today.
- Response: `PublicUser` in `proto/iam/v1/iam.proto` (id, email, full name, phone, auth provider, status, email verified at, last login at, created at, updated at). Password hash and `googleSub` are not on this message.
- Tables: `iam.users`.
- gRPC method: `GetUserById`.
- Existing code: `apps/iam-service/src/presentation/grpc/account.grpc.controller.ts`.
- Dependencies: IAM-ADM-01 may call it only after the Gateway has enforced `IAM_USER_READ`.

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### IAM-GRPC-AUTHZ — token and permission checks

- Status: EXISTING
- Domain / Feature / Service: `iam` / `authorization` / `iam-service`
- Main Flow: N/A
- Purpose: Gateway JWT and RBAC guards. `CheckRoles` is ANY. `CheckPermissions` is ALL of the requested active permissions through active roles and non-revoked assignments. LOCKED and DISABLED return no roles or permissions.
- Actor: the access token presented to IAM, not a client-supplied user id.
- Permission: the codes in the check request.
- gRPC method: `ValidateAccessToken`, `CheckRoles`, `CheckPermissions`.
- Existing code: `apps/iam-service/src/presentation/grpc/authorization.grpc.controller.ts`, `apps/iam-service/src/application/authorization/authorization.service.ts`, Gateway `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`.
- Dependencies: admin routes use these guards. Do not add a second authorization implementation.

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### IAM-ADM-01 — GET `/api/v1/admin/users/{userId}`

- Status: COMPLETED (project-owner confirmation 2026-10-22; historical checklist retained)
- Review: PASS_WITH_NOTES (LOW 1)
- Domain / Feature / Service: `iam` / `user-management` / `iam-service`
- Main Flow: N/A
- Purpose: read one account's identity and status for an administrator.
- Actor: verified JWT user who holds `IAM_USER_READ`. Path `userId` is the target, not the actor.
- Permission: `IAM_USER_READ`
- Request:
  - Params: `userId` UUID.
  - Query: none.
  - Body: none.
- Response:
  - Success: 200. Fields: id, email, fullName, status, authProvider, emailVerifiedAt, lastLoginAt, createdAt, updatedAt. No phone, role codes, `passwordHash`, or `googleSub`.
  - Errors: 400 invalid id, 401, 403, 404.
- Validation and business rules: do not accept actor id from the body or from `x-actor-*`. Gateway maps a narrower DTO than proto `PublicUser`, which still includes phone for `/api/v1/auth/me`.
- Tables: `iam.users`.
- gRPC method: reuse `GetUserById`. Do not add role fields to that message.
- Existing code: `UsersService.findById`, `AccountGrpcController.getUserById`. No list method exists.
- Dependencies: none. First admin API.
- Implemented (2026-10-19):
  - Gateway `apps/api-gateway/src/modules/iam/user-management/`: `controllers/user-management.controller.ts`, `dto/request/get-user.request.dto.ts`, `dto/response/admin-user.response.dto.ts`, `mappers/user-management-http.mapper.ts`, `docs/user-management.swagger.ts`.
  - `clients/iam-grpc.client.ts` gains `getUserById`. `iam.module.ts` registers `UserManagementController`.
  - No proto, `libs/contracts`, `iam-service`, schema, or migration change.
- Open note for review: `GetUserById` checks only the internal caller secret. `IAM_USER_READ` is enforced once, by the Gateway `PermissionsGuard`, as this plan specifies.

#### implement-api checklist

- [x] Approved method, path, request, response, and permission confirmed
- [x] No duplicate route, RPC, DTO, or migration
- [x] Owning service enforces rules and data ownership
- [x] Gateway DTO, auth, error mapping, and Swagger match the contract
- [x] Checks recorded with PASS/FAIL/NOT RUN

### IAM-ADM-02 — GET `/api/v1/admin/users`

- Status: COMPLETED (project-owner confirmation 2026-10-22; historical checklist retained)
- Review: PASS
- Domain / Feature / Service: `iam` / `user-management` / `iam-service`
- Main Flow: N/A
- Purpose: list accounts for administration.
- Actor: verified JWT user who holds `IAM_USER_READ`.
- Permission: `IAM_USER_READ`
- Request:
  - Params: none.
  - Query: `page` default 1, `limit` default 10, maximum 100, optional `status` of `ACTIVE`, `LOCKED`, or `DISABLED`. No email search.
  - Body: none.
- Response:
  - Success: 200, the IAM-ADM-01 projection, with the existing pagination meta.
  - Errors: 400, 401, 403.
- Validation and business rules: use `libs/common` pagination limits. Do not log an email if one appears in the query string.
- Tables: `iam.users`.
- gRPC method: new unary list RPC. `UserRepository` has no `findMany`.
- Existing code: none for list.
- Dependencies: IAM-ADM-01 response shape.

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### IAM-ADM-03 — GET `/api/v1/admin/roles`

- Status: COMPLETED (project-owner confirmation 2026-10-22; historical checklist retained)
- Review: PASS
- Domain / Feature / Service: `iam` / `role-management` / `iam-service`
- Main Flow: N/A
- Purpose: read the six seeded role catalog so an admin can assign a role by code.
- Actor: verified JWT user who holds `IAM_USER_ROLE_ASSIGN` or `IAM_RBAC_MANAGE`.
- Permission: either code. `CheckPermissions` is ALL, so this route must not send both codes in one ALL check.
- Request:
  - Params: none.
  - Query: none in the candidate.
  - Body: none.
- Response:
  - Success: 200, role `code`, `name`, `description`, `isActive`. Do not require clients to send role UUIDs.
  - Errors: 401, 403.
- Validation and business rules: create, rename, and deactivate role are not APIs in this plan. `RoleRepository.create` exists and must not gain an HTTP route without a new approved permission.
- Tables: `iam.roles`.
- gRPC method: new list RPC. Repository has `findById`, `findByCode`, `findActiveByIds`, and `create` only.
- Existing code: `apps/iam-service/src/repositories/role.repository.ts`.
- Dependencies: before IAM-ADM-06.

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### IAM-ADM-04 — GET `/api/v1/admin/permissions`

- Status: COMPLETED (project-owner confirmation 2026-10-22; historical checklist retained)
- Review: PASS_WITH_NOTES (LOW 1)
- Domain / Feature / Service: `iam` / `permission-management` / `iam-service`
- Main Flow: N/A
- Purpose: read the approved permission catalog.
- Actor: verified JWT user who holds `IAM_RBAC_MANAGE`.
- Permission: `IAM_RBAC_MANAGE`
- Request: no params, query, or body in the candidate.
- Response:
  - Success: 200, `code`, `name`, `description`, `isActive`.
  - Errors: 401, 403.
- Validation and business rules: do not add, rename, or reactivate permission codes over HTTP. Seed inserts missing codes and does not rewrite them.
- Tables: `iam.permissions`.
- gRPC method: new list RPC.
- Existing code: `apps/iam-service/src/repositories/permission.repository.ts`.
- Dependencies: before IAM-ADM-11. IAM-ADM-12 is deferred.

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### IAM-ADM-05 — GET `/api/v1/admin/users/{userId}/roles`

- Status: COMPLETED (project-owner confirmation 2026-10-22; historical checklist retained)
- Review: PASS
- Domain / Feature / Service: `iam` / `user-role-assignment` / `iam-service`
- Main Flow: N/A
- Purpose: read role assignments for one user.
- Actor: verified JWT user who holds `IAM_USER_READ`. Path `userId` is the target.
- Permission: `IAM_USER_READ`
- Request:
  - Params: `userId` UUID.
  - Query: none.
  - Body: none.
- Response:
  - Success: 200, active assignment id, role code, role name, `assignedAt`. Do not return `assignedByUserId`.
  - Errors: 400, 401, 403, 404.
- Validation and business rules: `revokedAt IS NULL`. History stays internal unless a later approved API asks for it. `findHistoryByUserId` already exists and has no HTTP route.
- Tables: `iam.user_roles`, `iam.roles`.
- gRPC method: new read RPC.
- Existing code: `UserRoleRepository.findActiveWithRoleByUserId`.
- Dependencies: IAM-ADM-01 for the user existence rule.

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### IAM-ADM-06 — POST `/api/v1/admin/users/{userId}/roles`

- Status: COMPLETED (project-owner confirmation 2026-10-22; historical checklist retained)
- Review: PASS
- Domain / Feature / Service: `iam` / `user-role-assignment` / `iam-service`
- Main Flow: N/A
- Purpose: assign one active role to a user, with actor attribution and audit.
- Actor: verified JWT user who holds `IAM_USER_ROLE_ASSIGN`. `assignedByUserId` comes from that token.
- Permission: `IAM_USER_ROLE_ASSIGN`
- Request:
  - Params: `userId` UUID.
  - Query: none.
  - Body: `{ "roleCode": "<one of the six seeded codes>" }`.
- Response:
  - Success: 201, assignment id, role code, `assignedAt`.
  - Errors: 400, 401, 403, 404 user or role, 409 active assignment already exists.
- Validation and business rules: target role must be active. Assigning `ADMIN` to another user is allowed. Partial unique `(user_id, role_id) WHERE revoked_at IS NULL`. Repository `assign` already writes audit action `role_assigned` and does not set `assignedByUserId`; the admin RPC must set that column from the verified token.
- Tables: `iam.user_roles`, `iam.security_audit_events`.
- gRPC method: new assign RPC. Do not trust a body `userId` or `actorId`.
- Existing code: `UserRoleRepository.assign`.
- Dependencies: IAM-ADM-03 so role codes are known. Audit write already exists.

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### IAM-ADM-07 — POST `/api/v1/admin/users/{userId}/roles/{roleCode}/revoke`

- Status: COMPLETED (project-owner confirmation 2026-10-22; historical checklist retained)
- Review: PASS
- Domain / Feature / Service: `iam` / `user-role-assignment` / `iam-service`
- Main Flow: N/A
- Purpose: revoke one active role assignment.
- Actor: verified JWT user who holds `IAM_USER_ROLE_ASSIGN`.
- Permission: `IAM_USER_ROLE_ASSIGN`
- Request:
  - Params: `userId` UUID, `roleCode`.
  - Query: none.
  - Body: optional `{ "reason": "..." }`. Reason max length is not specified.
- Response:
  - Success: 200, assignment id, role code, `revokedAt`.
  - Errors: 400, 401, 403, 404, 409 when no active assignment exists.
- Validation and business rules: set `revokedAt` and `revokeReason`. Do not delete the row. Repository `revoke` writes audit action `role_revoked`. The caller cannot revoke their own active `ADMIN` role. The operation is rejected when it would leave no `ACTIVE` user with an active `ADMIN` role.
- Tables: `iam.user_roles`, `iam.security_audit_events`.
- gRPC method: new revoke RPC.
- Existing code: `UserRoleRepository.revoke`.
- Dependencies: IAM-ADM-06.

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### IAM-ADM-08 — PATCH `/api/v1/admin/users/{userId}/status`

- Status: COMPLETED (project-owner confirmation 2026-10-22; historical checklist retained)
- Review: PASS
- Domain / Feature / Service: `iam` / `user-management` / `iam-service`
- Main Flow: N/A
- Purpose: lock, disable, or activate an account.
- Actor: verified JWT user who holds `IAM_USER_STATUS_MANAGE`.
- Permission: `IAM_USER_STATUS_MANAGE`
- Request:
  - Params: `userId` UUID.
  - Query: none.
  - Body: `{ "status": "ACTIVE" | "LOCKED" | "DISABLED" }`.
- Response:
  - Success: 200, user id and status.
  - Errors: 400, 401, 403, 404.
- Validation and business rules: allowed values are the existing `USER_STATUS` set. Moving a user to `LOCKED` or `DISABLED` calls `logoutAll` and writes audit action `user_status_changed` with the previous and next status. `verifyAccessToken` already rejects a non-ACTIVE account on the next request. Setting `ACTIVE` does not create a session. Reject the change when it would leave no `ACTIVE` user with an active `ADMIN` role. No schema migration is required. `user_status_changed` is a new value in `SECURITY_AUDIT_ACTION`, not a new table.
- Tables: `iam.users`, `iam.security_audit_events`. Refresh sessions live in Redis.
- gRPC method: new status RPC. `UserRepository` has no status update method.
- Existing code: `apps/iam-service/src/application/constants/iam-status.ts`.
- Dependencies: IAM-ADM-01.

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### IAM-ADM-09 — POST `/api/v1/admin/users`

- Status: COMPLETED (project-owner confirmation 2026-10-22; historical checklist retained)
- Review: PASS
- Domain / Feature / Service: `iam` / `user-management` / `iam-service`
- Main Flow: N/A
- Purpose: provision a staff or admin account. Public signup stays customer-only.
- Actor: verified JWT user who holds `IAM_USER_PROVISION`. `createdByUserId` comes from that token.
- Permission: `IAM_USER_PROVISION`
- Request:
  - Params: none.
  - Query: none.
  - Body: `email`, `fullName`, and `roleCode`. The client does not send a password.
- Response:
  - Success: 201, user id, email, status, role code, and `initialPassword` once. No password hash and no token.
  - Errors: 400, 401, 403, 404 unknown role, 409 email already used.
- Validation and business rules: reject `CUSTOMER`. Create `LOCAL`, `ACTIVE`, `emailVerifiedAt` set to the creation time, and `passwordHash` from a unique random password. Return that password only in this response and do not log it. `createdByUserId` and `assignedByUserId` come from the verified token. Do not call the register OTP flow. There is no must-change-password flag; the user later calls `POST /api/v1/auth/password/change`. `createWithRoleAssignment` does not set the actor columns, so the provision transaction must set them.
- Tables: `iam.users`, `iam.user_roles`, `iam.security_audit_events`.
- gRPC method: new provision RPC.
- Existing code: `UserRepository.createWithRoleAssignment`, used today by customer registration.
- Dependencies: IAM-ADM-06 rules and IAM-ADM-08 status values.

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### IAM-ADM-10 — GET `/api/v1/admin/users/{userId}/authorization`

- Status: COMPLETED (project-owner confirmation 2026-10-22; historical checklist retained)
- Review: PASS
- Domain / Feature / Service: `iam` / `authorization-management` / `iam-service`
- Main Flow: N/A
- Purpose: show one user's effective role codes and permission codes.
- Actor: verified JWT user who holds `IAM_USER_READ`.
- Permission: `IAM_USER_READ`. This is not a public `CheckPermissions` HTTP route.
- Request:
  - Params: `userId` UUID.
  - Query: none.
  - Body: none.
- Response:
  - Success: 200, `userId`, `status`, `roleCodes`, `permissionCodes`. LOCKED and DISABLED return empty arrays, matching `AuthorizationService`.
  - Errors: 400, 401, 403, 404.
- Validation and business rules: read only. This does not change grants.
- Tables: `iam.users`, `iam.user_roles`, `iam.roles`, `iam.role_permissions`, `iam.permissions`.
- gRPC method: new read RPC over `AuthorizationService.getEffectiveAuthorization`.
- Existing code: `apps/iam-service/src/application/authorization/authorization.service.ts`.
- Dependencies: IAM-ADM-05.

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### IAM-ADM-11 — GET `/api/v1/admin/roles/{roleCode}/permissions`

- Status: COMPLETED (project-owner confirmation 2026-10-22; historical checklist retained)
- Review: PASS_WITH_NOTES (LOW 1)
- Domain / Feature / Service: `iam` / `authorization-management` / `iam-service`
- Main Flow: N/A
- Purpose: read permission codes granted to one role.
- Actor: verified JWT user who holds `IAM_RBAC_MANAGE`.
- Permission: `IAM_RBAC_MANAGE`
- Request:
  - Params: `roleCode`.
  - Query: none.
  - Body: none.
- Response:
  - Success: 200, role code and permission codes.
  - Errors: 401, 403, 404.
- Validation and business rules: read only.
- Tables: `iam.roles`, `iam.role_permissions`, `iam.permissions`.
- gRPC method: new read RPC. `RolePermissionRepository.findByRoleId` exists.
- Existing code: `apps/iam-service/src/repositories/role-permission.repository.ts`.
- Dependencies: IAM-ADM-03 and IAM-ADM-04.

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### IAM-ADM-12 — POST `/api/v1/admin/roles/{roleCode}/permissions`

- Status: COMPLETED (project-owner confirmation 2026-10-22; historical checklist retained)
- Domain / Feature / Service: `iam` / `authorization-management` / `iam-service`
- Main Flow: N/A
- Purpose: grant one existing permission to a role. The user approved runtime grants on 2026-10-20. The catalog remains the initial seed. This route does not create a permission code.
- Actor: verified JWT user who holds `IAM_RBAC_MANAGE`. `grantedByUserId` comes from that token.
- Permission: `IAM_RBAC_MANAGE`
- Request:
  - Params: `roleCode`.
  - Query: none.
  - Body: `{ "permissionCode": "<existing catalog code>" }`.
- Response:
  - Success: 201, role code and permission code.
  - Errors: 400, 401, 403, 404, 409 duplicate grant.
- Validation and business rules: role and permission must already exist and be active. `grantedByUserId` comes from the verified token. A duplicate pair returns 409. A later `iam:rbac-v1:apply` does not remove this row after the bootstrap marker exists. Changing the catalog checksum still fails that apply.
- Tables: `iam.role_permissions`.
- gRPC method: new grant RPC.
- Existing code: `RolePermissionRepository.grant`.
- Dependencies: IAM-ADM-11 and the bootstrap decision.

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### IAM-ADM-13 — DELETE `/api/v1/admin/roles/{roleCode}/permissions/{permissionCode}`

- Status: COMPLETED (project-owner confirmation 2026-10-22; historical checklist retained)
- Domain / Feature / Service: `iam` / `authorization-management` / `iam-service`
- Main Flow: N/A
- Purpose: remove one permission from a role by deleting the `role_permissions` row. The user approved this on 2026-10-20.
- Actor: verified JWT user who holds `IAM_RBAC_MANAGE`.
- Permission: `IAM_RBAC_MANAGE`
- Request:
  - Params: `roleCode`, `permissionCode`.
  - Query: none.
  - Body: none.
- Response:
  - Success: 200.
  - Errors: 401, 403, 404.
- Validation and business rules: delete the matching `role_permissions` row. There is no `revokedAt`. A missing grant returns 404. Bootstrap does not recreate the row after the marker exists.
- Tables: `iam.role_permissions`.
- gRPC method: new revoke-grant RPC.
- Existing code: none for delete.
- Dependencies: IAM-ADM-12 decision.

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### IAM-ADM-14 — GET `/api/v1/admin/users/{userId}/security-audit-events`

- Status: COMPLETED (project-owner confirmation 2026-10-22; historical checklist retained)
- Domain / Feature / Service: `iam` / `security-audit-management` / `iam-service`
- Main Flow: N/A
- Purpose: list append-only security audit events for one user. The permission is `IAM_SECURITY_AUDIT_READ`, not `IAM_USER_READ` or `DATA_RIGHTS_PROCESS`.
- Actor: verified access token. The route does not take an actor id.
- Permission: `IAM_SECURITY_AUDIT_READ`
- Request: path `userId` UUID. Query `page` and `limit` use the shared pagination defaults.
- Response: 200 `{ statusCode, message, data, meta }`. Each item has `id`, `action`, `outcome`, `createdAt`, and string `metadata`. Metadata drops keys or values that look like email, password, token, OTP, cookie, secret, authorization, or a request body.
- Errors: 400, 401, 403, 404.
- Validation and business rules: unknown user is 404 before the event query. Order is newest first. The table stays append-only.
- Tables: `iam.security_audit_events` read. `iam.users` existence check.
- gRPC method: `ListUserSecurityAuditEvents`.
- Existing code: `SecurityAuditAdminService`, `SecurityAuditRepository.findPageByUserId`.
- Dependencies: the `IAM_SECURITY_AUDIT_READ` catalog code and an ADMIN grant row in `iam.role_permissions`. The Postgres MCP connection is read-only, so that row was not inserted.

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

## 6. Acceptance criteria and test cases

> **Record note (2026-10-22):** The checklists below reflect the historical test evidence available when written (2026-10-19/20). Current completion status is owner-confirmed; unchecked historical items are not silently converted to test PASS without attached evidence.

Shared for every in-scope admin API: JWT required, permission enforced in the Gateway, target id taken from the path, actor taken from the verified token, success envelope `{ statusCode, message, data, meta? }`. Responses omit phone, `googleSub`, password hashes, tokens, cookies, and OTPs. IAM-ADM-09 is the one exception: it returns `initialPassword` once.

### IAM-ADM-01

Verified by a Gateway HTTP test with real guards, validation pipe, exception filter, and response interceptor. The IAM gRPC transport was stubbed. No live call to `iam-service` ran.

- [x] 200 for an existing user with `IAM_USER_READ`
- [x] 401 without a token
- [x] 403 for a token that lacks `IAM_USER_READ`
- [x] 404 for an unknown user
- [x] 400 for a non-UUID `userId`

### IAM-ADM-02

Gateway HTTP test with real guards, validation pipe, exception filter, and response interceptor. IAM gRPC transport stubbed.

- [x] 200 page uses the IAM-ADM-01 fields and omits phone and role codes
- [x] 401 and 403 as above
- [x] 400 for a page below 1 or a limit outside 1 to 100

### IAM-ADM-03

Gateway HTTP test covers 403. Seeded codes were read through `CatalogAdminService.listRoles` on a local PostgreSQL database.

- [x] 200 returns the seeded role codes for either `IAM_USER_ROLE_ASSIGN` or `IAM_RBAC_MANAGE`
- [x] 403 when the caller has neither permission

### IAM-ADM-04

Gateway HTTP test. The handler only calls `listPermissions`.

- [x] 200 returns catalog codes for `IAM_RBAC_MANAGE` and does not create a code
- [x] 403 when the caller lacks `IAM_RBAC_MANAGE`

### IAM-ADM-05

Gateway HTTP test plus repository/service unit test. Open assignments include an inactive role. `revokedAt` is the only filter.

- [x] 200 returns only active assignments and omits `assignedByUserId`
- [x] 403 when the caller lacks `IAM_USER_READ`

### IAM-ADM-06

Gateway HTTP test covers 409, 404, 401, and 403. The database write was executed through `UserRoleAdminService.assignUserRole`.

- [x] 201 assigns by role code and writes `role_assigned` with the verified actor
- [x] 409 when the active assignment already exists
- [x] 404 unknown user or role
- [x] 401 and 403
- [x] Body `userId` or `actorId` does not change the actor

### IAM-ADM-07

HTTP covers 200 envelope, 409, 401, 404, and 403 when the token user revokes their own `ADMIN` role. `UserRoleAdminService.revokeUserRole` set `revokedAt`, wrote `role_revoked`, and rejected a self revoke before the write. Two parallel service revokes, and one revoke beside one disable, each left one ACTIVE ADMIN on the local database.

- [x] 200 sets `revokedAt` and writes `role_revoked`
- [x] 409 when the assignment is already revoked
- [x] 403 when the caller revokes their own `ADMIN` role
- [x] 403 when the change would leave no ACTIVE user with an active `ADMIN` role
- [x] 401 and 404

### IAM-ADM-08

HTTP covers 200 for ACTIVE, LOCKED, and DISABLED, plus 400, 401, and 404. `UserAdminService.updateUserStatus` wrote `user_status_changed` with `actorUserId`. After `LOCKED`, `verifyAccessToken` and `refresh` both returned 401. A Redis `revokeAllForUser` failure returned 503 while the committed status stayed `LOCKED`; the next call completed logout.

- [x] 200 for ACTIVE, LOCKED, and DISABLED
- [x] 400 for any other status
- [x] LOCKED or DISABLED calls `logoutAll` and writes `user_status_changed`
- [x] A later access-token check for that user fails
- [x] 403 when the change would leave no ACTIVE user with an active `ADMIN` role
- [x] 401 and 404

### IAM-ADM-09

HTTP covers the response shape, 409, 400, 401, and 403. `UserAdminService.provisionUser` inserted an ACTIVE user with `emailVerifiedAt`, an Argon2id hash, the role assignment, and `role_assigned`. The initial password was absent from the audit metadata and logger output.

- [x] 201 creates an ACTIVE non-customer account with `emailVerifiedAt` set and a `role_assigned` audit row
- [x] Response contains `initialPassword` once and no hash or token
- [x] 409 duplicate email
- [x] 400 for `roleCode` `CUSTOMER`
- [x] 401 and 403
- [x] Does not call the public register OTP route

### IAM-ADM-10

Gateway HTTP test covers 401, 403, and 404. `CatalogAdminService.getUserAuthorization` matched the `STORE_STAFF` grants. An inactive role, a revoked assignment, and `LOCKED` or `DISABLED` each returned empty codes.

- [x] 200 matches active role and permission codes for `IAM_USER_READ`
- [x] LOCKED or DISABLED returns empty codes
- [x] 401, 403, and 404

### IAM-ADM-11

Gateway HTTP test. Grant rows are stubbed.

- [x] 200 lists grants for a role code
- [x] 404 unknown role
- [x] 401 and 403

### IAM-ADM-12

- [ ] Not implemented in this phase

### IAM-ADM-13

- [ ] Not implemented in this phase

### IAM-ADM-14

Gateway HTTP and live database were not run.

- [ ] 200 returns one user's events for `IAM_SECURITY_AUDIT_READ` and omits secret metadata
- [ ] 401 and 403
- [ ] 404 for an unknown user
- [ ] 400 for a non-UUID `userId` or a page/limit outside the shared bounds

## 7. Locked decisions

- [x] IAM-ADM-05 and IAM-ADM-10 use `IAM_USER_READ`.
- [x] IAM-ADM-03 allows `IAM_USER_ROLE_ASSIGN` or `IAM_RBAC_MANAGE`.
- [x] IAM-ADM-04 and IAM-ADM-11 use `IAM_RBAC_MANAGE`.
- [x] IAM-ADM-14 uses `IAM_SECURITY_AUDIT_READ`, approved by the user on 2026-10-20. Do not reuse `IAM_USER_READ` or `DATA_RIGHTS_PROCESS`.
- [x] Admin user responses return id, email, fullName, status, authProvider, emailVerifiedAt, lastLoginAt, createdAt, and updatedAt. Phone and role codes stay off that object. Role codes are only on IAM-ADM-05.
- [x] IAM-ADM-02 uses page, limit, and optional status. No email search.
- [x] IAM-ADM-09 generates a unique password, stores the hash, sets `emailVerifiedAt`, and returns `initialPassword` once. The staff user changes it later with `POST /api/v1/auth/password/change`. `CUSTOMER` is rejected.
- [x] Another user may receive `ADMIN`. A caller cannot revoke their own `ADMIN` role. Revoke and status changes must leave at least one ACTIVE user with an active `ADMIN` role.
- [x] `LOCKED` and `DISABLED` call `logoutAll` and write `user_status_changed`. `ACTIVE` does not create a session.
- [x] IAM-ADM-12 and IAM-ADM-13 were deferred, then approved by the user on 2026-10-20. Runtime grants write `role_permissions`. The catalog stays the initial seed.
- [x] Creating or editing `iam.roles` stays out of this plan. `IAM_SECURITY_AUDIT_READ` is the only new `iam.permissions` code.

## 8. Implementation progress log

| Date | API ID | Result | Evidence |
| --- | --- | --- | --- |
| 2026-10-19 | — | Plan drafted. No API implemented. | This file and `docs/api/iam/admin.md` |
| 2026-10-19 | — | Decisions locked. No API implemented. | Section 7 |
| 2026-10-19 | IAM-ADM-01 to IAM-ADM-11 | User approved all in-scope APIs. | User instruction in chat |
| 2026-10-19 | IAM-ADM-01 | Implemented. PENDING_REVIEW. | `jest apps/api-gateway/src/modules/iam/user-management` PASS 8/8 (200, actor hints ignored, 401 missing token, 401 rejected token, 403, 400, 404, 503 without detail leak). Full `jest` PASS (7 suites, 2 live suites skipped). `typecheck` PASS. `eslint apps/api-gateway/src/modules/iam` PASS. `proto:check` PASS. `boundaries` PASS. `nest build api-gateway` PASS. Live call against `iam-service` and Swagger UI NOT RUN. The task spec file was deleted after the run, as repository rule 12 requires. |
| 2026-10-19 | IAM-ADM-02 to IAM-ADM-11 | Implemented. PENDING_REVIEW. | `proto/iam/v1/iam.proto` (10 admin RPCs + pagination import), `libs/contracts/src/iam/iam.grpc.ts`, `apps/iam-service` (`application/admin/*`, `IamAdminGrpcController`, repository extensions, `USER_STATUS_CHANGED` audit), `apps/api-gateway` (`user-management`, `role-management`, `permission-management`, `IamGrpcClient`, `RequireAnyPermissions` + `AnyPermissionsGuard` for IAM-ADM-03). `proto:check` PASS. `typecheck` PASS. `eslint` (touched IAM/admin/auth) PASS after prettier. `boundaries` PASS (151 files). `nest build api-gateway` PASS. `nest build iam-service` PASS. `jest` full suite PASS (37 tests, 2 live suites skipped). IAM admin policy unit test PASS 2/2 then deleted per rule 12. Per-API Gateway HTTP tests and live E2E against `iam-service` NOT RUN. Section 6 acceptance checklists for IAM-ADM-02..11 stay unchecked until verified. |
| 2026-10-19 | FEATURE_RELEASE IAM-ADM-01..11 | CHANGES_REQUIRED. 0 critical / 11 high / 3 medium / 1 low. DEFERRED APIs skipped. | Skill `review-api`. IAM-ADM-01 PASS_WITH_NOTES. IAM-ADM-02..11 CHANGES_REQUIRED (missing section-6 HTTP evidence; IAM-ADM-07/08 last-ADMIN race and status/logoutAll not atomic). Status stays PENDING_REVIEW. No application code, commit, or push. |
| 2026-10-20 | IAM-ADM-02..11 findings | Fixes applied. Status stays PENDING_REVIEW. Review verdict not changed. | Last-admin revoke and LOCKED/DISABLED status share `pg_advisory_xact_lock` inside the same transaction as the write and audit. `actorUserId` is stored on `user_status_changed`. `logoutAll` runs after commit and a Redis `ServiceUnavailableException` fails the call; a retry when already LOCKED/DISABLED calls `logoutAll` again. IAM-ADM-05 lists `revokedAt IS NULL` including inactive roles. Swagger decorators added for IAM-ADM-01..11. `jest` focused admin+HTTP PASS (20 tests, live suite skipped in that run). `MEMORA_IAM_DB_TEST=1` live PostgreSQL concurrency PASS 1/1 (two parallel disables, one rejected). `jest` full PASS 55, 5 skipped. `typecheck` PASS. `eslint` touched admin/gateway PASS. `proto:check` PASS. `boundaries` PASS 158. `nest build api-gateway` PASS. `nest build iam-service` PASS. Unchecked: seeded role codes from the database, `role_assigned`/`role_revoked` rows, provision insert, effective authorization from `AuthorizationService`, and a later `verifyAccessToken` call. No outbox and no schema change. No commit or push. |
| 2026-10-20 | FEATURE_RELEASE IAM-ADM-01..11 re-review | CHANGES_REQUIRED. 0 critical / 1 high / 1 medium / 2 low. | Independent source re-review. Lock, audit transaction, actor, role filter, and Swagger checked in code. Acceptance gaps remain on IAM-ADM-03, 06, 07, 08, 09, 10. Status stays PENDING_REVIEW. Not ready for a merge PR to `dev`. No application edit, commit, or push. |
| 2026-10-20 | IAM-ADM-03, 06, 07, 08, 09, 10 acceptance | Evidence added. Status stays PENDING_REVIEW. Review verdict not changed. | Local PostgreSQL `127.0.0.1:54329` and Redis `127.0.0.1:63799`, created for this run and not the configured remote database. `CatalogAdminService`, `UserRoleAdminService`, `UserAdminService`, `AuthenticationService`, and `AuthorizationService` ran against that database. `NODE_OPTIONS=--experimental-vm-modules MEMORA_IAM_DB_TEST=1 jest iam-admin.acceptance.live.spec.ts --runInBand` PASS 7/7. Gateway HTTP `iam-admin.http.spec.ts` PASS 12/12, including 403 for self `ADMIN` revoke. Full `jest` without the live flag PASS 56, 12 skipped, 4 suites skipped. `typecheck` PASS. `eslint` on the new spec and HTTP spec PASS. `proto:check` PASS. `boundaries` PASS 159. `nest build api-gateway` PASS. `nest build iam-service` PASS. No commit or push. |
| 2026-10-20 | FEATURE_RELEASE IAM-ADM-01..11 final review | PASS_WITH_NOTES. 0 critical / 0 high / 0 medium / 3 low. READY_FOR_PR. | Section 6 for IAM-ADM-01..11 is checked. Live acceptance PASS 7/7 is evidence; the skipped suite in full Jest is not a gap. Last-admin revoke/revoke and revoke/disable ran through the services. `verifyAccessToken` and refresh reject LOCKED. Redis crash window and `GetUserById` internal trust boundary are residuals, not blockers. Status stays PENDING_REVIEW. No application edit, commit, or push. |
| 2026-10-20 | IAM-ADM-12, IAM-ADM-13 | Implemented. PENDING_REVIEW. IAM-ADM-14 stays DEFERRED. | User approved runtime role-permission grants. `GrantRolePermission` and `RevokeRolePermission` added. `jest catalog-admin.service.spec.ts` PASS 3/3, then the spec was deleted per rule 12. `typecheck` PASS. `proto:check` PASS. `eslint` touched role-management and catalog service PASS. Gateway HTTP and live database NOT RUN. |
| 2026-10-20 | IAM-ADM-14 | Implemented. PENDING_REVIEW. Database grant NOT inserted. | User approved `IAM_SECURITY_AUDIT_READ`. `ListUserSecurityAuditEvents` and `GET /api/v1/admin/users/{userId}/security-audit-events` added. `jest security-audit-admin.service.spec.ts` PASS 2/2, then the spec was deleted per rule 12. `typecheck` PASS. `proto:check` PASS. `eslint` on the touched TypeScript files PASS. Gateway HTTP and live database NOT RUN. `user-postgres` MCP `INSERT` was rejected: read-only transaction. The Supabase project is a different inactive database and was not written. |

| 2026-10-22 | IAM-ADM-01 to IAM-ADM-14 | COMPLETED (owner-confirmed tested and accepted). | Documentation synchronization only; test evidence in historical entries remains unchanged and no new tests were executed by this edit. |
