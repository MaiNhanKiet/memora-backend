> **How to use this file (repository note, 2026-11-13).** This is the Operations roadmap for all 85 API IDs. It is reference data, not instructions that override `CLAUDE.md` or `.claude/rules/`. Where they conflict (for example "continue to the next phase" or branch and commit actions), the repository rules win.
> Per-feature API detail, decisions and progress live in `docs/plans/active/<feature>.md` (Personalization: `docs/plans/active/operations-personalization.md`). This file's Implementation Log keeps one row per phase only.
> BM04 snapshot: `docs/requirements/MEMORA_BM04_Review2_Commitment.md`.

# MEMORA — Operations Service API & IoT Implementation Plan for Claude Code

> **File:** `docs/plans/MEMORA_OPERATIONS_SERVICE_API_IOT_PLAN_FOR_CLAUDE.md` (recommended repository placement)  
> **Prepared:** 2026-11-13  
> **Status:** Implementation plan / engineering proposal, **not** evidence of implementation or reviewer approval  
> **Priority:** **Personalization + IoT AS608/ESP32 first**, then Production → Fulfillment → After-sales  
> **Tracked inventory:** 85 proposed Operations contracts = 25 Personalization + 28 Production + 14 Fulfillment + 18 After-sales; **80 Gateway HTTP + 5 internal contracts**  
> **Owners:** This plan targets the engineer implementing Operations/IoT/Python Fingerprint. **Commerce is assigned to Phạm Quốc Duy**; do not modify Commerce internals without coordination.

## START HERE — instructions Claude Code must follow

You are Claude Code acting inside the **actual `memora-backend` repository**, not in a simulated project. Implement **one gated phase at a time**, beginning with Personalization + Fingerprint IoT. Do **not** attempt all 85 endpoints at once.

1. Read repository `CLAUDE.md`, `README.md`, existing `docs/architecture`, `docs/api`, `docs/plans`, `apps`, `proto`, `libs`, `db` and relevant test scripts. If any source is absent, record this; do not invent its contents. Inspect Git branch/status. Do not switch branches, delete branches, commit, push, reset, force, drop schema, or modify production DB/secrets unless explicitly authorized by repository instructions/user.
2. Perform **Explore → Plan → Implement → Verify** for the current phase. Start with **PHASE 0 (audit)** and **PHASE 1 (IoT hardware image feasibility)**. After each phase, update the checklist and `Implementation Log` here with evidence, commands/exit codes, changed files and remaining blockers. Continue to the next unblocked phase, respecting dependency gates; don't fabricate test PASS.
3. **Treat requirements as a hierarchy:** BM04 v1.0 (WF-01..04/F-01..13, NFR) + 2026-11-13 synchronized `MF01.md..MF04.md` > historical six Main Flows > 2026-10 API Master draft. Existing repository contracts that have explicit approval also need reconciliation. **Never silently choose one of conflicting policies.** For ambiguous field names, account model, session authentication, State Machine, legal/payment policy, hardware image capabilities or cross-service message schema, open a Decision entry and use mocks only in tests, not production.
4. Respect service ownership: **IAM** owns identity/auth/RBAC; **Commerce (Phạm Quốc Duy)** owns Order/Ring Item Version/Quote/Payment/Catalog/Pricing/Inventory; **Operations** owns Personalization, Production, Fulfillment, physical After-sales; **Experience** owns Digital Memory/LightRAG; **Python Fingerprint Worker** does processing, not commercial authorization. No direct writes into another service's DB. Physical cross-service foreign keys are not allowed unless architecture is formally changed; use UUID logical references and contract verification.
5. Create/modify only necessary files; use existing NestJS monorepo layout, naming, lint/tsconfig, shared validation, gRPC, Prisma and logging conventions. Prefer reuse over duplicate modules. New packages/dependencies require rationale. No invented endpoint is to be called 'approved' solely because it appears in this plan.
6. Each implementation PR should include contract/schema notes, DTO validation, authn/authz/owner checks, persistence/migrations where approved, idempotency and concurrency handling, safe errors, unit/integration tests, Swagger/proto documentation and status tracker updates. Avoid exposing sensitive FP/audio payload in logs, Swagger examples or test fixtures.
7. On PHASE 1: **Do not assume AS608 exposes an engraving-quality raw fingerprint image.** Prove this with actual sensor firmware/transport and documented sensor protocol first. Sensor matching templates are **not** automatically convertible to fingerprint artwork. If only a template is obtainable, mark hardware path BLOCKED for engraving and propose approved sensor/bridge replacement; never synthesize biometric image and claim it came from AS608.

### Canonical references (read, do not edit during implementation without request)

- BM04 Review 2 Commitment: https://docs.google.com/document/d/1YOhWSWpjXaP-XGR-DxVmhNug6MzMc8WW/edit
- Main Flows: MF01 https://drive.google.com/file/d/1Wzs50m6A-h0ca3YgBbyCbYz-gFkGp3vB/view · MF02 https://drive.google.com/file/d/1Pgvb6fLGs377RElxVfEj1O5Mcy8nK3Lk/view · MF03 https://drive.google.com/file/d/1DW4A9Mk6WvOsBxq3awCXGP0lFCOK7KVl/view · MF04 https://drive.google.com/file/d/1S7hr_CvkAxgV1QTTNKXJgYzxYTdsf00E/view
- API Master (draft, not confirmed runtime): https://docs.google.com/spreadsheets/d/1LKiISSYhrsHHjVMM95utcMAX-1dNWf8aGepkBCBqP6I/edit
- Database Tracker (logical BM04, 74 tables / 12 domains / DDL pending): https://docs.google.com/spreadsheets/d/1TAcBkuald9TVt4B-GN46UD0j8ddT7IH8mwgVD3ALiak/edit
- Backend Foundation Tracker: https://docs.google.com/spreadsheets/d/1TukSa6VIc718f78viGRBiZCMTSW1SgWhdUWQrTUP_KQ/edit

## 1. Architecture and protocol decisions

