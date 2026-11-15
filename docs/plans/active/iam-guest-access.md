# IAM guest access API plan

## 1. Metadata

- Branch: planned on `dev` @ `d0b9945`; implementation branch `feat/iam-guest-access` from latest `dev`
- Domain: `iam` (+ Gateway auth)
- Service: `iam-service` (credentials) and `api-gateway` (guard, actor)
- Feature: `iam-guest-access`
- Plan status: APPROVED (2026-11-15, user: all 6 items; D-G-01..08 as below)
- Updated: 2026-11-15
- Decision source: D-P-17 (2026-11-15) in `docs/plans/active/operations-personalization.md`; contract in `docs/architecture/business-service-api-recipe.md` section 5

## 2. Scope and references

- In scope:
  - IAM issues and validates an **anonymous guest session** (Guest Cart, MF01 AF01, BR31).
  - IAM issues and validates a **verified guest access token** after email OTP (All-NONE guest order, MF01 AF02, BR07).
  - Gateway accepts these credentials only on routes marked `@AllowGuest`, and builds `VerifiedActor` kinds `GUEST_SESSION` / `VERIFIED_GUEST`.
- Out of scope:
  - Commerce cart/order changes (Duy switches `OrderActorIdentity` to `VerifiedActor` separately).
  - Guest Cart migration on login (needs `RevokeGuestSession`, see D-G-08).
  - Any route that uses `@AllowGuest` (first consumers are Commerce cart/order routes).
  - Database schema: none. All state lives in Redis.
- Read:
  - `docs/plans/active/iam-me-guest-identity.md` (APPROVED D4–D10; D6: `guestProof` is link-account only; D10: guest order access needs its own plan; this is that plan)
  - `docs/requirements/MF01.md` (AF01, AF02, BR07, BR31, §8.4 identity)
  - `docs/architecture/business-service-api-recipe.md` §5, `.claude/rules/10`, `13`, `21`, `22`
  - Code: `apps/iam-service/src/persistence/redis/guest-identity.store.ts`, `application/users/guest-identity.service.ts`, `presentation/grpc/guest-identity.grpc.controller.ts`; Gateway `modules/iam/guest-identity/*`, `modules/iam/auth/guards/jwt-auth.guard.ts`, `common/grpc/verified-actor.ts`; `libs/common/src/utils/verified-actor.ts`; `libs/observability` (`ACTOR_TYPE.GUEST` exists)
- Not found (NEEDS_REVIEW): no product spec for guest token lifetimes or transport; values below are proposals (D-G-01..03).

## 3. API inventory

| API ID | Method | Endpoint | Flow | Permission | gRPC | Status |
| --- | --- | --- | --- | --- | --- | --- |
| IAM-012 | POST | `/api/v1/identities/guest/verify/confirm` | MF01 AF02 | Public + challenge | `ConfirmGuestIdentityVerification` (+ fields 4, 5) | EXISTING (`guest-identity.controller.ts`); change APPROVED |
| IAM-024 | POST | `/api/v1/identities/guest/sessions` | MF01 AF01 | Public + throttle | `CreateGuestSession` | APPROVED |
| IAM-INT-01 | — (gRPC only, Gateway caller) | — | MF01 AF01 | internal secret | `ValidateGuestSession` | APPROVED |
| IAM-INT-02 | — (gRPC only, Gateway caller) | — | MF01 AF02 | internal secret | `ValidateGuestAccessToken` | APPROVED |
| IAM-INT-03 | — (gRPC only, Gateway caller) | — | MF01 BR31 | internal secret | `RevokeGuestSession` | APPROVED (consumer: Guest Cart migration, Commerce) |
| GW-AUTH-01 | — (guard) | routes with `@AllowGuest` | MF01 AF01/AF02 | — | uses INT-01/02 | APPROVED |

## 4. Dependencies and order

1. IAM-INT-01 + IAM-024 — session store, create and validate (one Redis store, same tests).
2. IAM-012 change + IAM-INT-02 — access token issued at OTP confirm, then validated.
3. GW-AUTH-01 — needs INT-01 and INT-02 in the Gateway IAM client.
4. IAM-INT-03 — only when Guest Cart migration is planned.

## 5. API checklists

### IAM-024 — POST /api/v1/identities/guest/sessions

- Status: PROPOSED
- Domain / Feature / Service: iam / iam-guest-access / Gateway → IAM
- Main Flow: MF01 AF01 (Guest Cart)
- Purpose: give an anonymous browser/app a server-issued guest session before Add to Cart.
- Actor: anonymous (`@Public()`)
- Permission: none (public), Gateway throttler + IAM per-IP rate limit (D-G-05)
- Request: Params none. Query none. Body none (empty JSON). Client IP from the existing Gateway helper used by IAM-011.
- Response:
  - Success: 201 `data: { guestSessionToken: string, expiresAt: string (ISO) }`
  - Errors: 429 rate limited; 503 IAM/Redis unavailable
