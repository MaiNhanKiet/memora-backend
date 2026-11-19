# Operations Personalization API plan

## 1. Metadata

- Branch: `dev` at `eca28ed` when planned. Implementation needs its own branch from latest `dev` (proposed `feat/personalization-capture`).
- Domain: `personalization`
- Service: `operations-service` (Gateway HTTP → Operations gRPC)
- Feature: Consent, Fingerprint capture (IoT), Soundwave upload, sources, placement, approvals, change requests
- Plan status: AWAITING_APPROVAL for PERSO-009..019 (PERSO-001..003, 005..008, 026..029 approved and implemented; decisions in section 8, D-P-15/18/19/20 open)
- Updated: 2026-11-19 (source pipeline PERSO-009..019 planned on `feat/personalization-source-pipeline`)
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
  - `MF01.md`–`MF04.md` are now in `docs/requirements/` (snapshot 2026-11-15) and are the current flow baseline.
  - API Master spreadsheet, Database Tracker `FIELDS/RELATION_RULES/DECISIONS`: only linked in the source plan, not in the workspace. Not opened.
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
| PERSO-004 | PUT | /api/v1/orders/{orderId}/source-plan | WF-01 F-13 | — | — | MOVED to Commerce (D-P-05) |
| PERSO-005 | POST | /api/v1/orders/{orderId}/fingerprint/capture-sessions | WF-01 F-02 | SOURCE_CAPTURE | CreateCaptureSession | APPROVED |
| PERSO-006 | GET | /api/v1/fingerprint/capture-sessions/{sessionId} | WF-01 F-02 | SOURCE_CAPTURE | GetCaptureSession | APPROVED |
| PERSO-007 | MQTT | MQTT `memora/capture/{deviceCode}/attempts` | WF-01 F-02 | device broker user + ACL (D-P-07) | none (MQTT) | APPROVED |
| PERSO-008 | POST | /api/v1/fingerprint/capture-sessions/{sessionId}/complete | WF-01 F-02 | SOURCE_CAPTURE | CompleteCaptureSession | APPROVED |
| PERSO-026 | GET | /api/v1/fingerprint/capture-sessions/{sessionId}/attempts/{attemptNo}/image | WF-01 F-02 | SOURCE_CAPTURE | GetCaptureAttemptImage | APPROVED |
| PERSO-027 | POST | /api/v1/fingerprint/capture-sessions/{sessionId}/attempts/{attemptNo}/reject | WF-01 F-02 | SOURCE_CAPTURE | RejectCaptureAttempt | APPROVED |
| PERSO-028 | POST | /api/v1/fingerprint/capture-sessions/{sessionId}/next-attempt | WF-01 F-02 | SOURCE_CAPTURE | NextCaptureAttempt | APPROVED |
| PERSO-029 | POST | /api/v1/fingerprint/capture-sessions/{sessionId}/close | WF-01 F-02 | SOURCE_CAPTURE | CloseCaptureSession | APPROVED |
| PERSO-009 | POST | /api/v1/orders/{orderId}/soundwave/uploads/initiate | MF01-S07 | SOURCE_AUDIO_UPLOAD_OWN | InitiateSoundwaveUpload | APPROVED |
| PERSO-010 | POST | /api/v1/orders/{orderId}/soundwave/uploads/complete | MF01-S07 | SOURCE_AUDIO_UPLOAD_OWN | CompleteSoundwaveUpload | APPROVED |
| PERSO-011 | GET | /api/v1/orders/{orderId}/personalization-sources | MF01-S07 | DESIGN_SUBMIT_OWN | ListOrderSources | APPROVED |
| PERSO-012 | GET | /api/v1/personalization-sources/{sourceId}/processing | MF01-S07 | DESIGN_SUBMIT_OWN | GetSourceProcessing | APPROVED |
| PERSO-013 | INTERNAL | BullMQ job in Operations → Python worker (D-P-09) | MF01-S07 | internal only | none (queue) + worker HTTP | APPROVED |
| PERSO-014 | POST | /api/v1/orders/{orderId}/source-bindings | MF01-S07 | DESIGN_SUBMIT_OWN | BindSource | DEFERRED (D-P-18 = automatic binding) |
| PERSO-015 | GET | /api/v1/orders/{orderId}/items/{ringItemId}/placement | MF01-S07 | DESIGN_SUBMIT_OWN | GetPlacement | NEEDS_REVIEW (D-P-15) |
| PERSO-016 | PUT | /api/v1/orders/{orderId}/items/{ringItemId}/placement | MF01-S07 | DESIGN_SUBMIT_OWN | SavePlacement | NEEDS_REVIEW (D-P-15) |
| PERSO-017 | POST | /api/v1/orders/{orderId}/items/{ringItemId}/placement/validate | MF01-S07 | DESIGN_SUBMIT_OWN | ValidatePlacement | NEEDS_REVIEW (D-P-15) |
| PERSO-018 | POST | /api/v1/orders/{orderId}/items/{ringItemId}/customer-approvals | MF01-S08 | DESIGN_SUBMIT_OWN | ApproveItemDesign | NEEDS_REVIEW (D-P-20) |
| PERSO-019 | POST | /api/v1/orders/{orderId}/items/{ringItemId}/submit-review | MF01-S08 | DESIGN_SUBMIT_OWN | SubmitForReview | NEEDS_REVIEW (D-P-20) |
| PERSO-020 | GET | /api/v1/admin/design/reviews | WF-02 F-04 | DESIGN_REVIEW | ListDesignReviews | PROPOSED |
| PERSO-021 | GET | /api/v1/admin/design/reviews/{reviewId} | WF-02 F-04 | DESIGN_REVIEW | GetDesignReview | PROPOSED |
| PERSO-022 | POST | /api/v1/admin/design/reviews/{reviewId}/decide | WF-02 F-04 | DESIGN_REVIEW | DecideDesignReview | PROPOSED |
| PERSO-023 | POST | /api/v1/orders/{orderId}/items/{ringItemId}/change-requests | WF-02 F-12 | NEEDS_REVIEW | CreateChangeRequest | NEEDS_REVIEW |
| PERSO-024 | GET | /api/v1/admin/design/change-requests | WF-02 F-12 | DESIGN_CHANGE_APPROVE | ListChangeRequests | PROPOSED |
| PERSO-025 | POST | /api/v1/admin/design/change-requests/{changeRequestId}/decide | WF-02 F-12 | DESIGN_CHANGE_APPROVE | DecideChangeRequest | PROPOSED |

