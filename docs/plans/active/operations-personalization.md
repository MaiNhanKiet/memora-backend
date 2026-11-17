# Operations Personalization API plan

## 1. Metadata

- Branch: `dev` at `eca28ed` when planned. Implementation needs its own branch from latest `dev` (proposed `feat/personalization-capture`).
- Domain: `personalization`
- Service: `operations-service` (Gateway HTTP → Operations gRPC)
- Feature: Consent, Fingerprint capture (IoT), Soundwave upload, sources, placement, approvals, change requests
- Plan status: AWAITING_APPROVAL (decisions D-P-01..16 recorded in section 8; API IDs not yet approved)
- Updated: 2026-11-13
- Source plan: `docs/plans/MEMORA_OPERATIONS_SERVICE_API_IOT_PLAN_FOR_CLAUDE.md` (engineering proposal, not approval)

## 2. Scope and references

- **In scope:** the 25 Personalization IDs `PERSO-001..025`. Phase 0 audit result. First vertical slice `PERSO-001..008`.
- **Out of scope:** Production, Fulfillment, After-sales (60 IDs, later plans). Commerce internals (owner: Phạm Quốc Duy). IAM changes. Python worker code. AS608/ESP32 firmware (Phase 1 is hardware work outside this repo).
- **Read:**
  - `docs/plans/MEMORA_OPERATIONS_SERVICE_API_IOT_PLAN_FOR_CLAUDE.md`
  - `docs/requirements/MEMORA_BM04_Review2_Commitment.md` §3 (F-02, F-12, F-13), §6.1 WF-01 (AC, TC-WF01-F-02/F-12/F-13, DS-01a/b)
  - `docs/architecture/memora-backend-4-service.md`, `business-service-structure.md`, `business-service-api-recipe.md`
  - `db/MEMORA_BM04_PostgreSQL_74_tables.sql` (personalization DDL + CHECK lines 1327–1356), `db/MEMORA_BM04_SQL_README.md`
  - `apps/operations-service/prisma/schema.prisma` (9 personalization models)
  - `libs/contracts/src/iam/permissions.ts` (catalog + role grants)
  - `proto/` on `dev` and on `origin/DuyPQ`
  - `apps/operations-service/src/**`
- **Not found (NEEDS_REVIEW):**
  - API Master spreadsheet, MF01–MF04 `.md` files, Database Tracker `FIELDS/RELATION_RULES/DECISIONS`: only linked in the source plan, not in the workspace. Not opened.
  - Any Commerce Order / P1 / Ring Item Version contract (no `proto/ordering`, no `proto/commerce` on `dev`; `origin/DuyPQ` has only `CatalogService` with 4 read RPCs).
  - Object storage (no S3/MinIO dependency in `package.json`).
  - Python fingerprint worker (no `.py` in the repo).

## 3. Phase 0 audit findings

### 3.1 Repository state

| Item | Finding |
|---|---|
| Git | `dev` at `eca28ed`, clean except the two untracked plan files in `docs/plans/` |
| Operations app | Foundation only: `PersonalizationModule` is an empty `@Module({})`. gRPC host, proto registry, `OperationsInternalGrpcAuthGuard`, `PrismaService` exist. No business RPC, no feature folder |
| Deploy | `operations-service` runs on the Mini PC (CD on `main` passes `--enable-domain-services`), DB role `operations_app` with DML on its 4 schemas only |
| Gateway | No Operations client, no personalization route. Helpers `domainGrpcClientOptions` / `DomainGrpcClient` exist. `OPERATIONS_GRPC_URL` not set |
| Proto | Only `iam`, `common`, `grpc/health`. No `proto/personalization` |
| Tests | Jest unit tests only. No integration test harness for Operations |

### 3.2 Schema (9 tables, live on server, from BM04 baseline)

| Table | Key constraints present | Gap for the plan |
|---|---|---|
| `consents` | `status` default `ACCEPTED`, `consent_type`, `policy_version`, `accepted_at`, `revoked_at` | No CHECK on `status`/`consent_type` (README lists them as generic CHECK, values undecided). No source type / purpose column |
| `consent_ring_items` | unique `(consent_id, ring_item_id)` | OK |
| `capture_sessions` | status `CREATED/IN_PROGRESS/COMPLETED/FAILED/CANCELLED/EXPIRED`; `COMPLETED` ⇔ `accepted_source_id`; `source_plan_mode N/A/SHARED/SEPARATE` | No `expires_at`, no store id, no device registration, no idempotency key |
| `capture_attempts` | `attempt_no 1..3`, unique `(session, attempt_no)`, one `ACCEPTED` per session (partial unique), `result ACCEPTED/REJECTED/ERROR`, ACCEPTED requires score ≥ threshold | No nonce / device proof / asset reference columns (`metadata_json` only). **Prisma models the partial unique as a 1:1 relation (`capture_attempts?`)**, so `include` returns at most one attempt |
| `personalization_sources` | type `FINGERPRINT/SOUNDWAVE`, status `PENDING/ACCEPTED/PROCESSING/READY/PROCESSING_FAILED/DELETED`, asset key ⇔ checksum | No `order_id`; no processing job id / retry count (needed by `PERSO-012/013`) |
| `source_bindings` | one active binding per Ring Item (partial unique), mode `N/A/SHARED/SEPARATE` | OK |
| `personalization_placements` | one placement per Ring Item Version, angle/offset/size/rotation bounds, SW segment start/end | Template min/max scale comes from Commerce Catalog (no contract) |
| `design_reviews` | `CUSTOMER_APPROVAL→APPROVE`, `MANAGER_REVIEW→APPROVE/REQUEST_CHANGES` (notes required) | OK |
| `change_requests` | `SUBMITTED/APPLIED/REJECTED`, one SUBMITTED per Ring Item | New version is created in Commerce (`ordering.ring_item_versions`) |

No Prisma migrations exist for Operations; the live schema came from `db/` DDL. How schema changes are applied (Prisma migrate baseline vs. SQL in `db/`) is undecided.

### 3.3 RBAC (approved catalog, `libs/contracts/src/iam/permissions.ts`)

| Code | Granted to | Usable for |
|---|---|---|
| `SOURCE_CAPTURE` | STORE_STAFF | PERSO-005..008 |
| `SOURCE_AUDIO_UPLOAD_OWN` | CUSTOMER | PERSO-009/010 |
| `DESIGN_SUBMIT_OWN` | CUSTOMER | PERSO-019 |
| `DESIGN_REVIEW` | MANAGER | PERSO-020..022 |
| `DESIGN_CHANGE_APPROVE` | MANAGER | PERSO-024/025 |
| `ORDER_READ_OPERATIONS` | STORE_STAFF, MANAGER | staff reads (if approved for this use) |

No approved code for: accepting/listing/revoking Consent, setting the source plan, listing sources, binding sources, saving placement, customer approval, or customer change request. Those APIs stay `NEEDS_REVIEW` (do not infer a code from a role).

