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
| PERSO-001 | POST | /api/v1/orders/{orderId}/consents | WF-01 F-02 | NEEDS_REVIEW | AcceptConsent | NEEDS_REVIEW |
| PERSO-002 | GET | /api/v1/orders/{orderId}/consents | WF-01 F-02 | NEEDS_REVIEW | ListConsents | NEEDS_REVIEW |
| PERSO-003 | POST | /api/v1/orders/{orderId}/consents/{consentId}/revoke | WF-01 F-13 | NEEDS_REVIEW | RevokeConsent | NEEDS_REVIEW |
| PERSO-004 | PUT | /api/v1/orders/{orderId}/source-plan | WF-01 F-13 | NEEDS_REVIEW | SetSourcePlan | NEEDS_REVIEW |
| PERSO-005 | POST | /api/v1/orders/{orderId}/fingerprint/capture-sessions | WF-01 F-02 | SOURCE_CAPTURE | CreateCaptureSession | PROPOSED |
| PERSO-006 | GET | /api/v1/fingerprint/capture-sessions/{sessionId} | WF-01 F-02 | SOURCE_CAPTURE | GetCaptureSession | PROPOSED |
| PERSO-007 | POST | /api/v1/fingerprint/capture-sessions/{sessionId}/attempts | WF-01 F-02 | device credential (NEEDS_REVIEW) | RecordCaptureAttempt | NEEDS_REVIEW |
| PERSO-008 | POST | /api/v1/fingerprint/capture-sessions/{sessionId}/complete | WF-01 F-02 | SOURCE_CAPTURE | CompleteCaptureSession | PROPOSED |
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

Count: 0 EXISTING, 11 PROPOSED, 14 NEEDS_REVIEW. gRPC names are candidates, not an approved proto.

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

### PERSO-001 — POST /api/v1/orders/{orderId}/consents

- Status: NEEDS_REVIEW
- Domain / Feature / Service: personalization / consent / operations-service
- Main Flow: WF-01 F-02 AC1, F-13 AC1
- Purpose: record formal, versioned, purpose- and source-type-scoped Consent for 1–2 Ring Items after verified P1.
- Actor: registered Customer who owns the Order.
- Permission: NEEDS_REVIEW (no approved code).
- Request: Params `orderId`. Body (draft) `consentType`, `policyVersion`, `ringItemIds[1..2]`, idempotency key.
- Response: Success `201 { consentId, status, acceptedAt, ringItemIds }`. Errors 400 validation, 401, 403 not owner, 409 P1 not succeeded / item not FP-SW / scope conflict.
- Validation and business rules: trusted P1 SUCCEEDED from Commerce; Ring Items belong to the Order and use FP or SW; SHARED scope only for two items of the same type; accepted scope immutable; reading the pre-P1 notice is not Consent.
- Tables: `consents`, `consent_ring_items`.
- gRPC method: AcceptConsent (candidate).
- Existing code: none.
- Dependencies: Commerce Order + P1 contract; IAM customer identity; D-P-01, D-P-02.

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### PERSO-005 — POST /api/v1/orders/{orderId}/fingerprint/capture-sessions

- Status: PROPOSED
- Domain / Feature / Service: personalization / fingerprint-capture / operations-service
- Main Flow: WF-01 F-02 AC2
- Purpose: open an in-store capture session for an FP Ring Item scope.
- Actor: Store Staff.
- Permission: `SOURCE_CAPTURE`.
- Request: Params `orderId`. Body (draft) `consentId`, `deviceCode`. Idempotency key.
- Response: Success `201 { sessionId, status: CREATED, expiresAt, attemptCount: 0 }`. Errors 401, 403, 404 order/consent, 409 no P1 / consent not ACCEPTED / revoked / wrong scope / active session exists.
- Validation and business rules: P1 SUCCEEDED (trusted); Consent ACCEPTED for the FP scope of this Order; Staff and device authorized; one active session per scope/device (policy D-P-10); `orderId` from route, never `ownerId`/`paid` from client.
- Tables: `capture_sessions` (reads `consents`, `consent_ring_items`).
- gRPC method: CreateCaptureSession (candidate).
- Existing code: none.
- Dependencies: PERSO-001, Commerce P1, D-P-06 (device registry), D-P-10 (expiry), schema gap `expires_at` (D-P-11).

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### PERSO-006 — GET /api/v1/fingerprint/capture-sessions/{sessionId}

- Status: PROPOSED
- Domain / Feature / Service: personalization / fingerprint-capture / operations-service
- Main Flow: WF-01 F-02
- Purpose: read session status for the authorized Staff.
- Actor: Store Staff.
- Permission: `SOURCE_CAPTURE`.
- Request: Params `sessionId`.
- Response: Success `200 { sessionId, status, attemptCount, maxAttempts: 3, expiresAt }`. Errors 401, 403, 404.
- Validation and business rules: never return biometric bytes, asset keys or device secrets.
- Tables: `capture_sessions`, `capture_attempts`.
- gRPC method: GetCaptureSession (candidate).
- Existing code: none.
- Dependencies: PERSO-005.

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### PERSO-007 — POST /api/v1/fingerprint/capture-sessions/{sessionId}/attempts