| Link | Transport | Status and rules |
|---|---|---|
| Web/Mobile/Staff UI → Gateway | **HTTPS REST/JSON** | Project architecture baseline; OpenAPI DTO + JWT/verified session + RBAC/ABAC. No direct UI → microservice access. |
| API Gateway → Operations NestJS | **gRPC/Protocol Buffers** | Proposed implementation consistent with existing IAM gRPC integration; inspect actual proto conventions before writing. Internal headers: caller identity, permissions and correlation ID; Operations independently enforces policy. |
| Operations ↔ IAM | **gRPC internal** | Identity, session, role/permission/device staff authorization via approved IAM contracts; don't duplicate IAM DB. |
| Operations ↔ Commerce | **gRPC internal** | Read verified P1/Order/Ring Item/version state and quote/lock gates through Commerce-owned API; **Phạm Quốc Duy** coordinates. No direct DB cross-write or fake gateway success. |
| AS608 ↔ ESP32 | **UART TTL / sensor proprietary protocol** | Validate voltage/baud/packet format, commands, raw-image export and throughput with actual hardware/datasheet. |
| ESP32 → trusted Store bridge / ingestion boundary | **HTTPS with per-device auth or serial-to-PC trusted bridge (TBD)** | Do not expose a raw public upload endpoint unauthenticated. Authenticate device and authorized staff/session independently; TLS, replay protection, strict size/time limits. IoT transport is a design decision, not already approved. |
| Operations → Python fingerprint processor | **Internal authenticated job API (HTTP/gRPC TBD)** | Pass protected object reference + immutable job/source/version IDs, not raw biometrics via event payload; worker never updates commercial Order status. |
| Asynchronous worker notifications | DB job + polling first; RabbitMQ optional after foundation is verified | At-least-once delivery requires idempotent consumer/retry/DLQ; do not make MQ prerequisite for Phase 1 proof. |
| Operations DB | **Prisma + PostgreSQL** | Own Personalization/Production/Fulfillment/After-sales logical schema. DB Tracker is not deployed DDL. Incremental migration only after schema review; UUID references across services are logical, not physical FK. |
| Asset storage | Protected object store + checksum | Encrypt at rest, short-lived signed URLs, TTL/retention under approved policy; no public bucket for biometric source. |

**Python service separation:** LightRAG belongs to Experience; Fingerprint processing belongs to Operations orchestration. Both may use Python infrastructure but MUST be separate routers/jobs, permissions, data access and logs. Never send fingerprint/audio raw material into a LightRAG prompt, vector knowledge index or telemetry.

## 2. Hard BM04 invariants (must become server tests)

1. Only authenticated registered Customer can create personalized FP/SW Order. Guest All-NONE requires verified email; Order Code alone is not authorization. Operations never auto-claims a Guest Order because of a matching email.
2. **Pre-P1**: show and persist acknowledgement of privacy/source-processing disclosure and payment/Consent-refusal terms; the exact policy text and nonautomatic P1 refund wording require approved legal/business policy. This notice is **not formal Consent**.
3. **Post verified P1 and before source capture/upload/process**: versioned, explicit, purpose- and source-type-specific Consent with exact Ring Item scope (1–2 Ring Items); revoke/cancel must block prohibited new processing. Never infer Consent from checkout or P1.
4. Fingerprint: in-store **AS608+ESP32** with authorized Staff and device, max **3 attempts per Capture Session**, accepted quality only; rejected attempts must not persist raw biometrics. Protected source only after accepted capture. SHARED source for two same-package rings may share source but **not placement, version or approval**.
5. FP placement: position, bounded min/max scale, rotation within template `ENGRAVE_SURFACE` boundaries, forbidden zones and tolerances. Bounds are catalog/template-provided; never invent hardcoded sizes or laser calibration.
6. Soundwave: upload supported audio **or in-app record ≤30 seconds**; select **exactly 3000 ms** from eligible source, fixed template-defined engraving geometry; no client position/scale/rotation. Existing API draft still has outdated details: update contracts to BM04 before implementation.
7. NONE Ring Items need no FP/SW Consent/Source/Manager Design Review, but still need independent Manager Final QC in MF02. All-NONE bypasses P1/P2; Order with any FP/SW uses P1 then P2 ≥70% eligible paid credit before Lock. Operations must not build a universal P2 gate.
8. Customer Approval (MF01) is distinct from Manager Review (MF02) and Customer Final Confirmation (Commerce/MF02). Only exact current version and immutable evidence may transition to `READY_FOR_REVIEW` → `SUBMITTED` → `MANAGER_APPROVED` or controlled `REQUEST_CHANGES`/version replacement.
9. Lock is **Order-level**, immutable, conditional on exact Final Quote/Confirmation and payment/reservation gates; Production Package/laser geometry must use locked asset/versions/checksum only; reject stale client assets and SW transforms.
10. All Ring Items must have latest valid Manager QC PASS before `READY_FOR_HANDOVER`; MF03 requires paid final balance, full-order physical delivery and proof, not partial handover. Warranty/Plan/eligible Memory activate only after successful handover, activation retry must not roll back `COMPLETED`.
11. After-sales Claim binds **one physical Ring Item**; WARRANTY/MAINTENANCE/RETURN only, not DATA_RIGHTS. Refund is independent, requires physical return receipt/inspection and cannot exceed attributed actual paid amount; original Order remains `COMPLETED`.
12. All critical writes: ownership/RBAC/ABAC, state/version preconditions, idempotency key or equivalent, unique DB constraints, transaction/outbox where appropriate, correlation ID, immutable audit, privacy-safe failures. Zero unauthorized source/memory access; do not leak biometric data.

## 3. Ownership boundaries and dependency contracts

| Required capability | Owner | Operations consumes / returns | Action |
|---|---|---|---|
| JWT, Staff permission, customer/guest verified identity | IAM | Authenticated principal / authorized Store Staff, `storeId`, device binding if chosen | Reuse verified IAM contracts, do not create duplicate user/role table |
| `Order`, `RingItem`, current `RingItemVersion`, source plan/fulfillment snapshot | Commerce | Get state & owner & items; perform valid state transition via Commerce only | Agree gRPC messages with Quốc Duy before integration |
| P1 PayOS verified payment state | Commerce | Query **trusted verified** P1 credit, not FE redirect or client boolean | Provide mock in tests behind same interface; never allow mock in production |
| Ring Template geometry / surface / supported package | Commerce/Catalog | Read immutable template/version constraints for geometry checks | Validate transform via authoritative template snapshot |
| Consent/Capture/Source/Placement/Customer & Manager design reviews | Operations | Own tables, services, policies; emit completion events | This plan's first implementation target |
| Python vectorization / quality processing | Python worker (Operations orchestration) | Source processing job/result reference+checksum | Separate from Experience LightRAG |
| Production/QC/Delivery/Claims | Operations | Phases after Personalization E2E, other service gates checked | Do not build all at once |
| Digital Memory/PIN/Access/WebAR/LightRAG | Experience | Enable/provision only for eligible post-handover FP/SW selected | Supporting UC; no raw source directly exposed |
| Data Rights export/delete/revocation | Independent Supporting UC/authorized platform owner | Operations handles dependency/retention/blocks, not physical `Claim` | Redesign AFTER-017/018 rather than reproduce legacy paths |

