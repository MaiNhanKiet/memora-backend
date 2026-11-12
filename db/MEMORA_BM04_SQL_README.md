# MEMORA — PostgreSQL DDL theo BM04 Review 2

**Nguồn chính:** MEMORA – DATABASE DOMAIN & TABLE TRACKER (bản xuất từ Google Sheets ngày 12/11/2026).

## Phạm vi

- 12 PostgreSQL schemas, 74 tables, 960 columns và 225 foreign keys.
- Mỗi bảng có `id UUID PRIMARY KEY`; cột `nullable`/`default` lấy từ `FIELDS`.
- FK lấy từ `RELATION_RULES`; những FK có chu trình được tạo bằng `ALTER TABLE` sau toàn bộ `CREATE TABLE`.
- Tạo các `CHECK` tường minh, `UNIQUE` một cột, unique kết hợp/partial index có thể biểu diễn an toàn.
- Đã thay hai CHECK Inventory nhắc `ring_blank_stock_id`/`gemstone_batch_id` bằng `stock_lot_id` theo baseline 4 bảng.
- `D15` (một PostgreSQL nhiều schema) vẫn là PROPOSED: đây là assumption để có bộ DDL liên schema chạy được.
- `D30` (phân bổ hoàn phí cấp Order) và `D31` (Certified Gemstone Slot) vẫn OPEN.

## Cách chạy (PostgreSQL 15+ trên database **trống**)

```bash
# Tạo database dev/staging riêng; KHÔNG chạy trực tiếp trên dữ liệu production.
createdb memora_bm04_dev
psql -X -v ON_ERROR_STOP=1 -d memora_bm04_dev -f MEMORA_BM04_PostgreSQL_74_tables.sql
psql -X -v ON_ERROR_STOP=1 -d memora_bm04_dev -f MEMORA_BM04_Verify_Schema.sql
```

**Lưu ý:** `BEGIN`/`COMMIT` được bao ngoài DDL. `CREATE EXTENSION` cần quyền tương ứng. File là **baseline đề xuất**, chưa phải migration/backfill cho database hiện có.

## Ràng buộc nghiệp vụ cần service/transaction xử lý

- All-NONE Orders: Final Quote/Confirmation + Certified Gemstone Reservation before Lock; NO P1/P2.
- FP/SW: Pre-P1 privacy acknowledgement, successful P1, then formal Consent before source collection; P2 net credit >=70% Final Total before Lock.
- Order count: exactly 1-2 Ring Items before authorization; cannot enforce via row CHECK.
- Certified Gemstone HOLD/RESERVE: transactionally lock individual stone/lot; unique active reservation and 15-minute HOLD expiry.
- Sale Delivery: at most 2 physical attempts; assignment decline/reassignment is not a physical attempt.
- Fulfillment: latest Manager QC PASS for every Ring Item, P3 SATISFIED and Final Invoice before immutable full-order handover; only then Order COMPLETED.
- Memory: only FP/SW opted-in Ring Item creates free Memory Card; activation after completed handover. PIN 5 failures => 15min lock.
- Return/Refund: Return Received with condition and evidence before payment refund; cannot exceed net attributable credit per Ring Item.
- Maintenance: 2 completed standard polishings per rolling/defined 12-month entitlement window; protect concurrent requests.
- Privacy Requests: verify ownership/consent, retention policy and completion across services; no raw protected data in audit.
- Do not rely solely on CHECK for immutable history, manager approval, proof verification, authorization or cross-service synchronization.

## Constraints trong Tracker chưa đủ là biểu thức SQL tường minh

Các ô ghi `CHECK` chung chung, “typed-scope CHECK” hoặc mô tả của Business Rule không được chuyển mù quáng thành constraint có thể sai. Các trường hợp này cần xác nhận giá trị/semantics trước khi bổ sung:

- `iam.users.auth_provider` — GENERIC CHECK description: CHECK
- `iam.users.status` — GENERIC CHECK description: CHECK
- `iam.customer_identities.is_primary_for_user` — GENERIC CHECK description: CHECK
- `iam.customer_identities.status` — GENERIC CHECK description: CHECK
- `catalog.ring_templates.stone_layout` — GENERIC CHECK description: CHECK
- `catalog.ring_templates.status` — GENERIC CHECK description: CHECK
- `catalog.materials.status` — GENERIC CHECK description: CHECK
- `catalog.template_variants.status` — GENERIC CHECK description: CHECK
- `catalog.gemstone_options.status` — GENERIC CHECK description: CHECK
- `catalog.gemstone_groups.selection_mode` — GENERIC CHECK description: CHECK
- `pricing.price_items.price_type` — GENERIC CHECK description: CHECK; partial UNIQUE indexes by price_type
- `pricing.price_items.personalization_package` — GENERIC CHECK description: CHECK; UNIQUE WHERE price_type='PERSONALIZATION'
- `pricing.price_items.status` — GENERIC CHECK description: CHECK
- `pricing.price_versions.status` — GENERIC CHECK description: CHECK; UNIQUE(price_item_id) WHERE status='ACTIVE'
- `pricing.price_versions.source_type` — GENERIC CHECK description: CHECK
- `pricing.pricing_rules.rule_type` — GENERIC CHECK description: CHECK; typed-scope CHECK
- `pricing.pricing_rules.resize_direction` — GENERIC CHECK description: CHECK
- `pricing.pricing_rules.cancellation_stage` — GENERIC CHECK description: CHECK; partial UNIQUE WHERE rule_type='CANCELLATION_FEE' AND status='ACTIVE'
- `pricing.pricing_rules.redelivery_reason` — GENERIC CHECK description: CHECK; partial UNIQUE WHERE rule_type='REDELIVERY_FEE' AND status='ACTIVE'
- `pricing.pricing_rules.status` — GENERIC CHECK description: CHECK; type-specific partial UNIQUE active scope
- `design.carts.status` — GENERIC CHECK description: CHECK
- `design.ring_design_drafts.personalization_package` — GENERIC CHECK description: CHECK
- `design.ring_design_drafts.status` — GENERIC CHECK description: CHECK
- `ordering.orders.status` — GENERIC CHECK description: CHECK
- `ordering.orders.source_plan_mode` — GENERIC CHECK description: CHECK
- `ordering.orders.fulfillment_mode` — GENERIC CHECK description: CHECK
- `ordering.ring_items.item_no` — GENERIC CHECK description: CHECK; UNIQUE(order_id, item_no)
- `ordering.ring_item_versions.personalization_package` — GENERIC CHECK description: CHECK
- `ordering.ring_item_versions.status` — GENERIC CHECK description: CHECK
- `ordering.quotes.quote_type` — GENERIC CHECK description: CHECK
- `ordering.quotes.version_no` — Non-executable UNIQUE description: CHECK (version_no >= 1); UNIQUE theo subject + quote_type + version_no
- `ordering.quotes.status` — GENERIC CHECK description: CHECK
- `ordering.quote_items.component_type` — GENERIC CHECK description: CHECK
- `ordering.quote_items.unit_amount` — GENERIC CHECK description: CHECK theo component_type
- `ordering.quote_items.line_amount` — GENERIC CHECK description: CHECK theo component_type
- `ordering.quote_items.price_source_type` — GENERIC CHECK description: CHECK; typed source constraint
- `ordering.final_confirmations.status` — GENERIC CHECK description: CHECK; UNIQUE(order_id) WHERE status='ACTIVE'
- `ordering.payment_transactions.payment_stage` — GENERIC CHECK description: CHECK
- `ordering.payment_transactions.transaction_type` — GENERIC CHECK description: CHECK
- `personalization.consents.status` — GENERIC CHECK description: CHECK
- `production.laser_process_profiles.personalization_type` — GENERIC CHECK description: CHECK
- `production.laser_process_profiles.status` — GENERIC CHECK description: CHECK
- `fulfillment.handover_records.handover_type` — GENERIC CHECK description: CHECK

## Số lượng theo domain

| Schema | Tables | Columns |
|---|---:|---:|
| `iam` | 6 | 52 |
| `catalog` | 7 | 76 |
| `pricing` | 3 | 43 |
| `design` | 3 | 31 |
| `ordering` | 10 | 133 |
| `inventory` | 4 | 50 |
| `personalization` | 9 | 99 |
| `production` | 13 | 184 |
| `fulfillment` | 3 | 63 |
| `memory` | 3 | 41 |
| `after_sales` | 4 | 64 |
| `platform` | 9 | 124 |
| **Total** | **74** | **960** |

## Đối chiếu

- `CREATE TABLE`: 74.
- `FOREIGN KEY`: 225.
- `CREATE UNIQUE INDEX`: 71.
- `CHECK`: 156.

Các nội dung này không thay thế phê duyệt schema thực thi, data migration hay test cạnh tranh (double-reservation, idempotency, refund).