Count (2026-11-19): 16 APPROVED (11 implemented: PERSO-001..003, 005..008, 026..029; 5 to build: PERSO-009..013), 5 PROPOSED, 6 NEEDS_REVIEW, PERSO-014 DEFERRED, PERSO-004 moved to Commerce. gRPC names are candidates, not an approved proto. Step IDs follow `docs/requirements/MF01.md` (post-Review 2 numbering).

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

**Order from 2026-11-19 (after PERSO-001..008, 026..029 are done):**

1. D-P-18 change to PERSO-008 (create `source_bindings` on complete) + PERSO-011 (list sources).
2. PERSO-009 → 010 (Soundwave upload; PERSO-010 also binds). The new source waits for PERSO-013.
3. Worker HTTP contract `docs/api/personalization/processing-worker.md`, then PERSO-013 → 012 against a fake worker (queue, worker call, WAVECODE uniqueness, status read). The real worker is built in `memora-python-services` (D-P-19).
4. PERSO-014 deferred (automatic binding chosen).
5. PERSO-015 → 017 → 016 (read, validate, save placement). Needs D-P-15 from Commerce Catalog.
6. PERSO-018 → 019 (customer approval, submit). Needs D-P-20 from Commerce Ordering.
7. MF02-S01: PERSO-020..025.

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

### Revision 2026-11-17: several attempts, the staff picks the best (user-approved)

This section overrides "Revision 2026-11-15" where they differ. Goal: the customer scans up to `maxAttempts`
(3) times in one session, every stored image stays `PENDING_REVIEW`, and the staff picks the best one at
the end, or closes the session without picking any. One order item may get several sessions (already
true: a new session is refused only while one is open or after one is `COMPLETED`). No migration:
`failure_reason` is free text and session status `CANCELLED` already exists.

- **PERSO-007 (MQTT, changed):** the `REVIEW_PENDING` refusal is removed. A session accepts attempts while
  `attempts.length < maxAttempts`, no attempt is `ACCEPTED` and the session is open; several attempts may be
  `PENDING_REVIEW` at once. Decision (user, 2026-11-17): the server does **not** require a PERSO-028 call
  before the next attempt; the device only captures after `start` / `next` and a button press, so no
  `requested_attempts` column. `FAILED` rule unchanged (all attempts used, none pending, none accepted).