**Cross-service contract list to negotiate:** `GetOrderPersonalizationContext(orderId)`, `IsP1Verified(orderId)`, `GetCurrentRingItemVersion(ringItemId)`, `GetRingTemplateEngravingConstraints(templateVersionId)`, `GetAuthorizedStaffContext(staffId,storeId)`, `AdvanceOrderVersionReadiness(orderId,ringItemId,expectedVersion,status)` — *illustrative RPC names only, not authoritative or existing implementations*. Establish approved proto names with Commerce/IAM before production integration.

## 4. Phase-by-phase execution board

> **Exit-gate rule:** Mark a phase COMPLETE only with actual artifact, reproducible test, and code evidence. If hardware/proto/payment dependencies are unavailable, mark PARTIAL/BLOCKED, implement mocks in tests only and progress to other independent work. Never mark all 85 APIs complete by generating controllers alone.

### PHASE 0 — Repository & contract audit (P0, first)

- [ ] Inspect `apps/operations-service`, Gateway, IAM, Commerce, repo `CLAUDE.md`, docs, `proto/`, `libs/`, Prisma schemas/migrations, test tooling, CI. Inventory current endpoints and versions; identify conflicts with 2026-11-13 flows.
- [ ] Record precise current Git commit, branch and clean/dirty state without altering history.
- [ ] Create `docs/api/operations-contract-matrix.md`: 85 IDs, repo route status, proto method, owning module, BM04 rule, tests, deviations. Existing API Master is *proposed*; preserve IDs for traceability, do not re-implement already present ones.
- [ ] Confirm 9 Personalization logical tables, keys, status enums, cross-service UUID boundary and migration strategy. Explicitly resolve conflicting `PENDING_FINAL_QUOTE` (MF02) vs `AWAITING_FINAL_QUOTE` (DB Tracker) with Commerce before relying on it; Operations should not own Order status enum.
- [ ] Confirm shared error conventions, validation, correlation ID, idempotency middleware, secret redaction and auth metadata. Define interface fakes for IAM/Commerce/Python.
- [ ] Decide supported IoT networking deployment: Store PC bridge or direct device TLS; document threat model and safe handling of biometric data.
- **Exit:** A reviewed audit and dependency matrix, no production DB mutation, deterministic Phase 1 test instructions.

### PHASE 1 — IoT AS608/ESP32 feasibility proof (P0, first hardware work)

- [ ] Document actual AS608 module model/firmware, UART wiring/voltage/baud, available protocol commands and image acquisition mode from its technical documentation (not assumed).
- [ ] ESP32 firmware POC connects and performs capture; measure image export availability, frame dimensions, encoding, retrieval transport, capture quality, retry timing and maximum payload size.
- [ ] Distinguish **fingerprint matching template** from image pixels usable for engraving. If AS608 only supports template, record **BLOCKED — device limitation**, recommend tested image-capable capture device, and do not substitute a fake fingerprint.
- [ ] Build safe local/isolated Store bridge or HTTPS test endpoint for binary transfer; device metadata, fixed test IDs, nonce/replay defense, file size/checksum verification. **Use consenting test subjects/test artifacts only**. No raw data in logs or Git.
- [ ] Supply reproducible evidence: non-sensitive diagnostics, image format/quality metadata, transmission success, failure/retry cases. For biometric screenshots/real samples, use approved protected storage, not plan/log attachments.
- **Exit:** Demonstrated source suitable for controlled processing **or** explicit BLOCKED decision with alternative, plus proof of secure device transport. This POC is not production authorization.

### PHASE 2 — Operations Personalization foundation (P0)

- [ ] Add/reuse NestJS `PersonalizationModule` and its controller/gRPC interfaces, service/domain layer, repositories, config, authorization guards, error mapper and unit test scaffold under actual repo conventions.
- [ ] Validate Personalization logical schema (see §5), create incremental Prisma migration **only after review**; no `db push` against shared/prod DB, no dropping existing tables. No cross-service physical FK.
- [ ] Complete `PERSO-001/002/003` (Consent) and `PERSO-004` (Source Plan); fetch trusted Order/P1/identity gates from IAM/Commerce. Consent accepted scope immutable, includes 1–2 Ring Items through `consent_ring_items`; SHARED only for two same-kind FP or two same-kind SW.
- [ ] Persist pre-P1 notice acknowledgement in Commerce-owned checkout/Order evidence via agreed contract; never mislabel it as formal Operations Consent. Confirm disclosure exact wording with business/legal owner.
- [ ] Add first Gateway REST → Operations gRPC contract and Swagger; write negative authorization/state tests and idempotent accept/revoke tests.
- **Exit:** Verified/denied Consent cases, P1 gate protection, schema/migration tests, successful Gateway→Ops gRPC E2E with Commerce fake (and real integration when available).

### PHASE 3 — IoT Capture Session end-to-end (P0, FIRST operational API vertical slice)

- [ ] Implement `PERSO-005` Create Session, `PERSO-006` Read Session, `PERSO-007` Append Attempt, `PERSO-008` Complete Session.
- [ ] Session `CREATED → IN_PROGRESS → COMPLETED / FAILED / CANCELLED / EXPIRED`; exact state transitions and timeouts from repository/decision tracker, not invented default. `attempt_no=1..3`, unique `(sessionId,attempt_no)`, at most one ACCEPTED per session; transaction/lock handles simultaneous attempts.
- [ ] Capture gate requires trusted **P1 SUCCEEDED** + accepted Consent for exact FP Ring Item scope, Store Staff permission, authorized Store/device/session. Device credentials do not impersonate Staff JWT. Session binds `orderId, consentId, sourcePlanMode, storeId, authorizedStaff, device` and scope from Consent.
- [ ] Accept quality metadata only as device evidence; verify file/source integrity server-side. Record rejected attempts metadata only, **never rejected raw FP samples**. Accepted image stored encrypted/private, checksum and object reference; do not put raw bytes in DB, logs or gRPC message.
- [ ] Device REST/bridge upload and Staff REST are **separate trust boundaries**. If bridge transmits raw bytes, secure transport and storage; upload token scoped to exact session/device/attempt, TTL and single-use. Rate-limit and detect replay.
- [ ] Complete creates one accepted protected `personalization_source`, never source from failed/invalid attempt; idempotent complete returns same source reference.
- [ ] Tests: no P1; no Consent; revoked Consent; wrong ring/owner/store; expired session; 4th attempt; two parallel attempts; replayed device proof; weak sample; completion before accepted attempt; double complete; unreachable device; blocked image extraction.
- **Exit:** End-to-end **Store Staff → Gateway → Operations → Capture Session → device bridge → accepted source** in test environment, real hardware path demonstrated if possible, all negative tests recorded.

### PHASE 4 — Python Fingerprint processing (P0; in parallel only after Phase 1 has image evidence)