- Validation and business rules:
  - Token = `gs_` + 32 random bytes base64url (D-G-04). Returned once; IAM stores only `sha256(token)`.
  - Redis `iam:guest:session:<hash>` → `{ guestSessionId (UUID v4), createdAtMs, absoluteExpiresAtMs }`, TTL = sliding window (D-G-01).
  - No user, no customer identity, no role created.
  - Never log the token.
- Tables: none (Redis)
- gRPC method: `CreateGuestSession(CreateGuestSessionRequest{client_ip}) → CreateGuestSessionResponse{guest_session_token, expires_at}`
- Existing code: rate-limit Lua and prefixes in `guest-identity.store.ts` (reuse pattern, new prefix `iam:guest:session:`)
- Dependencies: none

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### IAM-INT-01 — gRPC ValidateGuestSession

- Status: PROPOSED
- Caller: Gateway only (`x-memora-internal-token`)
- Request: `{ guest_session_token }`. Response: `{ guest_session_id, expires_at }`.
- Rules: hash lookup; missing/expired → `UNAUTHENTICATED`; on success extend TTL by the sliding window but never past `absoluteExpiresAtMs` (D-G-01). Token format checked before Redis (length, `gs_` prefix) → malformed is `UNAUTHENTICATED`, not `INVALID_ARGUMENT`, so probing learns nothing.
- Errors: `UNAUTHENTICATED`, `UNAVAILABLE` (Redis).

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### IAM-012 (change) — POST /api/v1/identities/guest/verify/confirm

- Status: EXISTING endpoint; additive change PROPOSED
- Main Flow: MF01 AF02 (Guest Checkout All-NONE, verified email)
- Change: on successful OTP confirm (including the existing idempotent resume path), also issue a **guest access token**.
  - gRPC `ConfirmGuestIdentityVerificationResponse` adds `guest_access_token = 4`, `guest_access_expires_in_seconds = 5`.
  - HTTP response adds `guestAccessToken`, `guestAccessExpiresInSeconds`. `customerIdentityId`, `guestProof`, `expiresInSeconds` unchanged (D6 untouched: `guestProof` stays link-account only).
- Rules:
  - Token = `ga_` + 32 random bytes base64url; Redis `iam:guest:access:<hash>` → `{ customerIdentityId, scope: 'guest-order', expiresAtMs }`, fixed TTL (D-G-02), no sliding.
  - Index `iam:guest:access:by-identity:<customerIdentityId>` (set of hashes) for revocation on link (D-G-07).
  - Bound to exactly one `customerIdentityId`. No order access is granted by IAM; Commerce checks order ownership with that id.
- Errors: unchanged from IAM-012.

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### IAM-INT-02 — gRPC ValidateGuestAccessToken

- Status: PROPOSED
- Caller: Gateway only
- Request: `{ guest_access_token }`. Response: `{ customer_identity_id, expires_at }`.
- Rules: hash lookup, scope must be `guest-order`, identity must still exist, be email-verified and **not linked to a user** (`user_id IS NULL`); otherwise `UNAUTHENTICATED`. Malformed token → `UNAUTHENTICATED`.
- Errors: `UNAUTHENTICATED`, `UNAVAILABLE`.

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### IAM-INT-03 — gRPC RevokeGuestSession

- Status: APPROVED
- Caller: Gateway only. Used by the Guest Cart migration flow (MF01 BR31), which Commerce plans and builds.
- Request: `{ guest_session_token }`. Response: `{ revoked: bool }` (false when already gone).
- Rules: hash lookup and delete; idempotent; malformed token → `UNAUTHENTICATED`. Never revokes anything else.
- Note for Commerce (Duy), Guest Cart migration: after login, the Gateway still holds the `X-Guest-Session` token from the request. Order of calls: (1) Gateway validates the session (INT-01) → `guestSessionId`; (2) Commerce merges valid `IN_CART` drafts from that guest cart into the user's cart, keyed by `guestSessionId` (BR31: no silent overwrite); (3) only after a successful merge, Gateway calls `RevokeGuestSession` with the token. Commerce never receives or stores the token itself.

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### GW-AUTH-01 — Gateway guest guard and actor