- **PERSO-028 `POST /api/v1/fingerprint/capture-sessions/{sessionId}/next-attempt` (new, SOURCE_CAPTURE):**
  no body. Session must be open and not expired (`SESSION_NOT_OPEN` / `SESSION_EXPIRED` 409), no attempt
  `ACCEPTED` (`ATTEMPT_ALREADY_ACCEPTED` 409), attempts left (`MAX_ATTEMPTS_REACHED` 409). Nothing is stored;
  after the checks Operations publishes `commands` `{ "type": "next", "sessionId", "attemptNo": <used + 1> }`
  (QoS 1). Response: the session view (as PERSO-006). Publish failure is logged, not an error (staff can
  press again).
- **PERSO-008 (changed):** the other `PENDING_REVIEW` attempts become `REJECTED` with
  `failure_reason='NOT_SELECTED'` (was `STAFF_REJECTED`), images deleted after commit. The `end` command gets
  `acceptedAttemptNo`: `{ "type": "end", "sessionId", "status": "COMPLETED", "acceptedAttemptNo": n }`.
- **PERSO-029 `POST /api/v1/fingerprint/capture-sessions/{sessionId}/close` (new, SOURCE_CAPTURE):** no body.
  Ends an open session without picking: session `CANCELLED` (`ended_at` set, no source), every
  `PENDING_REVIEW` attempt → `REJECTED` / `NOT_SELECTED`, images deleted after commit, device gets
  `commands` `{ "type": "end", "sessionId", "status": "CANCELLED" }`. Idempotent: closing a `CANCELLED`
  session returns it; `COMPLETED` / `FAILED` / `EXPIRED` → 409 `SESSION_NOT_OPEN`. Same advisory lock as
  complete (`capture-session:{id}`).
- **Expiry (changed):** when lazy expiry marks a session `EXPIRED`, its `PENDING_REVIEW` attempts become
  `REJECTED` / `EXPIRED` and their images are deleted after commit (previously left in storage).
- **PERSO-027:** unchanged (reject one image now; it still uses an attempt).
- **PERSO-006 (approved 2026-11-17):** each attempt also returns `failureReason` (null unless `REJECTED` /
  `ERROR`): `CAPTURE_FAILED`, `STAFF_REJECTED`, `NOT_SELECTED`, `EXPIRED`. Proto `CaptureAttemptSummary`
  field 6 `optional string failure_reason`.
- **Device contract:** new `commands` type `next`; `end` may carry `acceptedAttemptNo` and status
  `CANCELLED`. The reference firmware already handles both (`memora-firmware`, README section 14).

### Source pipeline PERSO-009..019 (planned 2026-11-19, MF01-S07/S08)

Source: `docs/requirements/MF01.md` S07/S08, BR14, AF06, AF08, AF14; decisions D-P-01, D-P-09, D-P-11, D-P-14 (section 8). All IDs below are PROPOSED or NEEDS_REVIEW. **None is approved**; the user approves IDs one by one.

Shared rules:

- Customer routes take `actor` (D-P-03) and use `requireCustomerActor`. The owner is checked against `GetOrderPersonalizationContext.owner_customer_identity_id` (Commerce) and, for a source, `personalization_sources.owner_customer_identity_id`. FP/SW requires login, so no guest actor.
- Responses never contain object keys, checksums, raw images, audio or vectors (NFR-S-01). Only status, type, timestamps and ids.
- Source status flow (DDL CHECK): `PENDING` (upload started) → `ACCEPTED` (FP chosen by staff, or SW upload verified) → `PROCESSING` → `READY` | `PROCESSING_FAILED`; `DELETED` only with `deleted_at` + `delete_reason`.
- No DDL change (D-P-11). Processing details (job attempts, failure code, processed time, SW duration) go in `personalization_sources.metadata_json`.

#### PERSO-009 — POST /api/v1/orders/{orderId}/soundwave/uploads/initiate

