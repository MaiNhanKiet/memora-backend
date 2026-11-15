# Commerce RPC: GetOrderPersonalizationContext

- **Status:** PROPOSED (D-P-04, decided 2026-11-13). Commerce (Phạm Quốc Duy) confirms
  the open points below, then implements it.
- **Owner:** Commerce `OrderingService`. Add the RPC to the existing service in
  `proto/commerce/v1/ordering.proto` (branch `DuyPQ`). Do not create a second
  `OrderingService`.
- **Caller:** Operations service (Personalization). Not exposed through the Gateway.
- **Consumer code:** `apps/operations-service/src/modules/personalization/shared/order-context/`
  (`OrderPersonalizationContextPort`). Operations uses a fake until this RPC ships.

## Why

Personalization APIs (Consent, capture, Soundwave upload, binding) must check order
facts that live in `ordering.*` (Commerce). Operations must not query those tables, and
there are no cross-service foreign keys. Sources: MF01 §8.1, §8.3, §8.4; BM04 F-02.

| Operations needs to know | Rule |
|---|---|
| Order owner | Only the owner's customer identity may give Consent or upload audio |
| P1 paid | Any FP/SW item requires P1 (30%) before Consent and source collection (MF01 §8.4) |
| Source Plan | `N/A`/`SHARED`/`SEPARATE`; SHARED/SEPARATE only for same-type items (D-P-05: Commerce owns it) |
| Ring items, package, current version and status | Consent scope is 1–2 Ring Items; FP/SW versions go to `SUBMITTED`, NONE is `REVIEW_NOT_REQUIRED` (MF01 §8.3) |

## Proto (to add to `OrderingService`)

```proto
rpc GetOrderPersonalizationContext (GetOrderPersonalizationContextRequest)
    returns (GetOrderPersonalizationContextResponse);

message GetOrderPersonalizationContextRequest {
  string order_id = 1;
}

message PersonalizationRingItem {
  string ring_item_id = 1;
  int32 item_no = 2;
  string current_version_id = 3;        // empty when no version yet
  string personalization_package = 4;   // NONE | FINGERPRINT | SOUNDWAVE
  string version_status = 5;            // status of the current version
}

message GetOrderPersonalizationContextResponse {
  string order_id = 1;
  string owner_customer_identity_id = 2;
  string status = 3;                    // order status
  bool p1_paid = 4;
  string source_plan_mode = 5;          // N/A | SHARED | SEPARATE
  repeated PersonalizationRingItem ring_items = 6;  // ordered by item_no
}
```

Mirror the types in `libs/contracts/src/commerce/ordering.grpc.ts`.

## Semantics

- Service-to-service call. **No `VerifiedActor`**: Operations already received the
  actor from the Gateway and compares `owner_customer_identity_id` itself.
- Guarded by `CommerceInternalGrpcAuthGuard`. Operations needs `COMMERCE_GRPC_URL` and
  `COMMERCE_INTERNAL_GRPC_SECRET` in its env (added with the adapter).
- Read-only. No side effects, no status change.
- `p1_paid` is computed by Commerce: true only when a P1 payment for the order has
  `ordering.payment_transactions.status = 'SUCCEEDED'` (not refunded/reversed).
  Operations does not read payments.
- `current_version_id`, `personalization_package`, `version_status` come from
  `ordering.ring_items.current_version_id` → `ordering.ring_item_versions`.

| Case | gRPC status |
|---|---|
| `order_id` missing or not a UUID | `INVALID_ARGUMENT` |
| Order not found | `NOT_FOUND` |
| Missing or wrong internal secret | `UNAUTHENTICATED` |
| DB failure | `INTERNAL` (safe message) |

Operations maps `NOT_FOUND` to "order not found" and treats any other failure as
unavailable (fail closed: no Consent, no capture).

## Open points for Commerce to confirm

1. **P1 marker:** the value of `ordering.payment_transactions.payment_stage` for P1
   (DDL has no CHECK). Proposed: `P1`.
2. **Order status enum** (no CHECK in DDL). MF02 §5.2 / MF01 §7.2: FP/SW
   `AWAITING_P1 → DESIGN_IN_PROGRESS → AWAITING_FINAL_CONFIRMATION → AWAITING_P2 → …`,
   All-NONE uses `PENDING_FINAL_QUOTE` (not `AWAITING_FINAL_QUOTE`), plus `EXPIRED_UNPAID`.
3. **Version status enum** (no CHECK; default `DRAFT`): `DRAFT`, `READY_FOR_REVIEW`,
   `SUBMITTED`, `MANAGER_APPROVED`, `REQUEST_CHANGES`, `REVIEW_NOT_REQUIRED`?
4. **Version transitions** owned by Commerce that Personalization will need later
   (`READY_FOR_REVIEW`, `SUBMITTED`, new version for change requests). Separate RPCs,
   not part of this one.