- Status: PROPOSED
- Pieces:
  - Decorator `@AllowGuest({ session?: boolean, verified?: boolean })` (metadata key in `AUTH_METADATA`, e.g. `auth:allow-guest`).
  - `JwtAuthGuard` order stays `JwtAuthGuard → RolesGuard → PermissionsGuard`:
    1. `@Public()` → unchanged.
    2. `Authorization: Bearer` present → unchanged USER flow; guest headers ignored (D-G-06).
    3. No Bearer, route has `@AllowGuest`:
       - `X-Guest-Access` and `verified: true` → `ValidateGuestAccessToken` → `request.guest = { kind: 'VERIFIED_GUEST', customerIdentityId }`.
       - else `X-Guest-Session` and `session: true` → `ValidateGuestSession` → `request.guest = { kind: 'GUEST_SESSION', guestSessionId }`.
       - both headers sent → use `X-Guest-Access` if allowed, else session.
    4. Otherwise 401 (same body as today, no hint about which credential failed).
  - Actor context for logs: `ACTOR_TYPE.GUEST` (exists), actor id = guest session id or customer identity id; never the token.
  - `toVerifiedActor`: add `toGuestVerifiedActor(request.guest)` (or an overload taking the request) that returns `{ customerIdentityId }` or `{ guestSessionId }`. `toVerifiedActor(principal)` for users unchanged.
  - Decorator `@CurrentGuest()` to read `request.guest` (mirrors `@CurrentUser()`).
  - A route with RBAC metadata (`@RequirePermissions`, `@Roles`) never admits a guest: Roles/Permissions guards keep requiring `request.user` (401). Add a startup or unit check that `@AllowGuest` is not combined with RBAC metadata.
  - CORS: allow request headers `X-Guest-Session`, `X-Guest-Access`.
- Tables: none

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

## 6. Acceptance criteria and test cases

### IAM-024 / IAM-INT-01

- [x] Create returns `gs_` token and future `expiresAt`; Redis holds only the hash
- [x] Validate valid token → session id; extends TTL; never past absolute expiry
- [x] Unknown, expired, malformed, wrong-prefix token → `UNAUTHENTICATED`
- [ ] Per-IP rate limit → 429 (HTTP) / `RESOURCE_EXHAUSTED` (gRPC)
- [ ] Redis down → 503 / `UNAVAILABLE`
- [ ] Token never appears in logs or error messages

### IAM-012 change / IAM-INT-02

- [x] Confirm returns `guestAccessToken` + existing fields; idempotent resume returns a valid token and no second identity
- [x] Validate → `customerIdentityId`; expires after fixed TTL, no sliding
- [x] Identity linked to a user (after IAM-014) → `UNAUTHENTICATED`; tokens indexed for that identity are deleted (D-G-07)
- [x] `guestProof` still works only for link-account; access token cannot be used as `guestProof` and vice versa

### GW-AUTH-01

- [x] Route without `@AllowGuest`: guest headers → 401
- [x] `@AllowGuest({session:true})` + valid session → handler sees `GUEST_SESSION`; `VerifiedActor` has only `guestSessionId`
- [x] `@AllowGuest({verified:true})` + valid access token → `VERIFIED_GUEST`; session header alone → 401
- [x] Bearer + guest header → USER, guest ignored
- [x] Invalid guest token → 401 with the same message as missing Bearer
- [x] `@AllowGuest` + `@RequirePermissions` → rejected by the check
- [x] `parseVerifiedActor` on the service side accepts what `toGuestVerifiedActor` produces

## 7. Pending decisions

- [x] D-G-01 DECIDED: anonymous session 7 days sliding, 30 days absolute.
- [x] D-G-02 DECIDED: verified guest token 24 hours fixed; re-verify email OTP after that.
- [x] D-G-03 DECIDED: headers `X-Guest-Session` / `X-Guest-Access` (web and mobile), not cookies.
- [x] D-G-04 APPROVED with the plan: `gs_` / `ga_` + 32 random bytes base64url, stored as SHA-256.
- [x] D-G-05 APPROVED with the plan: IAM-024 limited to 20 sessions per IP per hour.
- [x] D-G-06 APPROVED with the plan: Bearer wins when Bearer and guest headers are both present.
- [x] D-G-07 DECIDED: revoke all guest access tokens of an identity when IAM-014 links it to a user.
- [x] D-G-08 DECIDED: build `RevokeGuestSession` now; Guest Cart migration itself is Commerce's (see IAM-INT-03 note for Duy).

## 8. Implementation progress log

| Date | API ID | Result | Evidence |
| --- | --- | --- | --- |
| 2026-11-15 | IAM-024, INT-01..03, IAM-012, GW-AUTH-01 | PASS (unit) | 4 unit spec files (IAM service/store/guest-identity, Gateway guard/policy/actor) = 43 tests pass with existing IAM/Gateway/libs-auth specs; specs deleted after run per core rule. Redis Lua scripts, live gRPC and HTTP 429/503 mapping NOT RUN (service-level 429/UNAUTHENTICATED/503 only, Redis mocked). |
| 2026-11-15 | all | PASS | typecheck, proto:check, nest build iam-service, nest build api-gateway, eslint + prettier on touched src files, check-boundaries (0 findings), guardrails test (8 pass) |
