# MEMORA — Master Plan: Chuẩn hóa Kiến trúc Gateway 80 API Commerce Service (COMPLETED & VERIFIED)

> **Mục đích:** Tái cấu trúc toàn bộ 80 API của Commerce Service tại API Gateway từ kiến trúc phẳng (`Domain -> Layer`) sang kiến trúc chuẩn mực của MEMORA (`Domain -> Feature -> Layer`) như benchmark của `personalization` và `iam`.
>
> **Ràng buộc quan trọng:**
> 1. **Zero Route Breaking:** Giữ nguyên 100% URL REST Path, HTTP Method, Request Body/Query params và Response Envelope. Client & Frontend hoàn toàn không bị ảnh hưởng.
> 2. **Zero Backend Changes:** Không thay đổi bất kỳ code hay hợp đồng nào trong `apps/commerce-service` và proto.
> 3. **Phân kỳ an toàn (5 Phases):** Thực hiện lần lượt từng domain, chạy verification sau mỗi đợt.

---

## 1. Metadata & Plan Status

| Trường | Giá trị |
| --- | --- |
| Repository | `memora-backend` |
| Branch | `DuyPQ` |
| Scope | API Gateway (`apps/api-gateway/src/modules/`) |
| Target Modules | `design` (10), `pricing` (10), `inventory` (13), `catalog` (21), `ordering` (26) — Tổng cộng 80 APIs |
| Target Architecture | `Domain -> Feature -> Layer` (`controllers/`, `docs/`, `dto/`, `mappers/`) |
| Reference Benchmark | `apps/api-gateway/src/modules/personalization/` & `iam/` |
| Rule tuân thủ | `.agents/rules/10-gateway-conventions.md` & `AGENTS.md` |
| File Plan | `docs/plans/active/refactor-commerce-gateway-features.md` |
| Plan status | `COMPLETED & VERIFIED` — Toàn bộ 5 Đợt (80 APIs) Đã Hoàn Thành & Kiểm Thử Pass 100% |
| Date prepared | 2026-11-16 |

---

## 2. Kiến trúc Mục tiêu (Target Directory Architecture)

Mỗi Domain sẽ giữ lại shared `clients/<domain>-grpc.client.ts` và `<domain>.module.ts` đóng vai trò Composition Root, còn lại toàn bộ code được tổ chức theo Feature con:

```
apps/api-gateway/src/modules/<domain>/
├── <domain>.module.ts                         <-- Root Composition Module
├── clients/
│   └── <domain>-grpc.client.ts                <-- Shared Domain gRPC Client
└── <feature>/                                 <-- Từng Feature nghiệp vụ độc lập
    ├── controllers/
    │   └── <feature>.controller.ts
    ├── docs/
    │   └── <feature>.swagger.ts
    ├── dto/
    │   ├── <action>.request.dto.ts
    │   └── <action>.response.dto.ts
    └── mappers/
        └── <feature>-http.mapper.ts
```

---

## 3. Bản đồ Phân kỳ 5 Đợt Chuẩn hóa (Phase Breakdown)

### 📌 Đợt 1: Domain `design` (10 APIs) — [COMPLETED & VERIFIED]
- **Feature 1.1: `cart` (4 APIs):**
  - `GET /api/v1/cart` [DESIG-001]
  - `POST /api/v1/cart/items` [DESIG-002]
  - `PATCH /api/v1/cart/items/:itemId` [DESIG-003]
  - `DELETE /api/v1/cart/items/:itemId` [DESIG-004]
- **Feature 1.2: `drafts` (6 APIs):**
  - `POST /api/v1/design-drafts` [DESIG-005]
  - `GET /api/v1/design-drafts` [DESIG-006]
  - `GET /api/v1/design-drafts/:draftId` [DESIG-007]
  - `PATCH /api/v1/design-drafts/:draftId` [DESIG-008]
  - `POST /api/v1/design-drafts/:draftId/share` [DESIG-009]
  - `DELETE /api/v1/design-drafts/:draftId/share/:shareLinkId` [DESIG-010]

---

### 📌 Đợt 2: Domain `pricing` (10 APIs) — [COMPLETED & VERIFIED]
- **Feature 2.1: `estimates` (2 APIs):**
  - `POST /api/v1/pricing/estimate` [PRICI-001]
  - `POST /api/v1/pricing/quote` [PRICI-010]