### 3.4 Cross-service dependencies (none exist yet)

| Need | Owner | Status |
|---|---|---|
| Order context (owner, items, package, source plan) | Commerce | No contract |
| Trusted P1 SUCCEEDED | Commerce | No contract |
| Current Ring Item Version, status transitions (`READY_FOR_REVIEW`, `SUBMITTED`) | Commerce | No contract; status enums undecided |
| Template engraving constraints (`ENGRAVE_SURFACE`, min/max scale) | Commerce Catalog | `GetRingTemplateDetail` exists on `DuyPQ` only, fields not checked for engraving data |
| User → customer identity | IAM | `GetMyCustomerIdentity` exists |
| Actor identity passed Gateway → Operations | IAM / Gateway | Decided (D-P-03): `memora.common.v1.VerifiedActor` in each request, see `docs/architecture/business-service-api-recipe.md` section 5. `actor.proto` and contract not created yet |

## 4. API inventory

| API ID | Method | Endpoint | Flow | Permission | gRPC | Status |
|---|---|---|---|---|---|---|
| PERSO-001 | POST | /api/v1/orders/{orderId}/consents | WF-01 F-02 | CONSENT_MANAGE_OWN | AcceptConsent | APPROVED |
| PERSO-002 | GET | /api/v1/orders/{orderId}/consents | WF-01 F-02 | CONSENT_MANAGE_OWN | ListConsents | APPROVED |
| PERSO-003 | POST | /api/v1/orders/{orderId}/consents/{consentId}/revoke | WF-01 F-13 | CONSENT_MANAGE_OWN | RevokeConsent | APPROVED |
| PERSO-004 | PUT | /api/v1/orders/{orderId}/source-plan | WF-01 F-13 | NEEDS_REVIEW | SetSourcePlan | NEEDS_REVIEW |
| PERSO-005 | POST | /api/v1/orders/{orderId}/fingerprint/capture-sessions | WF-01 F-02 | SOURCE_CAPTURE | CreateCaptureSession | APPROVED |
| PERSO-006 | GET | /api/v1/fingerprint/capture-sessions/{sessionId} | WF-01 F-02 | SOURCE_CAPTURE | GetCaptureSession | APPROVED |
| PERSO-007 | MQTT | MQTT `memora/capture/{deviceCode}/attempts` | WF-01 F-02 | device broker user + ACL (D-P-07) | none (MQTT) | APPROVED |
| PERSO-008 | POST | /api/v1/fingerprint/capture-sessions/{sessionId}/complete | WF-01 F-02 | SOURCE_CAPTURE | CompleteCaptureSession | APPROVED |
| PERSO-026 | GET | /api/v1/fingerprint/capture-sessions/{sessionId}/attempts/{attemptNo}/image | WF-01 F-02 | SOURCE_CAPTURE | GetCaptureAttemptImage | APPROVED |
| PERSO-027 | POST | /api/v1/fingerprint/capture-sessions/{sessionId}/attempts/{attemptNo}/reject | WF-01 F-02 | SOURCE_CAPTURE | RejectCaptureAttempt | APPROVED |
| PERSO-009 | POST | /api/v1/orders/{orderId}/soundwave/uploads/initiate | WF-01 F-02 | SOURCE_AUDIO_UPLOAD_OWN | InitiateSoundwaveUpload | PROPOSED |
| PERSO-010 | POST | /api/v1/orders/{orderId}/soundwave/uploads/complete | WF-01 F-02 | SOURCE_AUDIO_UPLOAD_OWN | CompleteSoundwaveUpload | PROPOSED |
| PERSO-011 | GET | /api/v1/orders/{orderId}/personalization-sources | WF-01 F-02 | NEEDS_REVIEW | ListSources | NEEDS_REVIEW |
| PERSO-012 | GET | /api/v1/personalization-sources/{sourceId}/processing | WF-01 F-02 | NEEDS_REVIEW | GetSourceProcessing | NEEDS_REVIEW |
| PERSO-013 | INTERNAL | internal: process source | WF-01 F-02 | internal only | ProcessSource | NEEDS_REVIEW |
| PERSO-014 | POST | /api/v1/orders/{orderId}/source-bindings | WF-01 F-13 | NEEDS_REVIEW | BindSource | NEEDS_REVIEW |
| PERSO-015 | GET | /api/v1/orders/{orderId}/items/{ringItemId}/placement | WF-01 F-12 | NEEDS_REVIEW | GetPlacement | NEEDS_REVIEW |
| PERSO-016 | PUT | /api/v1/orders/{orderId}/items/{ringItemId}/placement | WF-01 F-12 | NEEDS_REVIEW | SavePlacement | NEEDS_REVIEW |
| PERSO-017 | POST | /api/v1/orders/{orderId}/items/{ringItemId}/placement/validate | WF-01 F-12 | NEEDS_REVIEW | ValidatePlacement | NEEDS_REVIEW |
| PERSO-018 | POST | /api/v1/orders/{orderId}/items/{ringItemId}/customer-approvals | WF-01 F-02 | NEEDS_REVIEW | ApproveItemDesign | NEEDS_REVIEW |
| PERSO-019 | POST | /api/v1/orders/{orderId}/items/{ringItemId}/submit-review | WF-01 / WF-02 | DESIGN_SUBMIT_OWN | SubmitForReview | PROPOSED |
| PERSO-020 | GET | /api/v1/admin/design/reviews | WF-02 F-04 | DESIGN_REVIEW | ListDesignReviews | PROPOSED |
| PERSO-021 | GET | /api/v1/admin/design/reviews/{reviewId} | WF-02 F-04 | DESIGN_REVIEW | GetDesignReview | PROPOSED |
| PERSO-022 | POST | /api/v1/admin/design/reviews/{reviewId}/decide | WF-02 F-04 | DESIGN_REVIEW | DecideDesignReview | PROPOSED |
| PERSO-023 | POST | /api/v1/orders/{orderId}/items/{ringItemId}/change-requests | WF-02 F-12 | NEEDS_REVIEW | CreateChangeRequest | NEEDS_REVIEW |
| PERSO-024 | GET | /api/v1/admin/design/change-requests | WF-02 F-12 | DESIGN_CHANGE_APPROVE | ListChangeRequests | PROPOSED |
| PERSO-025 | POST | /api/v1/admin/design/change-requests/{changeRequestId}/decide | WF-02 F-12 | DESIGN_CHANGE_APPROVE | DecideChangeRequest | PROPOSED |

Count: 0 EXISTING, 9 APPROVED, 8 PROPOSED, 10 NEEDS_REVIEW. gRPC names are candidates, not an approved proto.

## 5. Dependencies and order