- Status: PROPOSED
- Actor / Permission: Customer, `SOURCE_AUDIO_UPLOAD_OWN`.
- Status update 2026-11-19: **APPROVED** (user), with the duration rule below.
- Request: Params `orderId`. Body `consentId` (uuid), `contentType` (`audio/wav` | `audio/mpeg` | `audio/mp4` | `audio/aac`), `sizeBytes` (1..10 485 760), `sha256` (hex 64), `origin` (`UPLOAD` | `IN_APP_RECORDING`), `durationMs` (3000..30000, measured by the FE; out of range → 400 `AUDIO_DURATION_INVALID`). The FE value is only an early check; PERSO-013 measures the real duration (user decision 2026-11-19).
- Response: `201 { uploadId, uploadUrl, uploadHeaders, expiresAt }`. `uploadId` = new source id; `uploadUrl` is a short-lived presigned PUT bound to content type, length and checksum.
- Rules: Commerce context: order owned by actor, `p1Paid`, every consent item is `SOUNDWAVE`. Consent belongs to the order, `ACCEPTED`, type `SOUNDWAVE_PROCESSING`, not yet linked to a source (`personalization_source_id IS NULL`, else 409 `SOURCE_ALREADY_UPLOADED`). One `PENDING` upload per consent: a new initiate replaces an older `PENDING` one (old row → `DELETED`, reason `SUPERSEDED`). Creates `personalization_sources` (`SOUNDWAVE`, `PENDING`, `raw_asset_key`, `raw_checksum` = declared sha256).
- Errors: 400 validation; 401; 403; 404 `ORDER_NOT_FOUND` / `CONSENT_NOT_FOUND`; 409 `P1_NOT_PAID`, `CONSENT_NOT_ACCEPTED`, `CONSENT_TYPE_MISMATCH`, `PACKAGE_MISMATCH`, `SOURCE_ALREADY_UPLOADED`; 503 storage.
- Tables: `consents`, `consent_ring_items` (read), `personalization_sources` (write). Garage presign.

#### PERSO-010 — POST /api/v1/orders/{orderId}/soundwave/uploads/complete

- Status: PROPOSED
- Actor / Permission: Customer, `SOURCE_AUDIO_UPLOAD_OWN`.
- Status update 2026-11-19: **APPROVED** (user).
- Request: Params `orderId`. Body `uploadId`, `segmentStartMs` (integer ≥ 0, `segmentStartMs + 3000 ≤ durationMs`). The customer picks the 3 s segment on the FE before complete (user decision 2026-11-19); it is stored in `metadata_json` and copied into the placement later. Changing the segment after complete needs a re-process API (not planned).
- Response: `200 { sourceId, sourceType: "SOUNDWAVE", status }`.
- Rules: source is `PENDING`, owned by the actor, linked to a consent of this order. Operations reads the object: size ≤ 10 MB and equal to the declared size, sha256 equal to `raw_checksum`, magic bytes match the content type; otherwise the object is deleted and the row → `DELETED` (reason `UPLOAD_INVALID`), 422 `UPLOAD_INVALID`. On success: source → `ACCEPTED` (`accepted_at`, `captured_at`), `consents.personalization_source_id` set, bindings per D-P-18, PERSO-013 job enqueued after commit. Duration (≤ 30 s, ≥ 3 s) is measured by the worker in PERSO-013; a bad duration ends as `PROCESSING_FAILED` / `AUDIO_DURATION_INVALID`. Idempotent: repeating on an `ACCEPTED`/`PROCESSING`/`READY` source returns it.
- Errors: 400; 401; 403; 404 `UPLOAD_NOT_FOUND`; 409 `UPLOAD_NOT_PENDING`; 422 `UPLOAD_INVALID`; 503 storage.
- Tables: `personalization_sources`, `consents`, `source_bindings` (write). Garage read/delete. Queue.

#### PERSO-011 — GET /api/v1/orders/{orderId}/personalization-sources

- Status: PROPOSED
- Status update 2026-11-19: **APPROVED** (user), customer route only.
- Actor / Permission: Customer, `DESIGN_SUBMIT_OWN` (D-P-01). A staff/manager view is out of scope until asked for (it would be a separate admin route with `ORDER_READ_OPERATIONS`).
- Response: `200 { data: [{ sourceId, sourceType, status, failureCode|null, acceptedAt, ringItemIds: [..], bindingMode }] }`.
- Rules: order owned by the actor (Commerce context). Sources = those linked through this order's consents (`consents.order_id`) plus active `source_bindings` of the order. `DELETED` sources are left out.
- Errors: 401; 403; 404 `ORDER_NOT_FOUND`.
- Tables: `consents`, `personalization_sources`, `source_bindings` (read).

#### PERSO-012 — GET /api/v1/personalization-sources/{sourceId}/processing

- Status: **APPROVED** (user, 2026-11-19), built together with PERSO-013.
- Actor / Permission: Customer, `DESIGN_SUBMIT_OWN`.
- Response: `200 { sourceId, sourceType, status, failureCode|null, startedAt|null, finishedAt|null }`.
- Rules: `owner_customer_identity_id` = actor; otherwise 404 (no existence leak). Read only; no retry trigger here.
- Tables: `personalization_sources` (read).