- [ ] Add independent Python worker/processing router **for fingerprint only**, separate from LightRAG modules. Python receives authenticated job ID + protected source reference + `source_type=FINGERPRINT`; no direct Order status writes, no raw asset returned to public client.
- [ ] Processing pipeline: checksum validation → source image decode → quality check → calibrated cleanup preserving ridge identity → vector generation → geometry-independent SVG asset → checksum/object reference + status/evidence. **Never fabricate missing ridges** or claim a recognition template is actual image.
- [ ] Use idempotent `processing_job_id` and version, bounded retries, timeout, failed/error state, object-store ACL; `PERSO-013` internal trigger/retry and `PERSO-012` status; Operations owns `personalization_sources` readiness.
- [ ] Add acceptance tests with fully synthetic/public demo patterns, corrupted image, duplicate job, unsupported format, slow worker, unauthorized fetch and failed quality; inspect output geometry safely before engraving.
- **Exit:** Approved accepted image turns into protected vector asset with validated checksum, observable status and safe retry; no LightRAG dependency.

### PHASE 5 — Complete remaining Personalization APIs (P0)

- [ ] `PERSO-009/010`: upload/in-app recording for SW, max 30s recording; asset size/codec constrained by approved source policy; **exactly 3000ms selected**; do not inherit legacy 2–5 seconds. Support test content and distinct per-Ring selection with same SHARED source.
- [ ] `PERSO-011/014`: list permitted sources and bind to exact Consent + Ring Item/Version. Preserve SHARED/SEPARATE and binding history, don't expose source to other owner.
- [ ] `PERSO-015/016/017`: canonical engraving geometry; FP bounded transform vs SW fixed geometry, `ENGRAVE_SURFACE`, forbidden zone, version/mapping checksum; reject invalid transforms and stale assets.
- [ ] `PERSO-018/019`: Customer approves exact preview and submits version; cannot skip ready/source/consent. `PERSO-020..022`: Manager reviews current `SUBMITTED` FP/SW only; NONE does not need Manager Design Review. `PERSO-023..025`: approved changes require controlled new version and invalidate affected quote/confirmation pre-Lock.
- [ ] Contract-driven tests cover BM04 F-02 and F-12, MF01/MF02 exit and review gates; status updates happen via Commerce-owned contract, not direct Order DB mutation.
- **Exit:** All **25** Personalization API/contract IDs mapped to implementation or explicit agreed exception, IoT FP and SW happy/negative paths, reproducible tests and API documents.

### PHASE 6 — Production (P0, AFTER Personalization ownership ready)

- [ ] Implement **28** Production contracts `PRODU-001..028`, prioritizing immutable Order-level Lock, correct All-NONE vs FP/SW authorization gate, current versions, signed Production Package/asset checksum, Production Route, qualified Jeweler/laser permission and per-Ring Work Order/Attempt.
- [ ] Independent Manager Final QC for **all Ring Items including NONE**; QC FAIL must route through authorized REWORK/REMAKE/SCRAP and repeat QC. All current Ring Items QC PASS before Commerce advances Order to `READY_FOR_HANDOVER`.
- [ ] Do not assume MEMORA drives the laser machine; focus on verified export package, controlled execution authorization, material/profile traceability.
- **Exit:** BM04 WF-02 state/API tests, signed package/unsafe geometry rejection and documented Commerce integration.

### PHASE 7 — Fulfillment (P1)

- [ ] Implement **14** `FULFI-001..014` after Commerce final payment contract is reliable. Gateway Recipient QR is short-lived, single-use, binds Order/session/recipient and has verified-email fallback; `QR VERIFIED` alone ≠ physical handover.
- [ ] For delivery, require verified PayOS before dispatch, Store RELEASE+Delivery Staff RECEIVE custody; maximum **two physical attempts**, then return to Store/collection. No COD, no partial Order handover. Persist immutable proof before `Order COMPLETED` and entitlements activation.
- **Exit:** BM04 WF-03 tests for pickup, delivery, incorrect recipient, damaged/missing Ring Item, failed QR, partial attempt, retry and payment gates.

### PHASE 8 — Physical After-sales (P1)

- [ ] Implement **16 physical/maintenance API IDs** `AFTER-001..016` and `AFTER-010` internal. Physical Claim type `WARRANTY|MAINTENANCE|RETURN` only, exactly one Ring Item, authenticated claimant, 12-month warranty, optional Plan (two completed polishings/12 months), paid quote before work, item-credit-bounded refund after Return RECEIVED and inspection.
- [ ] New Claim-linked repair attempt and Manager QC; track custody and after-sales handback separately; original Sales Order remains `COMPLETED`. Resolve Claim terminal states `REJECTED/CANCELLED/CLOSED` with reviewer before freezing enum.
- [ ] **Do not implement `AFTER-017/018` under `/claims/`:** these are **legacy mismatches**. Design DATA_RIGHTS independent Supporting Use Case, route authorization/retention/operational dependency for approval; keep IDs as deprecated traceability.
- **Exit:** BM04 WF-04 tests and data-rights redesign decision documented. 18 IDs accounted for, not all necessarily under Operations runtime.

### PHASE 9 — Cross-flow E2E, audit and release readiness

- [ ] Verify BM04 workflow case IDs relevant to Ops, including negative transitions and e2e; document case ↔ endpoint ↔ service ↔ evidence ↔ commit mapping.
- [ ] Stress idempotency/replay/concurrency, IAM/Commerce outages, Python timeouts, device disconnects, storage errors, insufficient permissions. Set NFR measured baselines rather than asserting performance from source code.
- [ ] Run exact repository scripts (discover, do not assume): lint, format, typecheck, build, unit, integration, E2E, migration checks, proto compatibility and CI. Report actual exit codes.
- [ ] Review logs for secrets/biometrics, protected object ACL and subject access, cross-service database boundary; make migration rollback plan and staging evidence.
- **Exit:** Evidence-backed implementation table; no unresolved critical/high defects; explicit reviewer sign-off status, not invented PASS.

## 5. Personalization data model — 9 logical tables in DB Tracker