0. **Foundation (no API ID):** `proto/personalization/v1`, contract types, registry entry, Gateway `personalization` module + Operations client, `proto/common/v1/actor.proto` + `libs/contracts/src/common/actor.ts` (D-P-03, decided), Commerce/IAM fakes for tests. Needs D-P-04.
1. PERSO-001..003 — Consent gates every capture/upload. Blocked on a permission code (D-P-01) and Commerce P1/Order contract (D-P-04).
2. PERSO-004 — Source plan. Blocked on ownership (D-P-05).
3. PERSO-005, 006 — Session create/read. Depend on 001 (accepted Consent) and P1.
4. PERSO-007 — Attempt. Depends on Phase 1 hardware evidence and device trust (D-P-06, D-P-07).
5. PERSO-008 — Complete. Depends on 007 and object storage (D-P-08).
6. PERSO-013, 012 — Processing. Depend on Python worker (D-P-09).
7. PERSO-009, 010 — Soundwave. Depend on 001 and object storage.
8. PERSO-011, 014 — Source list and binding. Depend on 008/010.
9. PERSO-015..017 — Placement. Depend on 014 and Catalog constraints.
10. PERSO-018, 019 — Customer approval and submit. Depend on placement and Commerce version transitions.
11. PERSO-020..022 — Manager review. Depend on 019.
12. PERSO-023..025 — Change requests. Depend on Commerce new-version contract.

The first API that can be built without an unresolved permission is **PERSO-005** (and 006, 008), but it still needs PERSO-001 data and a Commerce P1 answer. A fake Commerce/Consent in tests is allowed; a fake in production is not.

## 6. API checklists

### Consent slice foundation (shared by PERSO-001..003)

- Proto: new `proto/personalization/v1/personalization.proto`, package `memora.personalization.v1`, service `ConsentService` with `AcceptConsent`, `ListConsents`, `RevokeConsent`. Every request has `memora.common.v1.VerifiedActor actor = 1`. Registered in `apps/operations-service/src/grpc/operations-grpc.registry.ts`.
- Contracts: `libs/contracts/src/personalization/consent.grpc.ts`, exported from `libs/contracts/src/index.ts`.
- Operations feature: `apps/operations-service/src/modules/personalization/consent/` (presentation / application / persistence). Use cases call `requireCustomerActor` (FP/SW needs login, D-P-17).
- Order facts: `OrderPersonalizationContextPort` gets a real adapter that calls Commerce `memora.commerce.v1.OrderingService.GetOrderPersonalizationContext` (already on `dev`). Operations needs `COMMERCE_GRPC_URL` and `COMMERCE_INTERNAL_GRPC_SECRET` (same secret the Commerce guard checks). Commerce `NOT_FOUND` → `undefined`; other errors fail closed (`UNAVAILABLE`).
- Config: `OPERATIONS_CONSENT_POLICY_VERSION` (string ≤50). Required outside development; dev default `dev-1`.
- Gateway: new `apps/api-gateway/src/modules/personalization/consent/` feature, Operations gRPC client from the existing domain-client helpers, `OPERATIONS_GRPC_URL` + `OPERATIONS_INTERNAL_GRPC_SECRET`. Routes need Bearer + `@RequirePermissions('CONSENT_MANAGE_OWN')`; no `@AllowGuest`. Actor via `toVerifiedActor(principal)`.
- Response shape `Consent`: `{ consentId, orderId, consentType, policyVersion, status, acceptedAt, revokedAt|null, ringItemIds[] }`. Never returns `evidence_metadata_json`.
- Error mapping (gRPC → HTTP): `INVALID_ARGUMENT` 400, `PERMISSION_DENIED` 403, `NOT_FOUND` 404, `FAILED_PRECONDITION`/`ALREADY_EXISTS` 409, `UNAVAILABLE` 503.

### PERSO-001 — POST /api/v1/orders/{orderId}/consents

- Status: APPROVED (user, 2026-11-15)
- Domain / Feature / Service: personalization / consent / operations-service
- Main Flow: MF01 (WF-01 F-02 AC1, F-13 AC1)
- Purpose: record versioned, source-type-scoped Consent for 1–2 Ring Items after P1 is paid.
- Actor: logged-in Customer who owns the Order.
- Permission: `CONSENT_MANAGE_OWN` (RBAC v1.1).
- Request:
  - Params: `orderId` (uuid).
  - Body: `consentType` (`FINGERPRINT_PROCESSING` | `SOUNDWAVE_PROCESSING`), `policyVersion` (string, the version the FE showed), `ringItemIds` (1–2 unique uuids).
- Response:
  - Success: `201 Consent`.
  - Errors: 400 validation; 401; 403 not the order owner; 404 order not found; 409 `P1_NOT_PAID`, `POLICY_VERSION_MISMATCH`, `RING_ITEM_NOT_IN_ORDER`, `PACKAGE_MISMATCH`, `SHARED_SCOPE_NOT_ALLOWED`, `ITEM_ALREADY_CONSENTED`; 503 Commerce unavailable.
- Validation and business rules:
  - Order facts come only from Commerce (`p1Paid`, owner, items). The client never claims payment.
  - `ownerCustomerIdentityId` must equal the actor's `customerIdentityId`.
  - `policyVersion` must equal `OPERATIONS_CONSENT_POLICY_VERSION`.
  - Each item belongs to the order; its package matches the type (`FINGERPRINT` ↔ `FINGERPRINT_PROCESSING`, `SOUNDWAVE` ↔ `SOUNDWAVE_PROCESSING`).
  - Two items only when the order `sourcePlanMode` is `SHARED`; otherwise exactly one.
  - Idempotent: an `ACCEPTED` consent with the same customer, order, type and exact item set is returned as is (201, no new row). An item already in another `ACCEPTED` consent of the same type → 409.
  - Writes `consents` (`status=ACCEPTED`, `accepted_at=now`, `channel='WEB'`, `evidence_metadata_json={}`) and `consent_ring_items` in one transaction.
- Tables: `personalization.consents`, `personalization.consent_ring_items`.
- gRPC method: `ConsentService.AcceptConsent`.
- Existing code: none (port + fake only).
- Dependencies: Commerce `GetOrderPersonalizationContext` (on dev), RBAC v1.1.

### PERSO-002 — GET /api/v1/orders/{orderId}/consents

- Status: APPROVED (user, 2026-11-15)
- Main Flow: MF01 (WF-01 F-02)
- Purpose: let the owner see Consent state per Ring Item before capture/upload.
- Actor / Permission: logged-in Customer, `CONSENT_MANAGE_OWN`. Staff reads are out of scope.
- Request: Params `orderId` (uuid). No query.
- Response: `200 { items: Consent[] }`, newest first, all statuses. Errors 400, 401, 403.
- Rules: filters by `order_id` and the actor's `customer_identity_id`; no Commerce call. Another customer's order returns an empty list (no existence leak).
- Tables: `consents`, `consent_ring_items`.
- gRPC method: `ConsentService.ListConsents`.