#### PERSO-013 — internal processing job

- Status: **APPROVED** (user, 2026-11-19), worker per D-P-19.
- Trigger: after commit of PERSO-008 (FP) and PERSO-010 (SW). BullMQ queue inside Operations (`@app/queue`), job id = source id (dedupe).
- Rules: source `ACCEPTED` → `PROCESSING` → worker call over internal HTTP with its own secret, passing object keys only (D-P-09) → `READY` or `PROCESSING_FAILED` with a failure code. A late result for a source that is no longer `PROCESSING` is ignored. The worker never touches Order, Consent, Commerce or the database.
- Retry (user, 2026-11-19): transient errors (network, timeout, worker 5xx) retry 3 times with growing backoff (30 s, 2 min, 8 min), then `PROCESSING_FAILED` / `WORKER_UNAVAILABLE`. Data errors (unreadable image, empty fingerprint region, audio duration or segment invalid) fail at once. No reprocess / preset API for now (standard preset only).
- Outputs (user, 2026-11-19), all under `personalization/sources/{sourceId}/` in Garage:
  - FP: `fingerprint.svg` (laser vector), `fingerprint_alpha.png` (transparent decal for the web preview on `ENGRAVE_UV`).
  - SW: `wavecode.svg`, `wavecode_alpha.png`, `audio_segment.wav` (the chosen 3 s, kept for playback).
  - `manifest.json`: every file with key, sha256, size, pixel/mm size, processor version and options.
  - DB: `processed_asset_key` = manifest key, `vector_asset_key` + `vector_checksum` = the SVG. No heightmap / normal / roughness / AO maps.
- SW encoding (user, 2026-11-19): **`MEMORA_WAVECODE_v1`** from the `memora-3d` templates (BAR_001_SW): 23 bars = 3 reference bars at max level (positions 0, 11, 22) + 18 data bars + 2 check bars (positions 10, 21); data = RMS envelope of the 3 s segment in 18 equal windows, normalized, quantized to 8 levels; check = `sum((i+1)*level_i) mod 64` → `c // 8`, `c % 8`. The worker measures the real duration (3–30 s, within 250 ms of the declared value) and that the segment fits; otherwise `AUDIO_DURATION_INVALID` / `SEGMENT_OUT_OF_RANGE`.
- WAVECODE uniqueness (user, 2026-11-19): checked by Operations when the result arrives. The worker returns the 18 levels plus an ordered list of nudge candidates (±1 level on the bar closest to a level boundary). Operations takes an advisory lock (`wavecode`), compares with `metadata_json.wavecode` of other non-deleted SW sources, picks the first unique sequence and, if it is not the base one, asks the worker to render that exact sequence. The final sequence is stored in `metadata_json.wavecode`. No DDL.
- Tables: `personalization_sources` (write). Garage (worker reads raw, writes outputs).

#### PERSO-014 — POST /api/v1/orders/{orderId}/source-bindings

- Status: **DEFERRED** (D-P-18 decided (a) on 2026-11-19: automatic binding; PERSO-014 only if a re-bind is needed later).
- Purpose: link a source to the Ring Items of its consent (`source_bindings`, one active binding per Ring Item).
- If D-P-18 picks automatic binding, PERSO-008 and PERSO-010 create the bindings in the same transaction: one row per `consent_ring_items` item, `binding_mode` = the session's `source_plan_mode` snapshot (FP) or the Commerce context value (SW). PERSO-014 is then deferred (only needed for a later re-bind).
- If D-P-18 keeps a customer call: body `{ sourceId, ringItemIds }`; items must be inside the consent scope and of the source's package; SHARED only for two items of the same type (AF08).

#### PERSO-015 / 017 / 016 — placement (read, validate, save)

- Status: NEEDS_REVIEW (D-P-15)
- Actor / Permission: Customer, `DESIGN_SUBMIT_OWN`.
- Rules: Ring Item has an active binding to a `READY` source. FP: `center_angle_deg`, `axial_offset_mm`, `width_mm`, `height_mm`, `rotation_deg` inside the template limits from Commerce Catalog. SW: only `segmentStartMs` (`segment_end_ms` = start + 3000, inside the clip); geometry is fixed by the template, transforms are rejected. One placement per Ring Item Version (`ring_item_version_id` unique): save replaces it while the version is not approved. `placement_hash` = hash of the values + `vector_checksum` + `mapping_version`. Validate (017) is a dry run that returns violations and stores nothing.
- Blocker: Catalog has `engrave_surface_type` and anchor `surface_type`, but no min/max limits or SW fixed geometry (request sent to Commerce).
- Tables: `personalization_placements`, `source_bindings`, `personalization_sources` (read).