| Logical table | Primary responsibility | Required integrity |
|---|---|---|
| `personalization_sources` | Authorized accepted FP/SW sources, processing statuses and encrypted asset references/checksums | Protected source creation only after accepted Consent + quality; no rejected raw data |
| `source_bindings` | Source ↔ scoped Ring Item(s) | One active source binding per Ring Item, historical relink retained; SHARED source ≠ shared approval/version |
| `consents` | Versioned purpose/source-specific acceptance and revocation | Immutable accepted scope and evidence; valid after P1 before collection |
| `consent_ring_items` | Consent ↔ 1–2 Ring Items | Unique `(consent_id, ring_item_id)`; SHARED 2 items allowed only within same source type |
| `capture_sessions` | In-store device capture lifecycle | Bind Order, Consent, store/device, policy/session status; Store/Staff authorization |
| `capture_attempts` | Append-only quality/result of attempt 1–3 | Unique `(session_id,attempt_no)`; at most one ACCEPTED; no raw rejected samples |
| `personalization_placements` | One versioned canonical geometry + selected SW 3s / FP placement | Unique Ring Item Version placement; FP constraints, SW template-fixed; mapping/checksum |
| `design_reviews` | Customer Approval & Manager Review evidence | Exact version, actor, decision, reason and immutable history |
| `change_requests` | Controlled physical changes before Lock | New version (not in-place edits), invalidation of quote/confirmation as needed |

> DB Tracker explicitly labels design approved but **DDL pending**; this plan does not authorize migrations to a shared/production database. Consult `FIELDS`, `RELATION_RULES`, `DECISIONS`, `MIGRATION` rather than inventing field data types. Some references to Commerce-owned items are logical UUIDs, not PostgreSQL cross-service FKs.

## 6. Phase 3 IoT API contracts — implementation-ready checklist, not yet approved payload schema

These 4 HTTP Gateway routes are **identical to existing API Master IDs/paths**; payloads below are safe draft examples. Fields or error codes must be reconciled with `DANH MỤC API` and current repo/proto before implementation. No field in this section is an assertion that source code already implements it.

### PERSO-005 — Create Capture Session

`POST /api/v1/orders/{orderId}/fingerprint/capture-sessions` → Gateway → Operations gRPC.

- Authorized Store Staff; verified Order contains FP, legitimate Consent ACCEPTED for exact FP Ring Item scope, trusted P1 payment, approved device/site. No arbitrary `ownerId` or `paid=true` from client.
- Draft input: `{ "consentId": "uuid", "deviceId": "registered-device-id" }` plus authenticated session/correlation ID; obtain `orderId` from route; Ring Item scope read from Consent.
- Draft result: `{ "sessionId": "uuid", "status": "CREATED", "expiresAt": "ISO-8601", "attemptCount": 0 }`.
- Concurrency: one active capture session per relevant scope/device under approved policy; duplicate request uses idempotency key or existing active session.
- Negative: Order wrong owner/type, no P1, no Consent, expired/revoked Consent, wrong device/store/staff permission → typed blocked responses, no capture opened.

### PERSO-006 — Read Capture Session

`GET /api/v1/fingerprint/capture-sessions/{sessionId}`.

- Draft result: `{ "sessionId": "uuid", "status": "IN_PROGRESS", "attemptCount": 1, "maxAttempts": 3, "expiresAt": "ISO-8601" }`.
- Never return biometric source bytes, device secrets or another Store Staff's unauthorized session data. Only relevant authorized actors.

### PERSO-007 — Append Capture Attempt

`POST /api/v1/fingerprint/capture-sessions/{sessionId}/attempts`.