### PERSO-003 — POST /api/v1/orders/{orderId}/consents/{consentId}/revoke

- Status: APPROVED (user, 2026-11-15)
- Main Flow: MF01 (WF-01 F-13)
- Purpose: let the owner withdraw Consent before the design is submitted.
- Actor / Permission: logged-in Customer, `CONSENT_MANAGE_OWN`.
- Request: Params `orderId`, `consentId` (uuid). No body.
- Response: `200 Consent` (`status=REVOKED`, `revokedAt`). Errors 400, 401, 404 (not found, other order, or not the owner), 409 `CONSENT_LOCKED`, 503.
- Rules:
  - Already `REVOKED` → 200 with the same row (idempotent).
  - D-P-13: if any linked Ring Item's current version status (from Commerce) is `SUBMITTED` or `MANAGER_APPROVED`, return 409 `CONSENT_LOCKED`.
  - Update is conditional (`WHERE status='ACCEPTED'`) so parallel revokes write once.
  - Revoke only changes the consent row. Effects on sources and sessions belong to later APIs; retention (D-OPS-08) stays open.
- Tables: `consents`, `consent_ring_items`.
- gRPC method: `ConsentService.RevokeConsent`.

#### implement-api checklist (each of PERSO-001..003)

- [x] Approved method, path, request, response, and permission confirmed
- [x] No duplicate route, RPC, DTO, or migration
- [x] Owning service enforces rules and data ownership
- [x] Gateway DTO, auth, error mapping, and Swagger match the contract
- [x] Checks recorded with PASS/FAIL/NOT RUN

Implementation notes (2026-11-15):
- Reason codes travel as the gRPC error message (`details`); the Gateway consent client maps `FAILED_PRECONDITION` to 409 (the shared mapper uses 412) and exposes the reason as `message`.
- Parallel accepts for one order are serialized with `pg_advisory_xact_lock` inside the insert transaction (no DB unique on item + type).
- The Gateway Operations target is optional (`domainGrpcClientOptions({ optional: true })`): unset → 503, boot does not fail.
- Operations now requires `COMMERCE_GRPC_URL`, `COMMERCE_INTERNAL_GRPC_SECRET`, and `OPERATIONS_CONSENT_POLICY_VERSION` (outside development). The server `deploy/secrets/operations.env` must have them before the next `main` deploy.

### Fingerprint capture slice foundation (shared by PERSO-005..008)

- Proto: extend `proto/personalization/v1/personalization.proto` with service `FingerprintCaptureService` (`CreateCaptureSession`, `GetCaptureSession`, `CompleteCaptureSession`), each with `VerifiedActor actor = 1`. The device path (PERSO-007) is MQTT into Operations, not gRPC (D-P-07 revised).
- Operations feature: `apps/operations-service/src/modules/personalization/fingerprint-capture/`. Staff use cases call `requireUserActor`; `staff_user_id` = actor `userId`.
- No store table exists (D-P-11): any user with `SOURCE_CAPTURE` may operate any session. Store scoping is out of scope.
- Config (Operations): `OPERATIONS_CAPTURE_SESSION_TTL_SECONDS` (default 900), `OPERATIONS_CAPTURE_QUALITY_THRESHOLD` (number; required outside development, D-P-10), `OPERATIONS_CAPTURE_DEVICE_CODES` (comma list of registered devices), `OPERATIONS_MQTT_URL`, `OPERATIONS_MQTT_USERNAME`, `OPERATIONS_MQTT_PASSWORD`, and the existing `OPERATIONS_OBJECT_STORAGE_*` (Garage, D-P-08). Object storage uses `@aws-sdk/client-s3` (user-approved 2026-11-15).
- Expiry is `created_at + TTL`, applied lazily: a CREATED/IN_PROGRESS session past expiry is marked `EXPIRED` when read or written.
- Session states: `CREATED` → `IN_PROGRESS` (first attempt, `started_at`) → `COMPLETED` (008) | `FAILED` (3 attempts, none accepted) | `EXPIRED`.
- Response shape `CaptureSession`: `{ sessionId, orderId, consentId, deviceCode, status, attemptCount, maxAttempts: 3, expiresAt, createdAt, acceptedSourceId|null, attempts: [{ attemptNo, result, qualityScore, attemptedAt }] }`. Never returns images, asset keys, checksums, nonces or device secrets.
- Error mapping as Consent (400/403/404/409/503), reason code in the message.

### PERSO-005 — POST /api/v1/orders/{orderId}/fingerprint/capture-sessions

- Status: APPROVED (user, 2026-11-15)
- Main Flow: MF01-S07 (WF-01 F-02 AC2)
- Actor / Permission: Store Staff, `SOURCE_CAPTURE`.
- Request: Params `orderId`. Body `consentId` (uuid), `deviceCode` (string ≤80).
- Response: `201 CaptureSession` (`status=CREATED`). Errors 400 `UNKNOWN_DEVICE`, 401, 403, 404 `ORDER_NOT_FOUND`/`CONSENT_NOT_FOUND`, 409 `P1_NOT_PAID`, `CONSENT_NOT_ACCEPTED`, `CONSENT_TYPE_MISMATCH`, `PACKAGE_MISMATCH`, `SESSION_ALREADY_OPEN`, `SOURCE_ALREADY_CAPTURED`, 503.
- Rules:
  - Operations rejects a `deviceCode` not in `OPERATIONS_CAPTURE_DEVICE_CODES` (400 `UNKNOWN_DEVICE`).
  - After commit, Operations publishes a `start` command to the device (MQTT, see PERSO-007). A publish failure is logged; the session still exists and the command can be re-sent by re-reading (PERSO-006 does not re-send; the device may also request it, see PERSO-007).
  - Consent belongs to the order, is `ACCEPTED`, type `FINGERPRINT_PROCESSING`.
  - Commerce: order exists, `p1Paid`, every consented item is still `FINGERPRINT`. `source_plan_mode` is snapshotted from Commerce.
  - At most one open (non-expired CREATED/IN_PROGRESS) session per consent and per device; a consent with a COMPLETED session → `SOURCE_ALREADY_CAPTURED`. Checked inside one transaction with an advisory lock.
- Tables: `capture_sessions` (reads `consents`, `consent_ring_items`).

### PERSO-006 — GET /api/v1/fingerprint/capture-sessions/{sessionId}

- Status: APPROVED (user, 2026-11-15)
- Actor / Permission: Store Staff, `SOURCE_CAPTURE`.
- Response: `200 CaptureSession`. Errors 400, 401, 403, 404 `SESSION_NOT_FOUND`.
- Rules: the store tablet polls this while the device captures. Applies lazy expiry. No biometric data.
- Tables: `capture_sessions`, `capture_attempts`.

### PERSO-007 — MQTT capture attempt (device → Operations)