#### PERSO-018 / 019 — customer approval and submit

- Status: NEEDS_REVIEW (D-P-20)
- Actor / Permission: Customer, `DESIGN_SUBMIT_OWN`.
- PERSO-018: body `{ ringItemVersionId, placementHash }`. The version must be the current one and the hash must match the stored placement (the customer approves exactly what they saw). Writes `design_reviews` (`CUSTOMER_APPROVAL`, `APPROVE`, evidence = placement hash) and asks Commerce to move the version to `READY_FOR_REVIEW`.
- PERSO-019: body `{ ringItemVersionId }`. Requires the latest `CUSTOMER_APPROVAL` for that current version with an unchanged placement; Commerce moves the version to `SUBMITTED`. Per Ring Item, independent (MF01-S08). Memory Design opt-in is Experience and out of scope here.
- Blocker: Commerce has no internal RPC for version status transitions (`ordering.proto` only has `UpdateCurrentRingItemVersion`, `UpdateOrderStatus`).
- Tables: `design_reviews` (write), `personalization_placements` (read). Commerce RPC.

### Remaining IDs after MF01 (summary)

| API ID | Status | Key rules | Tables | Blockers |
|---|---|---|---|---|
| PERSO-020..022 | PROPOSED | Manager reviews current SUBMITTED FP/SW only; REQUEST_CHANGES needs notes | design_reviews | D-P-20 |
| PERSO-023 | NEEDS_REVIEW | One SUBMITTED request per item; before Lock | change_requests | D-P-01, D-P-20 |
| PERSO-024/025 | PROPOSED | APPLIED needs a new Commerce version id | change_requests | D-P-20 |

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
- [ ] D-P-15 OPEN (Commerce, 2026-11-19). Data source found: `memora-3d/*_template.json` (FP: `default`, `scale_limits_mm`, `rotation_limits_deg`, `boundary`, `forbidden_zones`, `ENGRAVE_UV` mapping; SW: `fixed` center/size/rotation, `audio_seconds`, `MEMORA_WAVECODE_v1`). These describe a planar mm / UV frame, while `personalization_placements` has cylindrical columns (`center_angle_deg`, `axial_offset_mm`, `width_mm`, `height_mm`): the mapping must be decided when placement is planned. Catalog engraving constraints for PERSO-015..017. Catalog has `ring_templates.engrave_surface_type` and anchor `surface_type` but no FP limits (angle, axial offset, width/height min-max, rotation) and no SW fixed geometry. Requested from Commerce (Phạm Quốc Duy). Blocks placement only.
- [x] D-P-16 DECIDED: create Prisma baselines now for Commerce, Operations and Experience.
  - Generate `0_baseline` from `db/` for each service's schemas.
  - Keep each service's `_prisma_migrations` table separate from IAM's.
  - Mark the baseline applied on the server with `prisma migrate resolve --applied`. That server step needs explicit authorization and a backup check when it runs.
  - Repo part done on `feat/business-prisma-baseline`: `_prisma_migrations` lives in `catalog`, `after_sales` and `memory`. Local checks passed: fresh deploy, resolve on a `db/` copy, empty `migrate diff`, identical `pg_dump`. Server: `migrate resolve --applied 0_baseline` ran on 2026-11-13 for all three services (status up to date; app-role grants on the new tables came from existing default privileges).