- Draft input from **authenticated device bridge**, not ordinary FE body: `{ "deviceProof": "signed-proof-or-ref", "qualityMetadata": { "score": 0.0, "status": "REJECTED" }, "assetUploadRef": "protected-object-ref-if-accepted" }` (*illustrative*; don't trust a client-provided score as authority).
- Draft result: `{ "attemptId": "uuid", "attemptNo": 1, "result": "ACCEPTED|REJECTED|ERROR" }`.
- `attemptNo` allocated by server and bound to `(sessionId,deviceId,nonce)`, replay-proof and unique; maximum 3 attempts. Never raw-image logging. Rejected sample raw file must be discarded promptly; accepted asset must be verified before storing.
- Important open contract: **How is binary fingerprint image transferred?** Upload reference/streaming device-bridge design, proof encoding, authenticity, codec, size limits and retention require Phase 1 hardware evidence and security decision.

### PERSO-008 — Complete Capture

`POST /api/v1/fingerprint/capture-sessions/{sessionId}/complete`.

- Authorized Staff, session with exactly one accepted Attempt and valid protected image/source; Draft input `{ "acceptedAttemptId": "uuid" }`.
- Draft result `{ "sourceId": "uuid", "status": "PROCESSING_PENDING|READY" }` based on actual worker path; exact enums should come from reviewed schema.
- Atomicity: finalize session and create/bind accepted source once; duplicate complete returns existing legitimate result; concurrent attempts cannot overwrite chosen source.
- Follow-up: `PERSO-013` trusted internal processing job and `PERSO-012` status endpoint.

### Suggested internal gRPC shape (illustrative, no production .proto until review)

```protobuf
// For contract discussion ONLY. Follow repo naming, auth metadata, error types and canonical DTOs.
service PersonalizationCaptureService {
  rpc CreateCaptureSession(CreateCaptureSessionRequest) returns (CaptureSessionReply);
  rpc GetCaptureSession(GetCaptureSessionRequest) returns (CaptureSessionReply);
  rpc RecordCaptureAttempt(RecordCaptureAttemptRequest) returns (CaptureAttemptReply);
  rpc CompleteCaptureSession(CompleteCaptureSessionRequest) returns (CaptureCompleteReply);
}
```

**Security:** REST JWT authenticates Staff; the device transport uses per-device credentials/attestation and one-time session-scoped proof. The Gateway validates JWT and Operations rechecks resource authorization. Never accept a device message as proof of payment or Consent.

## 7. Acceptance tests & evidence minimums for first vertical slice

| Test ID (new engineering test label) | Scenario | Expected gate |
|---|---|---|
| `OPS-FP-01` | Registered FP Order, P1 SUCCEEDED, accepted scoped Consent, Staff/device valid | Session created |
| `OPS-FP-02` | FP Order P1 pending/failed; Client falsely asserts paid | Denied; no session |
| `OPS-FP-03` | Consent absent, wrong purpose, wrong Ring Item scope or revoked | Denied; no device capture |
| `OPS-FP-04` | Wrong Staff role/store/device or another Customer's Order | Denied; no biometric leak |
| `OPS-FP-05` | 3 rejected/failed attempts then attempt 4 | Attempt 4 denied; no official source |
| `OPS-FP-06` | Concurrent duplicate attempt nonce / retry | At most one appended record per proof |
| `OPS-FP-07` | Accepted attempt image is corrupt/unsupported or checksum mismatch | No accepted source; safe failure |
| `OPS-FP-08` | Accepted valid image, complete twice | One source only; stable idempotent result |
| `OPS-FP-09` | Device disconnect, timeout, expired session | Explicit failure/retry, no implicit completion |
| `OPS-FP-10` | Source processing worker slow, dead, replays job | Observable `PENDING/FAILED/READY`; no duplicated source asset |
| `OPS-FP-11` | Fingerprint preview placement invalid vs template | Reject save/approval, no production-ready asset |
| `OPS-FP-12` | SHARED 2 FP Ring Items | Shared original source with **separate** placements/versions/approvals |
| `OPS-SW-01` | SW source uploaded/recorded ≤30s, select exactly 3000ms | Valid waveform fixed geometry |
| `OPS-SW-02` | SW selection 2000/5000ms or transform attempt | Rejected server-side |

**Evidence files (safe to commit):** redacted test report, test case↔BM04 mapping, test command+exit code, proto schema/checksum, migration diff, non-sensitive device capability note, trace IDs with scrubbed logs. Never commit raw biometrics, source audio, tokens, private object-store URLs or `.env`.

## 8. Ambiguity / approval queue (do not silently decide)

| ID | Issue | Temporary approach |
|---|---|---|
| `D-OPS-01` | Real AS608 supports engraving-quality raw image? exact UART command/format? | Hardware POC and datasheet; BLOCKED otherwise |
| `D-OPS-02` | Direct ESP32 HTTPS or Store USB/serial bridge? credential provisioning, trust & network? | Use isolated POC, finalize secure transport before live customer data |
| `D-OPS-03` | Internal Python protocol (HTTP/gRPC), object store, processing-job schema? | Define interface and fake worker; no direct public raw image endpoint |
| `D-OPS-04` | Cross-service P1/Order/version verification protobuf and availability? | Coordinate Quốc Duy / IAM, use test mocks only |
| `D-OPS-05` | Exact pre-P1 disclosure and Consent-refusal/P1 refund legal text? | Preserve BM04 gating, require policy approval |
| `D-OPS-06` | Capture session expiry, concurrency policy, quality score threshold, allowed stores/devices? | Configurable values, not invented production defaults |
| `D-OPS-07` | SW source codecs/upload length vs direct in-app recording ≤30s? | BM04 exact 3s selection; record mode max30s; get supported codec policy |
| `D-OPS-08` | Source/Consent retention and revocation during active production? | Minimum necessary audit, retention/legal and operational dependency decision |
| `D-OPS-09` | All-NONE Order state `PENDING_FINAL_QUOTE` (MF02) vs `AWAITING_FINAL_QUOTE` (DB) | Commerce owns enum; reconcile before state machine implementation |
| `D-OPS-10` | Claim rejected/cancelled terminal status vs CLOSED + outcome | No final enum until BM04/MF04 decision confirmed |
| `D-OPS-11` | `AFTER-017/018` legacy Data Rights under Claims | Mark superseded; independent Supporting UC proposed |
| `D-OPS-12` | Legacy `PRODU-002` draft says universal P2 gate | Use BM04 conditional All-NONE vs FP/SW; update contract before coding |

## 9. Definition of done (DoD) / execution discipline

- [ ] Exact feature gating implemented at **server/domain** level (not only UI); verified authn/authz/ABAC, privacy and Consent controls.
- [ ] Real service gRPC routing, DTO validation/OpenAPI, versioned proto compatibility, consistent error mapping; no direct privileged HTTP microservice exposure.
- [ ] Prisma migrations reviewed on isolated database, constraints and rollback documented, no cross-service physical FKs.
- [ ] Per-write idempotency, transaction boundary, safe retry, correlation ID and immutable audit where required.
- [ ] All phase-specific positive, negative, concurrency and privacy tests pass with reproducible logs **or** clearly marked PARTIAL/BLOCKED.
- [ ] Hardware POC evidence demonstrates actual fingerprint image feasibility; no fabricated successful image/template conversion.
- [ ] Existing IAM and Commerce modules untouched except approved shared contracts; coordination documented.
- [ ] Tracker updated per API `NOT_STARTED | IN_PROGRESS | IMPLEMENTED | TESTED | BLOCKED | DEFERRED` with evidence, not an unverified claim.
- [ ] BM04 acceptance criteria and test case IDs linked to tests; reviewer decisions and outstanding deviations recorded.

## 10. Claude response format after each phase

```text
PHASE: <0..9> | STATUS: PASS / PARTIAL / BLOCKED
Repository branch/commit: ...
Verified current contracts: ...
Changes made: <paths + short rationale>
API IDs implemented/tested: ...
DB migration/proto changes: ...
Tests performed: <command + exit code + count>
Hardware evidence (if applicable): <no biometric samples>
BM04 mismatches discovered: ...
Dependencies/decisions needed: ...
Next unblocked phase: ...
```

---

## APPENDIX A — Full Operations API inventory (source = API Master draft)

**This is a traceability catalog, not an instruction to implement legacy mismatches literally.** `INTERNAL` routes represent **proposed internal commands**, normally mapped to gRPC rather than public HTTP; the method/transport still needs schema review. All public paths below are Draft Gateway routes. Names and existing runtime status must be audited first.

### personalization — 25 IDs (P0 · PHASES 2–5, IoT PHASES 1–4)

| Done | API ID | Transport/method | Proposed endpoint / internal command | Meaning / implementation note |
|---|---|---|---|---|
| [ ] | `PERSO-001` | `POST` | `/api/v1/orders/{orderId}/consents` | Accept versioned purpose/source/ring-scope Consent |
| [ ] | `PERSO-002` | `GET` | `/api/v1/orders/{orderId}/consents` | List authorized Order Consents |
| [ ] | `PERSO-003` | `POST` | `/api/v1/orders/{orderId}/consents/{consentId}/revoke` | Revoke Consent (operational dependency + retention) |
| [ ] | `PERSO-004` | `PUT` | `/api/v1/orders/{orderId}/source-plan` | Set SHARED / SEPARATE when valid |
| [ ] | `PERSO-005` | `POST` | `/api/v1/orders/{orderId}/fingerprint/capture-sessions` | Create store Fingerprint Capture Session |
| [ ] | `PERSO-006` | `GET` | `/api/v1/fingerprint/capture-sessions/{sessionId}` | Get Capture Session status |
| [ ] | `PERSO-007` | `POST` | `/api/v1/fingerprint/capture-sessions/{sessionId}/attempts` | Append AS608/ESP32 capture attempt |
| [ ] | `PERSO-008` | `POST` | `/api/v1/fingerprint/capture-sessions/{sessionId}/complete` | Finalize accepted capture / source |
| [ ] | `PERSO-009` | `POST` | `/api/v1/orders/{orderId}/soundwave/uploads/initiate` | Initialize protected audio upload / record ingestion |
| [ ] | `PERSO-010` | `POST` | `/api/v1/orders/{orderId}/soundwave/uploads/complete` | Complete protected audio upload |
| [ ] | `PERSO-011` | `GET` | `/api/v1/orders/{orderId}/personalization-sources` | List permitted sources |
| [ ] | `PERSO-012` | `GET` | `/api/v1/personalization-sources/{sourceId}/processing` | Get processing status |
| [ ] | `PERSO-013` | `INTERNAL (gRPC to design)` | `internal/personalization-sources/{sourceId}/process` | Trigger or retry source processing |
| [ ] | `PERSO-014` | `POST` | `/api/v1/orders/{orderId}/source-bindings` | Bind source to Ring Item(s) with scoped Consent |
| [ ] | `PERSO-015` | `GET` | `/api/v1/orders/{orderId}/items/{ringItemId}/placement` | Get current placement |
| [ ] | `PERSO-016` | `PUT` | `/api/v1/orders/{orderId}/items/{ringItemId}/placement` | Save canonical, validated placement |
| [ ] | `PERSO-017` | `POST` | `/api/v1/orders/{orderId}/items/{ringItemId}/placement/validate` | Validate 3D/engraving geometry |
| [ ] | `PERSO-018` | `POST` | `/api/v1/orders/{orderId}/items/{ringItemId}/customer-approvals` | Approve exact current preview/version |
| [ ] | `PERSO-019` | `POST` | `/api/v1/orders/{orderId}/items/{ringItemId}/submit-review` | Submit ready version for Manager review |
| [ ] | `PERSO-020` | `GET` | `/api/v1/admin/design/reviews` | Manager review queue |
| [ ] | `PERSO-021` | `GET` | `/api/v1/admin/design/reviews/{reviewId}` | Get review checklist and current version |
| [ ] | `PERSO-022` | `POST` | `/api/v1/admin/design/reviews/{reviewId}/decide` | Manager APPROVE or REQUEST_CHANGES |
| [ ] | `PERSO-023` | `POST` | `/api/v1/orders/{orderId}/items/{ringItemId}/change-requests` | Request controlled physical design change |
| [ ] | `PERSO-024` | `GET` | `/api/v1/admin/design/change-requests` | Manager change request queue |
| [ ] | `PERSO-025` | `POST` | `/api/v1/admin/design/change-requests/{changeRequestId}/decide` | Manager review physical change request |

### production — 28 IDs (P0 · PHASE 6)

| Done | API ID | Transport/method | Proposed endpoint / internal command | Meaning / implementation note |
|---|---|---|---|---|
| [ ] | `PRODU-001` | `GET` | `/api/v1/orders/{orderId}/production-lock` | Read safe Production Lock summary |
| [ ] | `PRODU-002` | `INTERNAL (gRPC to design)` | `internal/orders/{orderId}/production-locks` | Create immutable Order-level Design Lock |
| [ ] | `PRODU-003` | `INTERNAL (gRPC to design)` | `internal/production/packages` | Create lock-bound Production Package |
| [ ] | `PRODU-004` | `GET` | `/api/v1/admin/production/packages/{packageId}` | Manager read Production Package |
| [ ] | `PRODU-005` | `GET` | `/api/v1/admin/production/laser-profiles` | List calibrated Laser Profiles |
| [ ] | `PRODU-006` | `POST` | `/api/v1/admin/production/laser-profiles` | Create Laser Profile |
| [ ] | `PRODU-007` | `POST` | `/api/v1/admin/production/laser-profiles/{profileId}/approve` | Approve calibrated Laser Profile |
| [ ] | `PRODU-008` | `GET` | `/api/v1/admin/production/routes` | List template Production Routes |
| [ ] | `PRODU-009` | `POST` | `/api/v1/admin/production/routes` | Create Production Route / Work Instructions |
| [ ] | `PRODU-010` | `GET` | `/api/v1/admin/production/dashboard` | Manager production dashboard |
| [ ] | `PRODU-011` | `INTERNAL (gRPC to design)` | `internal/production/attempts` | Create Production Attempt |
| [ ] | `PRODU-012` | `POST` | `/api/v1/admin/production/work-orders` | Create Work Order per Item/Attempt |
| [ ] | `PRODU-013` | `GET` | `/api/v1/admin/production/work-orders` | Manager list Work Orders |
| [ ] | `PRODU-014` | `GET` | `/api/v1/production/work-orders/assigned` | Jeweler assigned Work Orders |
| [ ] | `PRODU-015` | `GET` | `/api/v1/production/work-orders/{workOrderId}` | Authorized Work Order detail |
| [ ] | `PRODU-016` | `POST` | `/api/v1/admin/production/work-orders/{workOrderId}/assignments` | Assign qualified Jeweler |
| [ ] | `PRODU-017` | `POST` | `/api/v1/production/work-orders/{workOrderId}/start` | Start Work Order |
| [ ] | `PRODU-018` | `POST` | `/api/v1/production/work-orders/{workOrderId}/steps/{stepId}/complete` | Record step completion and evidence |
| [ ] | `PRODU-019` | `POST` | `/api/v1/production/work-orders/{workOrderId}/complete` | Propose Work Order complete |
| [ ] | `PRODU-020` | `POST` | `/api/v1/production/work-orders/{workOrderId}/laser/authorize` | Authorize locked laser package execution |
| [ ] | `PRODU-021` | `POST` | `/api/v1/production/work-orders/{workOrderId}/laser/executions` | Log laser execution evidence |
| [ ] | `PRODU-022` | `GET` | `/api/v1/admin/production/qc/queue` | Manager Final QC queue |
| [ ] | `PRODU-023` | `POST` | `/api/v1/admin/production/attempts/{attemptId}/qc` | Manager Final QC PASS/FAIL |
| [ ] | `PRODU-024` | `POST` | `/api/v1/admin/production/qc/{qcResultId}/disposition` | Approve REWORK/REMAKE/SCRAP disposition |
| [ ] | `PRODU-025` | `POST` | `/api/v1/production/work-orders/{workOrderId}/exceptions` | Report production exception |
| [ ] | `PRODU-026` | `POST` | `/api/v1/admin/production/exceptions/{exceptionId}/resolve` | Manager resolve production exception |
| [ ] | `PRODU-027` | `GET` | `/api/v1/admin/production/jeweler-skills` | List qualified Jeweler skills |
| [ ] | `PRODU-028` | `PUT` | `/api/v1/admin/production/jeweler-skills/{jewelerId}` | Maintain Jeweler skill qualification |

### fulfillment — 14 IDs (P1 · PHASE 7)

| Done | API ID | Transport/method | Proposed endpoint / internal command | Meaning / implementation note |
|---|---|---|---|---|
| [ ] | `FULFI-001` | `POST` | `/api/v1/admin/fulfillment/handover-sessions` | Create Order-level handover session |
| [ ] | `FULFI-002` | `GET` | `/api/v1/fulfillment/handover-sessions/{sessionId}` | Read limited handover session |
| [ ] | `FULFI-003` | `POST` | `/api/v1/fulfillment/handover-sessions/{sessionId}/verify` | Verify single-use Recipient QR / fallback |
| [ ] | `FULFI-004` | `POST` | `/api/v1/fulfillment/handover-sessions/{sessionId}/complete` | Persist immutable full-Order handover proof |
| [ ] | `FULFI-005` | `GET` | `/api/v1/orders/{orderId}/handover` | Read Order handover status |
| [ ] | `FULFI-006` | `POST` | `/api/v1/admin/fulfillment/deliveries` | Create Order Delivery Task/Attempt |
| [ ] | `FULFI-007` | `GET` | `/api/v1/admin/fulfillment/deliveries` | Manager list deliveries |
| [ ] | `FULFI-008` | `POST` | `/api/v1/admin/fulfillment/deliveries/{deliveryId}/assign` | Assign Delivery Staff |
| [ ] | `FULFI-009` | `GET` | `/api/v1/fulfillment/deliveries/assigned` | Assigned delivery staff queue |
| [ ] | `FULFI-010` | `POST` | `/api/v1/fulfillment/deliveries/{deliveryId}/dispatch` | Record release/receive and dispatch gate |
| [ ] | `FULFI-011` | `POST` | `/api/v1/fulfillment/deliveries/{deliveryId}/recipient-verify` | Verify recipient at delivery |
| [ ] | `FULFI-012` | `POST` | `/api/v1/fulfillment/deliveries/{deliveryId}/complete` | Persist delivery proof |
| [ ] | `FULFI-013` | `POST` | `/api/v1/fulfillment/deliveries/{deliveryId}/failed` | Record delivery failure |
| [ ] | `FULFI-014` | `POST` | `/api/v1/admin/fulfillment/deliveries/{deliveryId}/redeliver` | Authorize second physical attempt |

### after_sales — 18 IDs (P1 · PHASE 8)

| Done | API ID | Transport/method | Proposed endpoint / internal command | Meaning / implementation note |
|---|---|---|---|---|
| [ ] | `AFTER-001` | `POST` | `/api/v1/claims` | Open one Ring Item physical claim (NO DATA_RIGHTS) |
| [ ] | `AFTER-002` | `GET` | `/api/v1/claims` | List authorized claimant claims |
| [ ] | `AFTER-003` | `GET` | `/api/v1/claims/{claimId}` | Read authorized Claim detail |
| [ ] | `AFTER-004` | `POST` | `/api/v1/claims/{claimId}/evidence` | Append Claim evidence |
| [ ] | `AFTER-005` | `GET` | `/api/v1/admin/claims` | Admin/Manager claim queue |
| [ ] | `AFTER-006` | `POST` | `/api/v1/admin/claims/{claimId}/intake` | Record physical intake |
| [ ] | `AFTER-007` | `POST` | `/api/v1/admin/claims/{claimId}/triage` | Triage warranty vs maintenance vs return |
| [ ] | `AFTER-008` | `POST` | `/api/v1/admin/claims/{claimId}/decisions` | Record Manager decision |
| [ ] | `AFTER-009` | `POST` | `/api/v1/admin/claims/{claimId}/custody-events` | Append immutable custody event |
| [ ] | `AFTER-010` | `INTERNAL (gRPC to design)` | `internal/claims/{claimId}/repair-start` | Start authorized Claim-linked Repair/Remake |
| [ ] | `AFTER-011` | `POST` | `/api/v1/admin/claims/{claimId}/qc` | Record independent after-sales Manager QC |
| [ ] | `AFTER-012` | `POST` | `/api/v1/admin/claims/{claimId}/close` | Close after obligations settled |
| [ ] | `AFTER-013` | `GET` | `/api/v1/admin/claims/{claimId}/timeline` | Read Claim audit timeline |
| [ ] | `AFTER-014` | `GET` | `/api/v1/claims/{claimId}/maintenance-eligibility` | Check Plan/Warranty service eligibility |
| [ ] | `AFTER-015` | `GET` | `/api/v1/admin/maintenance-plans` | List Maintenance Plan policies |
| [ ] | `AFTER-016` | `POST` | `/api/v1/admin/maintenance-plans` | Create Maintenance Plan policy |
| [ ] | `AFTER-017` | `POST` | `/api/v1/claims/data-rights` | LEGACY: MUST RELOCATE to Supporting Data Rights UC |
| [ ] | `AFTER-018` | `POST` | `/api/v1/admin/claims/{claimId}/data-rights/resolve` | LEGACY: MUST RELOCATE to Supporting Data Rights UC |

## APPENDIX B — Personalization first-phase API sequencing

| Stage | API IDs | What is demonstrable at stage exit |
|---|---|---|
| Consent/Scope | `PERSO-001..004` | Server denies source collection absent verified P1 + correct scoped Consent; authoritative SHARED/SEPARATE rules |
| IoT Capture | `PERSO-005..008` | Real device/bridge or explicit hardware blocker; attempts ≤3; accepted private source only |
| Processing | `PERSO-011..014` | Authorized source list, job status/trigger, source-to-item binding |
| Soundwave | `PERSO-009..010` | Upload/record ≤30s, exactly 3s selection, protected assets |
| Geometry | `PERSO-015..017` | FP bounded geometry, SW fixed geometry, template constraints |
| Approvals | `PERSO-018..025` | Customer version approval, Manager Review, controlled changes and immutable history |

**First runnable vertical slice before continuing:** protected Consent + P1 gate → Store Staff creates Capture Session → ESP32/AS608 produces a proven usable image → bounded attempts → accepted private Source → Python creates vector → source/asset `READY` → staff/customer can preview → approval policy enforced. If hardware fails Phase 1, run the whole flow with labeled **synthetic fixture/mocked device** only for code testing, and report production hardware as BLOCKED.

## Implementation Log (Claude fills this section only with verified facts)

| Date | Phase | Commit / branch | Evidence / commands | Status / blockers |
|---|---|---|---|---|
| 2026-11-13 | Planning | N/A | Source documents reconciled for planned implementation; no source-code verification by author | PLAN ONLY |
| 2026-11-13 | PHASE 0 (Personalization scope) | `dev` @ `eca28ed` | Repo, proto (`dev` + `origin/DuyPQ`), Operations schema/DDL, RBAC catalog and BM04 WF-01 read; results in `docs/plans/active/operations-personalization.md` | PARTIAL: 85-ID `operations-contract-matrix.md` not written; Commerce contracts, permission codes, actor-context convention, object storage and device trust undecided (D-P-01..16) |