- Status: APPROVED (user, 2026-11-15). Production use stays BLOCKED until D-P-06 hardware proof.
- Transport (D-P-07 revised 2026-11-15, amended): MQTT, broker Eclipse Mosquitto 2 in `deploy/infra`, port 1883 on the Tailscale IP only (local 127.0.0.1:1883); field devices use MQTT over WebSocket + TLS via Cloudflare Tunnel (`mosquitto:9001`). No HTTP route.
- Device auth: one broker user per device (username = `deviceCode`), password file + ACL. A device may only use `memora/capture/<own deviceCode>/#`; Operations uses its own broker user with access to `memora/capture/#`. Operations trusts the `deviceCode` taken from the topic.
- Topics (QoS 1, not retained, JSON UTF-8):
  - `memora/capture/{deviceCode}/commands` (Operations → device): `{ "type": "start", "sessionId", "expiresAt", "maxAttempts": 3 }`.
  - `memora/capture/{deviceCode}/attempts` (device → Operations): `{ "sessionId", "nonce" (16–64 chars), "qualityScore" (0–1000), "imageBase64" (raw AS608 image, required when the device considers the capture usable), "firmwareVersion"? }`. Max message 256 KB (broker limit).
  - `memora/capture/{deviceCode}/results` (Operations → device): `{ "sessionId", "nonce", "ok": true, "attemptNo", "result", "remainingAttempts", "sessionStatus" }` or `{ "sessionId", "nonce", "ok": false, "error": "<REASON>" }`.
  - `memora/capture/{deviceCode}/hello` (device → Operations, optional): on connect; Operations answers with a `start` command if the device has an open session.
- Errors (in `results`): `INVALID_MESSAGE`, `SESSION_NOT_FOUND`, `DEVICE_MISMATCH`, `SESSION_NOT_OPEN`, `SESSION_EXPIRED`, `MAX_ATTEMPTS_REACHED`, `ATTEMPT_ALREADY_ACCEPTED`, `IMAGE_REQUIRED`, `IMAGE_TOO_LARGE`, `DUPLICATE_NONCE` (replays answer with the original result when it is known), `INTERNAL_ERROR`.
- Rules:
  - The session must be bound to the topic's `deviceCode`.
  - Nonce dedupe: a nonce already recorded on the session (`capture_attempts.metadata_json.nonce`) is not inserted again (QoS 1 redelivery is normal).
  - Server allocates `attempt_no` (1..3) and decides the result: `ACCEPTED` iff `qualityScore` ≥ `OPERATIONS_CAPTURE_QUALITY_THRESHOLD`, else `REJECTED`; threshold snapshotted per attempt.
  - Only an ACCEPTED attempt's image is stored: Garage key `personalization/fingerprint/raw/{sessionId}/{attemptId}`, SHA-256 checksum, both in `capture_attempts.metadata_json` (D-P-11). Rejected images are discarded.
  - First attempt sets `IN_PROGRESS` + `started_at`; the 3rd non-accepted attempt sets `FAILED` + `ended_at`.
  - Upload before the DB insert; if the insert fails, delete the object (best effort).
- Message contract for firmware: `docs/api/personalization/fingerprint-capture-mqtt.md`.
- Tables: `capture_attempts`, `capture_sessions`.

### PERSO-008 — POST /api/v1/fingerprint/capture-sessions/{sessionId}/complete

- Status: APPROVED (user, 2026-11-15)
- Actor / Permission: Store Staff, `SOURCE_CAPTURE`.
- Request: Params `sessionId`. No body (the server uses the single ACCEPTED attempt).
- Response: `200 CaptureSession` (`status=COMPLETED`, `acceptedSourceId`). Errors 400, 401, 403, 404, 409 `NO_ACCEPTED_ATTEMPT`, `SESSION_NOT_OPEN`, `SESSION_EXPIRED`, `CONSENT_NOT_ACCEPTED`.
- Rules:
  - Already COMPLETED → 200 with the same source (idempotent).
  - Consent must still be ACCEPTED (revoked meanwhile → 409).
  - One transaction: create `personalization_sources` (`owner_customer_identity_id` from the consent, `source_type=FINGERPRINT`, `status=ACCEPTED`, `raw_asset_key`, `raw_checksum`, `captured_or_uploaded_by_user_id` = staff, `captured_at` = attempt time, `accepted_at` = now); set session `COMPLETED`, `accepted_source_id`, `ended_at`; set `consents.personalization_source_id`. Conditional update on session status so parallel completes create one source.
  - Processing (PERSO-013) and binding (PERSO-014) are not triggered here.
- Tables: `capture_sessions`, `capture_attempts`, `personalization_sources`, `consents`.

### PERSO-026 — GET /api/v1/fingerprint/capture-sessions/{sessionId}/accepted-image

- Status: APPROVED (user, 2026-11-15)
- Purpose: staff confirmation step (user decision 2026-11-15: automatic threshold + staff confirms). The tablet shows the ACCEPTED image before the staff completes (PERSO-008) or rejects (PERSO-027).
- Actor / Permission: Store Staff, `SOURCE_CAPTURE`.
- Response: `200 { attemptNo, imageUrl, expiresAt, contentType: "image/bmp" }`. `imageUrl` is a Garage presigned GET valid 60 s (`@aws-sdk/s3-request-presigner`, user-approved). Errors 400, 401, 403, 404 `SESSION_NOT_FOUND`, 409 `NO_ACCEPTED_ATTEMPT`, `SESSION_NOT_OPEN` (only `IN_PROGRESS`, not expired), 503.
- Rules: NFR-S-01 exception, narrowed: only the ACCEPTED image of an open session, only via a 60 s URL, never in list/read responses. Each call is logged (session id, attempt no, staff user id; never the URL).
- gRPC: `FingerprintCaptureService.GetAcceptedCaptureImage`.

### PERSO-027 — POST /api/v1/fingerprint/capture-sessions/{sessionId}/accepted-attempt/reject

- Status: APPROVED (user, 2026-11-15)
- Purpose: the staff rejects an automatically ACCEPTED image after looking at it.
- Actor / Permission: Store Staff, `SOURCE_CAPTURE`. No body.
- Response: `200 CaptureSession`. Errors 400, 401, 403, 404, 409 `NO_ACCEPTED_ATTEMPT`, `SESSION_NOT_OPEN`, `SESSION_EXPIRED`, 503.
- Rules (one transaction under the `capture-session:{id}` lock):
  - The session is `IN_PROGRESS`, not expired, and has an ACCEPTED attempt (COMPLETED sessions cannot be rejected).
  - The attempt becomes `REJECTED`, `failure_reason='STAFF_REJECTED'`; `metadata_json` drops the image key/checksum and records `rejectedByUserId` and `rejectedAt`. The attempt still counts as used.
  - If 3 attempts are used, the session becomes `FAILED` (`ended_at`, `failure_reason='MAX_ATTEMPTS_REACHED'`); otherwise it stays `IN_PROGRESS`.
  - After commit: delete the object (best effort, log on failure) and publish a `results` message to the device with the original nonce, `result: "REJECTED"`, `reason: "STAFF_REJECTED"`, `remainingAttempts`, `sessionStatus`, so the device returns to waiting for a finger (or stops if FAILED).