- [x] D-P-18 DECIDED 2026-11-19 (user): option (a). PERSO-008 and PERSO-010 create `source_bindings` in their transaction for every `consent_ring_items` item; `binding_mode` = `source_plan_mode` (FP session snapshot / Commerce context for SW). Approved change to PERSO-008. PERSO-014 deferred. Original question: how a source is bound to Ring Items. (a) PERSO-008 / PERSO-010 create `source_bindings` automatically for every `consent_ring_items` item (SHARED = one consent with two items, SEPARATE = one consent per item); PERSO-014 deferred. (b) The customer calls PERSO-014. Recommendation: (a), fewer customer steps and always inside the consent scope. Changes the approved PERSO-008 behavior, so it needs explicit approval.
- [x] D-P-19 DECIDED 2026-11-19 (user, revised the same day): the worker is the service `services/personalization_worker` in a **separate repository** `memora-python-services` (Python 3, FastAPI; one folder, requirements file, Dockerfile and image per Python service, so LightRAG can be added later as its own service under an Experience plan; shared code limited to technical helpers), ported from the earlier `bioring-be/python-services/personalization_engine` (fingerprint OpenCV pipeline: blur, CLAHE, adaptive threshold, small-component removal, main region, crop, square canvas, Potrace SVG; soundwave loader via FFmpeg). Changes for MEMORA: private Garage via S3 API (object keys in/out, no public URLs, no REVIEW/APPROVED stages, no local state kept), internal HTTP with its own secret, stateless, standard preset only, outputs and WAVECODE as in PERSO-013, no RAG/ingestion code. Delivery: **private image on GHCR** `memora-personalization-worker`, published by that repository's CI, pinned by version tag (never `latest`); the `memora-python-services` Compose project on the Mini PC (one container per service) joins the external `memora-network`, no host port, no tunnel route; Operations calls it by container name. Secrets: a shared internal secret (Operations → worker) and a **dedicated Garage key** limited to the personalization bucket. The HTTP contract lives in this repo at `docs/api/personalization/processing-worker.md` (versioned `/v1`); Operations is tested against a fake that follows it. No Python, CI or image changes in `memora-backend`; deploying the worker needs its own authorization. The architecture docs list it as a processing worker, not a business microservice. Original question: Python processing worker for PERSO-013.
- [ ] D-P-20 OPEN (Commerce, 2026-11-19): internal RPC for Ring Item Version status (`READY_FOR_REVIEW` after PERSO-018, `SUBMITTED` after PERSO-019, later `MANAGER_APPROVED` / change requests for MF02). Caller Operations only, checks the version is current and the transition is valid, idempotent. Also the final list of `ring_item_versions.status` values. Requested from Commerce (Phạm Quốc Duy).

## 9. Implementation progress log