- Status: NEEDS_REVIEW
- Domain / Feature / Service: personalization / fingerprint-capture / operations-service
- Main Flow: WF-01 F-02 AC2
- Purpose: append one device capture attempt (max 3).
- Actor: authenticated device bridge (not a Staff JWT).
- Permission: device credential model undecided (D-P-06, D-P-07).
- Request: Params `sessionId`. Body (draft) device proof, nonce, quality metadata, asset upload reference if accepted.
- Response: Success `201 { attemptId, attemptNo, result }`. Errors 401 device, 409 4th attempt / session not open / replayed nonce.
- Validation and business rules: server allocates `attempt_no`; at most one ACCEPTED; rejected raw samples never stored; score from device is evidence, not authority.
- Tables: `capture_attempts`, `capture_sessions`.
- gRPC method: RecordCaptureAttempt (candidate).
- Existing code: none.
- Dependencies: Phase 1 AS608 image evidence (D-P-06), transport (D-P-07), object storage (D-P-08), schema gap for nonce/asset ref (D-P-11), Prisma relation fix (D-P-12).

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### PERSO-008 — POST /api/v1/fingerprint/capture-sessions/{sessionId}/complete

- Status: PROPOSED
- Domain / Feature / Service: personalization / fingerprint-capture / operations-service
- Main Flow: WF-01 F-02
- Purpose: finalize the session and create one protected FP source.
- Actor: Store Staff.
- Permission: `SOURCE_CAPTURE`.
- Request: Params `sessionId`. Body (draft) `acceptedAttemptId`.
- Response: Success `200 { sourceId, status }`. Errors 401, 403, 404, 409 no accepted attempt / session closed.
- Validation and business rules: exactly one ACCEPTED attempt; one source per session (`accepted_source_id` unique); idempotent repeat returns the same source; session status and source creation in one transaction.
- Tables: `capture_sessions`, `capture_attempts`, `personalization_sources`.
- gRPC method: CompleteCaptureSession (candidate).
- Existing code: none.
- Dependencies: PERSO-007, object storage (D-P-08).

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

### Remaining IDs (summary checklists; expand when the user approves them)

| API ID | Status | Key rules | Tables | Blockers |
|---|---|---|---|---|
| PERSO-002 | NEEDS_REVIEW | Owner or authorized Staff only | consents, consent_ring_items | D-P-01 |
| PERSO-003 | NEEDS_REVIEW | Revoke blocks new processing; retention and in-flight production effect | consents | D-P-01, D-P-13 |
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
- [x] D-P-04 DECIDED: start with one Commerce read RPC, `GetOrderPersonalizationContext(order_id)`.
  - It returns the owner customer identity, order status, `p1_paid`, `source_plan_mode`, and ring items (`id`, `current_version_id`, personalization type, version status).
  - Operations calls it through an application port with a test fake until Duy delivers it.
  - Version transition RPCs come later.
- [x] D-P-05 DECIDED: Commerce owns the Source Plan (`ordering.orders.source_plan_mode`). PERSO-004 moves to Commerce. Operations reads the value through D-P-04 and snapshots it into `capture_sessions.source_plan_mode`.
- [ ] D-P-06 OPEN (hardware): Phase 1 proof that AS608 exports an engraving-quality image (D-OPS-01). Code and tests can use fakes. PERSO-007 stays BLOCKED for production until proven.
- [x] D-P-07 DECIDED: ESP32 calls HTTPS directly. Each device has its own HMAC secret, keyed by `device_code` and held in a secret env (no DDL).
  - The device signs method, path, timestamp, nonce and body hash. The Gateway verifies the signature, a timestamp window and nonce reuse (Redis).
  - The Gateway then passes the verified `device_code` to Operations. Operations checks that the target capture session is open and bound to that `device_code`.
  - Devices never use `VerifiedActor`. Provisioning and rotation steps are written at implementation time.
- [x] D-P-08 DECIDED: MinIO on the Mini PC behind an S3-compatible infrastructure port. Local MinIO for dev.
  - Private bucket, short-lived signed URLs, checksum on every object.
  - Adding the container to `deploy/infra` is an approved direction, but the infra change and deploy still need their own authorization (rule 25).
- [x] D-P-09 DECIDED: Operations queues a BullMQ job processed inside Operations. The job calls the Python worker over internal HTTP with its own secret and passes object keys only. The worker reads and writes MinIO and returns the vector key and checksum. Job state lives in `personalization_sources.status`.
- [x] D-P-10 DECIDED: env config with validation.
  - Session TTL defaults to 15 minutes in dev. Max 3 attempts, matching the DDL CHECK.
  - The quality threshold has no production default: startup fails if it is unset outside development. It is set from the AS608 test results.
- [x] D-P-11 DECIDED: no DDL change. `db/` stays the baseline.
  - Expiry is `created_at` + TTL. No store id: BM04 has no store table, so the session uses `device_code` + `staff_user_id`.
  - Duplicate open sessions are prevented in a transaction.
  - The nonce and device evidence go in `capture_attempts.metadata_json`.
  - Only an accepted capture writes `personalization_sources.raw_asset_key`.
  - Processing state uses `personalization_sources.status`. The order link goes through `source_bindings` and `capture_sessions.accepted_source_id`.
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