- gRPC: `FingerprintCaptureService.RejectAcceptedCaptureAttempt`.

### Device image format and quality score (decided 2026-11-15)

- `imageBase64` is an uncompressed 8-bit grayscale BMP (256×288 from the AS608 `UpImage`, 256-entry palette). Operations checks the `BM` magic and the declared file size, stores it with `Content-Type: image/bmp`.
- `qualityScore` (0–1000) is computed by the firmware: the AS608 `Img2Tz` must succeed, then score = ridge-area coverage × contrast, scaled to 0–1000. `OPERATIONS_CAPTURE_QUALITY_THRESHOLD` is tuned from real captures.

### Revision 2026-11-15: the capture staff decides (user-approved)

This section overrides the earlier PERSO-007, PERSO-008, PERSO-026 and PERSO-027 rules where they differ.

- The quality threshold is only a **suggestion**. The Store Staff who captures decides which image is accepted.
- **Schema (D-P-11 amended):** first Operations migration `capture_attempt_pending_review`:
  - `capture_attempts.result` allows `PENDING_REVIEW` (values `PENDING_REVIEW`, `ACCEPTED`, `REJECTED`, `ERROR`).
  - The result CHECK becomes: `ACCEPTED` → `quality_score IS NOT NULL AND failure_reason IS NULL`; `PENDING_REVIEW` → `failure_reason IS NULL`; `REJECTED`/`ERROR` → `failure_reason IS NOT NULL`. The `quality_score >= quality_threshold_snapshot` rule is removed (staff may accept below the threshold).
  - The partial unique "one ACCEPTED per session" stays.
  - Applied on the server 2026-11-15 (user-authorized, owner `memora`, tables were empty).
- **PERSO-007 (MQTT):** every attempt whose image passes the BMP check is stored in Garage and recorded as `PENDING_REVIEW` with `quality_threshold_snapshot` = current threshold. `suggestion` = `PASS` when `qualityScore >= threshold`, else `LOW_QUALITY` (derived, not stored). An attempt without an image (AS608 `Img2Tz` failed) is recorded as `REJECTED`, `failure_reason='CAPTURE_FAILED'`. Results: `{ sessionId, nonce, ok: true, attemptNo, result: "PENDING_REVIEW" | "REJECTED", suggestion?, remainingAttempts, sessionStatus }`. While an attempt is `PENDING_REVIEW` the device waits for the staff (a new attempt is refused with `REVIEW_PENDING`). Three used attempts with none accepted and none pending → `FAILED`.
- **PERSO-006:** each attempt shows `attemptNo, result, qualityScore, suggestion, attemptedAt`.
- **PERSO-026:** `GET /api/v1/fingerprint/capture-sessions/{sessionId}/attempts/{attemptNo}/image` → presigned URL 60 s for a `PENDING_REVIEW` attempt's image. Errors `ATTEMPT_NOT_FOUND`, `ATTEMPT_NOT_REVIEWABLE`, `SESSION_NOT_OPEN`, `SESSION_EXPIRED`.
- **PERSO-027:** `POST /api/v1/fingerprint/capture-sessions/{sessionId}/attempts/{attemptNo}/reject` → the attempt becomes `REJECTED`, `failure_reason='STAFF_REJECTED'`, image deleted, device gets `results` (`result: "REJECTED"`, `reason: "STAFF_REJECTED"`, `remainingAttempts`, `sessionStatus`). No attempts left → `FAILED`, device gets `commands` `{ type: "end", sessionId, status: "FAILED" }`.
- **PERSO-008:** `POST /api/v1/fingerprint/capture-sessions/{sessionId}/complete` with body `{ attemptNo }`. The chosen `PENDING_REVIEW` attempt becomes `ACCEPTED` (metadata `acceptedByUserId`, `acceptedAt`); any other `PENDING_REVIEW` attempt becomes `REJECTED` / `STAFF_REJECTED` and its image is deleted after commit. Source creation, session `COMPLETED`, consent link as before. Idempotent repeat with the same `attemptNo` returns the session; a different `attemptNo` after completion → 409 `SESSION_NOT_OPEN`. After commit the device gets `commands` `{ type: "end", sessionId, status: "COMPLETED" }`.
- New device command `end` (also sent when a session expires is not required; the device uses `expiresAt`).

#### implement-api checklist (each of PERSO-005..008)

- [x] Approved method, path, request, response, and permission confirmed
- [x] No duplicate route, RPC, DTO, or migration
- [x] Owning service enforces rules and data ownership
- [x] Gateway DTO, auth, error mapping, and Swagger match the contract
- [x] Checks recorded with PASS/FAIL/NOT RUN

Implementation notes (2026-11-15):
- Locks: `pg_advisory_xact_lock` on `capture-consent:{id}` then `capture-device:{code}` (create), `capture-session:{id}` (attempt, complete).
- MQTT client id is fixed (`memora-operations`, clean session false): run one Operations instance per broker, or two clients will keep disconnecting each other.
- Extra limits: nonce `[A-Za-z0-9_-]{16,64}`, decoded image ≤ 180000 bytes. Image SHA-256 is stored as S3 object metadata `sha256` (not `x-amz-checksum-*`).
- A consent revoked during an open session does not stop attempts; `complete` then fails with `CONSENT_NOT_ACCEPTED` and the stored image stays orphaned until retention rules (D-OPS-08) exist.
- Server steps before the next `main` deploy: Mosquitto in the Arcane `memora-infra` project (`MQTT_OPERATIONS_PASSWORD`, `MQTT_DEVICE_USERS` in its `.env`), and `operations.env` gets `OPERATIONS_MQTT_*`, `OPERATIONS_CAPTURE_*`, `OPERATIONS_OBJECT_STORAGE_*`.

### Remaining IDs (summary checklists; expand when the user approves them)