| Date | API ID | Result | Evidence |
| --- | --- | --- | --- |
| 2026-11-13 | Phase 0 audit | PLAN ONLY | Files read listed in §2; no code, schema, RBAC or server change |
| 2026-11-15 | PERSO-001..003 | IMPLEMENTED (not deployed) | Builds gateway/operations/commerce PASS; jest 161 PASS (task-added specs then removed per rule); eslint, proto:check, boundaries, guardrails PASS. Local smoke: 401 without token, Swagger paths, gRPC UNAUTHENTICATED without secret, INVALID_ARGUMENT, list empty, Operations→Commerce NOT_FOUND→404, Commerce down→503. NOT RUN: accept/revoke against a real paid order (would write server DB), Postgres race path |
| 2026-11-15 | PERSO-005..008 | IMPLEMENTED (not deployed) | Builds gateway/operations/commerce/iam PASS; jest 220 PASS with task specs (then removed per rule), 112 PASS after; eslint, proto:check, prisma validate, boundaries, guardrails, ci:deploy-layout PASS. Local smoke: throwaway Mosquitto 2.0.21 + Operations: connect/subscribe, unknown session → SESSION_NOT_FOUND result, bad score → INVALID_MESSAGE, bad nonce dropped, other-device topic blocked by ACL; Gateway 3 routes 401 without token, Swagger paths. NOT RUN: session create/attempt/complete against real DB and Garage, Postgres lock paths, ESP32 hardware (D-P-06) |
| 2026-11-15 | PERSO-026/027 + BMP rule + D-P-07 broker users via Arcane env | IMPLEMENTED (not deployed) | Builds gateway/operations/commerce/iam/experience PASS; jest 134 PASS with task specs (then removed per rule); eslint, tsc, proto:check, prisma validate, boundaries, guardrails, ci:deploy-layout PASS. Server broker (Arcane, user-deployed): anonymous/wrong password refused, both users connect, ACL blocks other-device and own-commands publish, start command delivered (also seen in MQTT Explorer). NOT RUN: presigned URL via public endpoint, reject flow against real DB/Garage |
| 2026-11-15 | Revision: capture staff decides (PERSO-007/008/026/027) + migration `20261115120000_capture_attempt_pending_review` | IMPLEMENTED (code not deployed; migration APPLIED on server 2026-11-15) | Builds 5 services PASS; jest 152 PASS with task specs (then removed per rule); eslint, tsc, proto:check, prisma validate, boundaries, guardrails, ci:deploy-layout PASS. Migration: user-authorized, applied with `prisma migrate deploy` as owner `memora` on the server DB after a pre-check (capture_attempts and capture_sessions empty, old CHECK definitions saved); `migrate status` up to date; new CHECKs verified; operations_app grants unchanged. NOT RUN: flow against real DB/Garage/broker |
| 2026-11-17 | PERSO-007 (several pending), 008 (NOT_SELECTED + acceptedAttemptNo), 028, 029, expiry cleanup, 006 failureReason | IMPLEMENTED (not deployed, not committed) | typecheck, proto:check, lint:check, build (gateway) + build:operations PASS; boundaries 0 findings; guardrails 8/8; jest 112 PASS (14 task specs for next/close/complete/expiry/evaluate ran PASS, then removed per rule). NOT RUN: real DB transactions, live MQTT/Garage, HTTP E2E |
| 2026-11-19 | PERSO-009..019 plan + capture merge | PLAN ONLY / MERGED | PERSO-028/029 branch merged into local `dev` (57a3ee6) after typecheck, proto:check, lint, 5 builds, jest 169 PASS / 4 skipped, boundaries, guardrails PASS; not pushed. Source pipeline PERSO-009..019 planned (PROPOSED / NEEDS_REVIEW), D-P-18..20 opened. NOT RUN: live MQTT/ESP32, DB, Garage, HTTP E2E |
| 2026-11-19 | D-P-18 binding on PERSO-008 + PERSO-011 | IMPLEMENTED (not deployed, not committed) | PERSO-008 `completeSession` now creates one `source_bindings` row per `consent_ring_items` item (order from the session, `binding_mode` = session `source_plan_mode`) in the same transaction; an already-bound item fails with 412 FAILED_PRECONDITION `RING_ITEM_ALREADY_BOUND` (Gateway 409), nothing is written. PERSO-011 `GET /orders/{orderId}/personalization-sources` (`DESIGN_SUBMIT_OWN`, proto `PersonalizationSourceService.ListOrderSources`, feature `sources/`). typecheck, proto:check, build (gateway) + build:operations PASS; jest 175 PASS / 4 skipped with 6 task specs (then removed per rule); boundaries 0 findings; guardrails 8/8; lint:check PASS on task code. NOT RUN: real DB transaction / partial-unique race, live Commerce, HTTP E2E |
| 2026-11-19 | PERSO-009 + PERSO-010 (Soundwave upload initiate/complete) | IMPLEMENTED (not deployed, not committed) | New `SoundwaveUploadService` (proto + contracts), Operations feature `soundwave-upload/`, Gateway `sources/` routes with `SOURCE_AUDIO_UPLOAD_OWN`; object-storage port gains `presignPut` / `getObject`; seam `SourceProcessingTrigger` (logging no-op, PERSO-013 replaces it); env `OPERATIONS_SOUNDWAVE_UPLOAD_TTL_SECONDS` (default 600). typecheck, proto:check, lint:check, build, build:operations PASS; jest 169 PASS / 4 skipped after removing the task specs (21 PASS with them: 16 use-case + 5 magic-byte); boundaries 0 findings; guardrails 8 PASS. NOT RUN: real Garage presign/PUT/GET, DB (advisory lock, JSON path filter, P2002), HTTP/gRPC E2E, deploy. Infra TODO (not done): a browser PUT to Garage needs bucket CORS for the public endpoint (PUT, header Content-Type) |
| 2026-11-19 | PERSO-013 + PERSO-012 (processing job, status read) | IMPLEMENTED (not deployed, not committed) | Operations `shared/source-processing/`: BullMQ queue `personalization-source-processing` (jobId = sourceId, 4 attempts, backoff 30 s / 2 min / 8 min, own worker connection via `@app/queue`), `ProcessSourceUseCase`, `ProcessingWorkerPort` with HTTP adapter (X-Memora-Worker-Secret, timeouts 60/90/30 s) and unconfigured adapter, Prisma repository (conditional status writes, `wavecode` advisory lock, WAVECODE uniqueness via render-wavecode nudges); PERSO-008 complete now enqueues after commit; env `OPERATIONS_PROCESSING_WORKER_URL` / `_SECRET` (optional in development); Operations now loads `queueRedisConfig` (QUEUE_REDIS_* required). PERSO-012: RPC `GetSourceProcessing` (proto + contracts), use case in `sources/`, Gateway `GET /api/v1/personalization-sources/{sourceId}/processing` (DESIGN_SUBMIT_OWN). typecheck, proto:check, lint:check, build, build:operations PASS; focused specs 16 PASS (14 processing + 2 status) then removed; boundaries and guardrails see final report. NOT RUN: real Redis/BullMQ, real worker, Postgres locks and JSON path filter, HTTP/gRPC E2E, deploy |