- **Feature 2.2: `price-items` (5 APIs):**
  - `GET /api/v1/admin/pricing/items` [PRICI-002]
  - `POST /api/v1/admin/pricing/items` [PRICI-003]
  - `GET /api/v1/admin/pricing/versions` [PRICI-004]
  - `POST /api/v1/admin/pricing/versions` [PRICI-005]
  - `POST /api/v1/admin/pricing/versions/:versionId/publish` [PRICI-006]
- **Feature 2.3: `pricing-rules` (3 APIs):**
  - `GET /api/v1/admin/pricing/rules` [PRICI-007]
  - `POST /api/v1/admin/pricing/rules` [PRICI-008]
  - `PATCH /api/v1/admin/pricing/rules/:ruleId` [PRICI-009]

---

### 📌 Đợt 3: Domain `inventory` (13 APIs)
- **Feature 3.1: `ring-blanks` (2 APIs):**
  - `GET /api/v1/admin/inventory/ring-blanks` [INVEN-001]
  - `POST /api/v1/admin/inventory/ring-blanks/receipts` [INVEN-002]
- **Feature 3.2: `gemstones` (6 APIs):**
  - `GET /api/v1/admin/inventory/gemstone-batches` [INVEN-003]
  - `POST /api/v1/admin/inventory/gemstone-batches/receipts` [INVEN-004]
  - `POST /api/v1/admin/inventory/certified-gemstones` [INVEN-006]
  - `GET /api/v1/inventory/certified-gemstones/availability` [INVEN-007]
  - `POST /api/v1/admin/inventory/certified-gemstones/:gemstoneId/status` [INVEN-008]
  - `POST /api/v1/admin/inventory/certified-gemstones/:gemstoneId/reserve` [INVEN-009]
- **Feature 3.3: `allocations-movements` (5 APIs):**
  - `POST /api/v1/admin/inventory/allocations/release` [INVEN-005]
  - `POST /api/v1/admin/inventory/allocations/pre-allocate` [INVEN-010]
  - `POST /api/v1/admin/inventory/allocations/fulfill` [INVEN-011]
  - `GET /api/v1/admin/inventory/movements` [INVEN-012]
  - `POST /api/v1/admin/inventory/adjustments` [INVEN-013]

---

### 📌 Đợt 4: Domain `catalog` (21 APIs) — [COMPLETED & VERIFIED]
- **Feature 4.1: `browse` (9 APIs):**
  - `GET /api/v1/catalog/templates` [CATAL-001]
  - `GET /api/v1/catalog/templates/:templateId` [CATAL-002]
  - `GET /api/v1/catalog/templates/:templateId/configuration-options` [CATAL-003]
  - `GET /api/v1/catalog/templates/:templateId/3d-assets` [CATAL-004]
  - `GET /api/v1/catalog/materials` [CATAL-009]
  - `GET /api/v1/catalog/templates/:templateId/variants` [CATAL-012]
  - `GET /api/v1/catalog/gemstone-options` [CATAL-015]
  - `GET /api/v1/catalog/templates/:templateId/gemstone-slots` [CATAL-016]
  - `POST /api/v1/catalog/configurations/validate` [CATAL-021]
- **Feature 4.2: `templates-admin` (4 APIs):**
  - `POST /api/v1/admin/catalog/templates` [CATAL-005]
  - `PATCH /api/v1/admin/catalog/templates/:templateId` [CATAL-006]
  - `POST /api/v1/admin/catalog/templates/:templateId/publish` [CATAL-007]
  - `POST /api/v1/admin/catalog/templates/:templateId/archive` [CATAL-008]
- **Feature 4.3: `materials-admin` (8 APIs):**
  - `POST /api/v1/admin/catalog/materials` [CATAL-010]
  - `PATCH /api/v1/admin/catalog/materials/:materialId` [CATAL-011]
  - `POST /api/v1/admin/catalog/templates/:templateId/variants` [CATAL-013]
  - `PATCH /api/v1/admin/catalog/variants/:variantId` [CATAL-014]
  - `POST /api/v1/admin/catalog/gemstone-options` [CATAL-017]
  - `PATCH /api/v1/admin/catalog/gemstone-options/:gemstoneOptionId` [CATAL-018]
  - `GET /api/v1/catalog/resize-policies` [CATAL-019]
  - `PUT /api/v1/admin/catalog/resize-policies` [CATAL-020]