| API ID | Status | Key rules | Tables | Blockers |
|---|---|---|---|---|
| PERSO-004 | NEEDS_REVIEW | SHARED only for two items of the same type; change after collection forces re-consent / relink | (ordering.orders.source_plan_mode is Commerce) | D-P-05 |
| PERSO-009/010 | PROPOSED | Supported codec, upload or in-app ≤30 s, P1 + Consent first | personalization_sources | D-P-08, D-P-14 |
| PERSO-011 | NEEDS_REVIEW | Owner only, no raw asset | personalization_sources, source_bindings | D-P-01 |
| PERSO-012/013 | NEEDS_REVIEW | Idempotent job, bounded retry, worker never changes Order | personalization_sources | D-P-09, schema gap |
| PERSO-014 | NEEDS_REVIEW | Bind within Consent scope; one active binding per item | source_bindings | D-P-01 |
| PERSO-015..017 | NEEDS_REVIEW | FP bounded position/scale/rotation inside `ENGRAVE_SURFACE`; SW exactly 3000 ms, fixed geometry, transforms rejected | personalization_placements | D-P-01, D-P-15 |
| PERSO-018 | NEEDS_REVIEW | Exact current version + preview; independent per item | design_reviews | D-P-01, D-P-04 |
| PERSO-019 | PROPOSED | Only after approval; Commerce moves version to SUBMITTED | design_reviews | D-P-04 |
| PERSO-020..022 | PROPOSED | Manager reviews current SUBMITTED FP/SW only; REQUEST_CHANGES needs notes | design_reviews | D-P-04 |
| PERSO-023 | NEEDS_REVIEW | One SUBMITTED request per item; before Lock | change_requests | D-P-01, D-P-04 |
| PERSO-024/025 | PROPOSED | APPLIED needs a new Commerce version id | change_requests | D-P-04 |

## 7. Acceptance criteria and test cases

### PERSO-001

- [ ] Accept after trusted P1 SUCCEEDED → 201 (TC-WF01-F-02-01)
- [ ] P1 pending/failed, client claims paid → 409, no row (OPS-FP-02)
- [ ] Not the Order owner → 403 (OPS-FP-04)
- [ ] SHARED across FP + SW → 400/409 (F-02 AC3)
- [ ] Repeat with same idempotency key → same consent

### PERSO-005 / 006 / 008

- [ ] Valid Staff, device, P1, scoped Consent → session CREATED (OPS-FP-01)
- [ ] No Consent / revoked / wrong scope → 409, no session (OPS-FP-03)
- [ ] Wrong role / another store / no `SOURCE_CAPTURE` → 403 (OPS-FP-04)
- [ ] Read never returns biometric data or asset keys (NFR-S-01)
- [ ] Complete twice → one source, same id (OPS-FP-08)
- [ ] Complete without accepted attempt → 409 (OPS-FP-07)
- [ ] Expired session → 409 (OPS-FP-09)

### PERSO-007

- [ ] 4th attempt → 409 (OPS-FP-05)
- [ ] Replayed nonce / parallel duplicate → one record (OPS-FP-06)
- [ ] Rejected attempt stores metadata only

## 8. Decisions

Decided by the user on 2026-11-13. "Decided" means the direction is chosen. Each item still needs its own implementation, and any server action needs explicit authorization when it runs.

- [x] Ownership: the user implements Personalization in Operations. Phạm Quốc Duy implements Commerce and provides its contracts. The BM04 Commitment (line 82 names Duy for "source processing, consent-scope and Operations handoff") must be updated, and Duy informed.
- [x] D-P-01 DECIDED: reuse existing codes and add two.
  - Source bind, placement and Customer Approval use `DESIGN_SUBMIT_OWN`.
  - Staff and Manager reads use `ORDER_READ_OPERATIONS` or `DESIGN_REVIEW`.
  - Capture uses `SOURCE_CAPTURE`. Soundwave upload uses `SOURCE_AUDIO_UPLOAD_OWN`.
  - New for CUSTOMER: `CONSENT_MANAGE_OWN` (Consent accept/list/revoke) and `DESIGN_CHANGE_REQUEST_OWN`.
  - This makes RBAC v1.1: 46 → 48 permissions, 49 → 51 mappings. Delivered by `permissions.ts` plus IAM migration `20261113090000_iam_rbac_v1_1_personalization` (idempotent, runs with the IAM migrate step on the next `main` deploy). The user chose this over a manual bootstrap because the server lost `iam.rbac_bootstrap_executions`.
- [x] D-P-02 DECIDED: `consents.status` is `ACCEPTED` or `REVOKED`. `consent_type` is `FINGERPRINT_PROCESSING` or `SOUNDWAVE_PROCESSING`. `policy_version` comes from config. The legal and notice text belongs to product/FE (D-OPS-05). The backend stores only the version and evidence.
- [x] D-P-03 DECIDED: the Gateway authenticates and checks the permission, then passes `memora.common.v1.VerifiedActor` (`user_id`, `customer_identity_id`) as `actor = 1` in each user-scoped request, protected by the internal secret. No token forwarding. Operations authorizes the resource. Contract: `docs/architecture/business-service-api-recipe.md` section 5. This applies to Commerce and Experience too.
- [x] D-P-17 DECIDED 2026-11-15 (user): extend `VerifiedActor` for guests (MF01 AF01/AF02). Field `guest_session_id = 3`; kinds `USER`, `VERIFIED_GUEST` (customer identity only), `GUEST_SESSION`. Helpers `requireUserActor`, `requireCustomerActor`, `requireCustomerIdentity`. Contract in recipe section 5.
  - Every guest identity is issued and verified by IAM; the Gateway fills guest fields only after that check. No client header (`x-guest-session-id`) is trusted.
  - OPEN: IAM guest session and guest access token (endpoints, TTL: proposed 7 days / 24 hours), Gateway guest guard. Needs its own IAM plan (D10 of `iam-me-guest-identity.md`). Commerce (Duy) switches `OrderActorIdentity` to `VerifiedActor`.
  - Personalization is not affected: FP/SW requires login, so its RPCs use `requireCustomerActor`.
- [x] D-P-04 DECIDED: start with one Commerce read RPC, `GetOrderPersonalizationContext(order_id)`.
  - It returns the owner customer identity, order status, `p1_paid`, `source_plan_mode`, and ring items (`id`, `current_version_id`, personalization type, version status).
  - Operations calls it through an application port with a test fake until Duy delivers it.
  - Version transition RPCs come later.
  - 2026-11-15: Duy already has `OrderingService` in `proto/commerce/v1/ordering.proto` (branch `DuyPQ`), so the RPC is added there, not in a new proto. Spec: `docs/api/commerce/ordering-personalization-context.md`. Operations port and fake: `apps/operations-service/src/modules/personalization/shared/order-context/`. Open points: P1 `payment_stage` value, order and version status enums.