---

### 📌 Đợt 5: Domain `ordering` (26 APIs) — [COMPLETED & VERIFIED]
- **Feature 5.1: `checkout-orders` (5 APIs):**
  - `POST /api/v1/orders` [ORDER-001]
  - `GET /api/v1/orders` [ORDER-002]
  - `GET /api/v1/orders/:orderId` [ORDER-003]
  - `GET /api/v1/orders/:orderId/timeline` [ORDER-004]
  - `POST /api/v1/orders/:orderId/cancel` [ORDER-005]
- **Feature 5.2: `order-management` (10 APIs):**
  - `GET /api/v1/admin/orders` [ORDER-006]
  - `GET /api/v1/admin/orders/:orderId` [ORDER-ADMIN-01]
  - `PATCH /api/v1/admin/orders/:orderId/status` [ORDER-007]
  - `GET /api/v1/admin/orders/:orderId/items/:ringItemId/versions` [ORDER-008]
  - `PATCH /api/v1/admin/orders/:orderId/items/:ringItemId/versions/current` [ORDER-009]
  - `GET /api/v1/admin/orders/:orderId/quotes` [ORDER-010]
  - `POST /api/v1/admin/orders/:orderId/final-quotes` [ORDER-011]
  - `PATCH /api/v1/admin/orders/:orderId/final-quotes/:quoteId` [ORDER-012]
  - `POST /api/v1/admin/orders/:orderId/final-quotes/:quoteId/publish` [ORDER-013]
  - `GET /api/v1/admin/orders/:orderId/final-confirmations` [ORDER-014]
- **Feature 5.3: `quotes` (2 APIs):**
  - `POST /api/v1/orders/:orderId/final-quotes/:quoteId/confirm` [ORDER-015]
  - `POST /api/v1/orders/:orderId/final-quotes/:quoteId/reject` [ORDER-QUOTE-REJECT]
- **Feature 5.4: `payments` (6 APIs):**
  - `POST /api/v1/orders/:orderId/payment-link` [ORDER-016]
  - `POST /api/v1/orders/payments/webhook` [ORDER-019]
  - `POST /api/v1/admin/payments/:transactionId/reconcile` [ORDER-020]
  - `GET /api/v1/orders/:orderId/payments` [ORDER-021]
  - `GET /api/v1/orders/:orderId/payments/:transactionId` [ORDER-022]
  - `POST /api/v1/admin/payments/:transactionId/refund-requests` [ORDER-023]
- **Feature 5.5: `receipts-invoices` (2 APIs):**
  - `GET /api/v1/orders/:orderId/payments/:transactionId/receipt` [ORDER-RECEIPT]
  - `GET /api/v1/orders/:orderId/invoice` [ORDER-INVOICE]
- **Feature 5.6: `claims` (3 APIs):**
  - `GET /api/v1/claims/:claimId/quotes` [ORDER-024]
  - `POST /api/v1/claims/:claimId/quotes/:quoteId/accept` [ORDER-025]
  - `POST /api/v1/claims/:claimId/payment-link` [ORDER-026]

---

## 4. Tiêu chuẩn Kỹ thuật khi Tách File
Mỗi Feature con sau khi tách bắt buộc tuân thủ:
1. **DTO:** Chia thành từng file riêng theo tên hành động `<action>.<request/response>.dto.ts`, không dồn chung 1 file lớn.
2. **Swagger Docs:** Đặt trong `docs/<feature>.swagger.ts`, sử dụng `ApiSuccessResponse` và `ApiBearerAuth('bearer')`.
3. **Mappers:** Đặt trong `mappers/<feature>-http.mapper.ts`, đóng gói toàn bộ logic mapping từ gRPC message sang DTO response.
4. **Controllers:** Gọn nhẹ, mỏng (thin controller), chỉ gọi gRPC client qua mapper và return `toPaginatedSuccessResponse` hoặc DTO.

---

## 5. Quy trình Kiểm thử & Verification Gate (Sau mỗi Đợt)
1. `npm run typecheck`: 0 lỗi compile TypeScript strict.
2. `npm run boundaries`: 0 vi phạm ranh giới kiến trúc NestJS monorepo.
3. `npx nest build api-gateway`: Webpack compile thành công.
4. Kiểm tra Swagger UI tại `http://localhost:3001/api/docs` bảo đảm đủ endpoint và đúng `@ApiTags`.