- [x] D-P-05 DECIDED: Commerce owns the Source Plan (`ordering.orders.source_plan_mode`). PERSO-004 moves to Commerce. Operations reads the value through D-P-04 and snapshots it into `capture_sessions.source_plan_mode`.
- [ ] D-P-06 OPEN (hardware): Phase 1 proof that AS608 exports an engraving-quality image (D-OPS-01). Code and tests can use fakes. PERSO-007 stays BLOCKED for production until proven.
- [x] D-P-07 REVISED 2026-11-15 (user): the device talks MQTT to an Eclipse Mosquitto 2 broker in `deploy/infra` (port 1883 on the Tailscale IP only). Operations subscribes and publishes directly; the Gateway is not on the device path. Each device has its own broker user (username = `deviceCode`) and an ACL limited to `memora/capture/<deviceCode>/#`. Payload nonces dedupe QoS 1 redelivery. Replaces the earlier HTTPS + HMAC decision. Contract: PERSO-007 and `docs/api/personalization/fingerprint-capture-mqtt.md`. AMENDED 2026-11-15 (user, option A): devices outside the tailnet connect with MQTT over WebSocket + TLS through the existing Cloudflare Tunnel (`wss://mqtt.memora.style` → `mosquitto:9001`, listener not published on the host); same broker users and ACL.
- [x] D-P-08 DECIDED: self-hosted S3-compatible storage on the Mini PC behind an S3-compatible infrastructure port. Changed 2026-11-13 from MinIO to **Garage v2.5.0** (`dxflrs/garage`), because MinIO no longer publishes community images (Docker Hub repo removed, Quay requires login). Same port/adapter design. Added to `deploy/infra/compose.yaml` as `memora-garage` (no host port; laptop 127.0.0.1:3900).
  - Private bucket, short-lived signed URLs, checksum on every object.
  - Adding the container to `deploy/infra` is an approved direction, but the infra change and deploy still need their own authorization (rule 25).
- [x] D-P-09 DECIDED: Operations queues a BullMQ job processed inside Operations. The job calls the Python worker over internal HTTP with its own secret and passes object keys only. The worker reads and writes Garage (S3) and returns the vector key and checksum. Job state lives in `personalization_sources.status`.
- [x] D-P-10 DECIDED: env config with validation.
  - Session TTL defaults to 15 minutes in dev. Max 3 attempts, matching the DDL CHECK.
  - The quality threshold has no production default: startup fails if it is unset outside development. It is set from the AS608 test results.
- [x] D-P-11 DECIDED: no DDL change. `db/` stays the baseline.
  - Expiry is `created_at` + TTL. No store id: BM04 has no store table, so the session uses `device_code` + `staff_user_id`.
  - Duplicate open sessions are prevented in a transaction.
  - The nonce and device evidence go in `capture_attempts.metadata_json`.
  - Only an accepted capture writes `personalization_sources.raw_asset_key`.
  - Processing state uses `personalization_sources.status`. The order link goes through `source_bindings` and `capture_sessions.accepted_source_id`.
  - AMENDED 2026-11-15 (user): one DDL change is allowed, the Operations migration `capture_attempt_pending_review` (see "Revision 2026-11-15: the capture staff decides").
- [x] D-P-12 DECIDED: change `capture_sessions.capture_attempts` to a list in `schema.prisma`. Keep the partial unique index in the DB. Prisma-only change, checked with `prisma validate`. Done on `feat/business-prisma-baseline`: `prisma validate` passes, `migrate diff` against the baseline is empty.
- [ ] D-P-13 DECIDED (retention open): revoking Consent is allowed only while no linked Ring Item Version is SUBMITTED or locked. Otherwise return `FAILED_PRECONDITION`. Data retention after the order (D-OPS-08) stays NEEDS_REVIEW.
- [x] D-P-14 DECIDED: Soundwave accepts WAV, MP3 and M4A/AAC, up to 10 MB. Both file upload and in-app recording are limited to 30 s. The selected segment is exactly 3000 ms.
- [ ] D-P-15 DEFERRED: Catalog engraving constraints (`ENGRAVE_SURFACE`, min/max scale, SW fixed geometry) are decided when placement is planned. They do not block Consent, capture or processing.
- [x] D-P-16 DECIDED: create Prisma baselines now for Commerce, Operations and Experience.
  - Generate `0_baseline` from `db/` for each service's schemas.
  - Keep each service's `_prisma_migrations` table separate from IAM's.
  - Mark the baseline applied on the server with `prisma migrate resolve --applied`. That server step needs explicit authorization and a backup check when it runs.
  - Repo part done on `feat/business-prisma-baseline`: `_prisma_migrations` lives in `catalog`, `after_sales` and `memory`. Local checks passed: fresh deploy, resolve on a `db/` copy, empty `migrate diff`, identical `pg_dump`. Server: `migrate resolve --applied 0_baseline` ran on 2026-11-13 for all three services (status up to date; app-role grants on the new tables came from existing default privileges).

## 9. Implementation progress log

| Date | API ID | Result | Evidence |
| --- | --- | --- | --- |
| 2026-11-13 | Phase 0 audit | PLAN ONLY | Files read listed in §2; no code, schema, RBAC or server change |
| 2026-11-15 | PERSO-001..003 | IMPLEMENTED (not deployed) | Builds gateway/operations/commerce PASS; jest 161 PASS (task-added specs then removed per rule); eslint, proto:check, boundaries, guardrails PASS. Local smoke: 401 without token, Swagger paths, gRPC UNAUTHENTICATED without secret, INVALID_ARGUMENT, list empty, Operations→Commerce NOT_FOUND→404, Commerce down→503. NOT RUN: accept/revoke against a real paid order (would write server DB), Postgres race path |
| 2026-11-15 | PERSO-005..008 | IMPLEMENTED (not deployed) | Builds gateway/operations/commerce/iam PASS; jest 220 PASS with task specs (then removed per rule), 112 PASS after; eslint, proto:check, prisma validate, boundaries, guardrails, ci:deploy-layout PASS. Local smoke: throwaway Mosquitto 2.0.21 + Operations: connect/subscribe, unknown session → SESSION_NOT_FOUND result, bad score → INVALID_MESSAGE, bad nonce dropped, other-device topic blocked by ACL; Gateway 3 routes 401 without token, Swagger paths. NOT RUN: session create/attempt/complete against real DB and Garage, Postgres lock paths, ESP32 hardware (D-P-06) |
| 2026-11-15 | PERSO-026/027 + BMP rule + D-P-07 broker users via Arcane env | IMPLEMENTED (not deployed) | Builds gateway/operations/commerce/iam/experience PASS; jest 134 PASS with task specs (then removed per rule); eslint, tsc, proto:check, prisma validate, boundaries, guardrails, ci:deploy-layout PASS. Server broker (Arcane, user-deployed): anonymous/wrong password refused, both users connect, ACL blocks other-device and own-commands publish, start command delivered (also seen in MQTT Explorer). NOT RUN: presigned URL via public endpoint, reject flow against real DB/Garage |
| 2026-11-15 | Revision: capture staff decides (PERSO-007/008/026/027) + migration `20261115120000_capture_attempt_pending_review` | IMPLEMENTED (code not deployed; migration APPLIED on server 2026-11-15) | Builds 5 services PASS; jest 152 PASS with task specs (then removed per rule); eslint, tsc, proto:check, prisma validate, boundaries, guardrails, ci:deploy-layout PASS. Migration: user-authorized, applied with `prisma migrate deploy` as owner `memora` on the server DB after a pre-check (capture_attempts and capture_sessions empty, old CHECK definitions saved); `migrate status` up to date; new CHECKs verified; operations_app grants unchanged. NOT RUN: flow against real DB/Garage/broker |
