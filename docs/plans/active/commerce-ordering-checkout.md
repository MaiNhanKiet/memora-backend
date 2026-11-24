# MEMORA — Commerce Order Creation & Tracking API Plan (APPROVED)

> **Mục đích:** Kế hoạch chi tiết triển khai nhóm 5 API cốt lõi về **Tạo & Theo dõi Đơn hàng (Order Creation & Tracking)** thuộc bước **MF01-S04 & S05** (`commerce-service`, schema `ordering`) trên nhánh `DuyPQ` theo `.cursor/skills/plan-api`, `implement-api`.
>
> **Trạng thái:** `APPROVED` — Đã được phê duyệt bởi chủ dự án.

---

## 1. Metadata & Approval Record

| Trường | Giá trị |
| --- | --- |
| Repository | `memora-backend` |
| Branch | `DuyPQ` |
| Domain / feature | `ordering` / `commerce-order-creation` |
| HTTP owner | `apps/api-gateway` (`src/modules/ordering/`) |
| Business / DB owner | `apps/commerce-service` (PostgreSQL schema `ordering`, `design`, `pricing`, `catalog`) |
| File path trong repo | `docs/plans/active/commerce-ordering-checkout.md` |
| Plan status | `APPROVED` |
| Approval decision | Đã duyệt triển khai theo phương án A (5 core APIs, pre-P1 acknowledgement, dual initial status) |
| Approved API IDs | `ORDER-001`, `ORDER-002`, `ORDER-003`, `ORDER-004`, `ORDER-007` |
| Excluded / Deferred | `ORDER-005` (Hủy đơn), `ORDER-006` (Admin Orders), `ORDER-008..009` (Ring Item Versions), `ORDER-010..015` (Quotes & Confirmations - MF02), `ORDER-016..021` (PayOS Payments & Webhooks - MF01-S06 / MF02) |
| Date prepared | 2026-11-14 |
| Author | Antigravity AI |

### Invariants cam kết theo kiến trúc MEMORA & BM04

1. **Ranh giới Gateway vs Service:** Gateway chỉ nhận HTTP request, trích xuất danh tính Actor (`userId` từ JWT hoặc `guestSessionId`), validate DTOs, Swagger decorators, và mapping gRPC. `commerce-service` sở hữu toàn bộ logic nghiệp vụ, quản lý giao dịch DB tạo Đơn hàng, sinh Ring Items (kèm Version V1), snapshot Provisional Quote, chuyển trạng thái Draft sang `CONVERTED`. Tuyệt đối không import hay query Prisma từ Gateway.
2. **Quy tắc chuyển trạng thái Draft (MF01-BR06 / C06/C07):**
   - Mỗi Order chọn đúng **1–2 Drafts** từ giỏ hàng.
   - **Chỉ khi Create Order thành công (Commit Transaction)**: Những draft được chọn mới chuyển `IN_CART` $\rightarrow$ `CONVERTED` (`cart_id = NULL`), loại khỏi active Cart nhưng giữ lịch sử.
   - Các draft khác không được chọn trong giỏ vẫn giữ nguyên `IN_CART` (hỗ trợ partial checkout).
   - Nếu Create Order thất bại, toàn bộ transaction bị rollback, không chuyển trạng thái bất kỳ draft nào.
3. **Phân nhánh trạng thái khởi tạo (`orders.status` - MF01-BR12 / BM04):**
   - Đơn có bất kỳ nhẫn `FINGERPRINT` hoặc `SOUNDWAVE`: Khởi tạo ở trạng thái **`AWAITING_P1`** (bắt buộc cọc 30% trước khi thu thập nguồn cá nhân hóa).
   - Đơn `All-NONE` (toàn bộ nhẫn trơn/đá tiêu chuẩn, không có FP/SW): Khởi tạo ở trạng thái **`PENDING_FINAL_QUOTE`** (miễn cọc P1, đi thẳng tới bước thẩm định báo giá cuối).
4. **Bằng chứng thông báo trước P1 (Pre-P1 Evidence - MF01-BR13):**
   - Với đơn có FP/SW, payload bắt buộc có xác nhận `privacyNoticeAcknowledged: true` và `p1NonrefundAcknowledged: true` (khách hiểu việc từ chối ký Consent sau cọc không tự động làm phát sinh quyền hoàn tiền cọc P1).
   - Lưu trữ version, thời điểm xác nhận vào `orders.pre_p1_evidence_json`.
5. **Quyết định D32 (Microservice Boundary):** Không tạo Foreign Key vật lý sang IAM (`owner_customer_identity_id` là UUID logical reference).

---

## 2. API Inventory

| API ID | Method | Endpoint | Mục đích | Auth / Identity | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| **ORDER-001** | `POST` | `/api/v1/orders` | Create Order từ 1–2 selected drafts, sinh Ring Items, Version V1, Provisional Quote, convert drafts | JWT (Customer) **HOẶC** Verified Guest All-NONE | `APPROVED` |
| **ORDER-002** | `GET` | `/api/v1/orders` | Danh sách orders do actor sở hữu | Owner (User hoặc Guest) | `APPROVED` |
| **ORDER-003** | `GET` | `/api/v1/orders/{orderId}` | Chi tiết / Tracking đơn hàng | Owner (User hoặc Guest) | `APPROVED` |
| **ORDER-004** | `GET` | `/api/v1/orders/{orderId}/timeline` | Lấy lịch sử và timeline trạng thái đơn hàng | Owner (User hoặc Guest) | `APPROVED` |
| **ORDER-007** | `GET` | `/api/v1/orders/{orderId}/items/{ringItemId}` | Lấy chi tiết Ring Item và cấu hình thiết kế trong đơn | Owner (User hoặc Guest) | `APPROVED` |

---

## 3. Approval Decisions — D1 đến D5 cho Order Creation

| ID | Quyết định | Trạng thái |
| --- | --- | --- |
| **D1** | **Ràng buộc số lượng chiếc nhẫn (1–2 Ring Items):** Payload `POST /api/v1/orders` chỉ chấp nhận mảng `selectedDraftIds` có độ dài từ 1 đến 2 phần tử. | `APPROVED` |
| **D2** | **Xác định Source Plan Mode:** Nếu cả 2 nhẫn cùng `FINGERPRINT` hoặc cùng `SOUNDWAVE` $\rightarrow$ cho phép chọn `SHARED` hoặc `SEPARATE`. Trường hợp khác (1 nhẫn, hoặc NONE + FP/SW, hoặc 2 nhẫn NONE) $\rightarrow$ tự động là `N/A`. | `APPROVED` |
| **D3** | **Sinh Provisional Quote tự động:** Hệ thống tạo 1 bản ghi `quotes.quotes` (`quote_type = 'PROVISIONAL'`, `status = 'ISSUED'`) kèm `quote_items` bóc tách từng Ring Item theo giá snapshot từ Pricing Service. | `APPROVED` |
| **D4** | **Snapshot Ring Item Version V1:** Mỗi draft chuyển thành 1 `ring_items` và sinh 1 `ring_item_versions` có `version_no = 1`, `status = 'DRAFT'`. Gắn đá vào `ring_item_version_gemstones`. Snapshot này hoàn toàn độc lập với Draft gốc. | `APPROVED` |
| **D5** | **Khách vãng lai (Guest Order):** Chỉ cho phép Guest tạo đơn khi toàn bộ nhẫn là `NONE` (All-NONE) và phải cung cấp `guestEmail`, `guestPhone`. Đơn có FP/SW bắt buộc phải đăng nhập tài khoản Customer. | `APPROVED` |

---

## 4. API Contracts Chi tiết

### [ORDER-001] POST /api/v1/orders
- **Headers:** `Authorization: Bearer <token>` **HOẶC** `x-guest-session-id: <uuid>`
- **Request Body:**
  ```json
  {
    "selectedDraftIds": ["d1a2b3c4-draft-uuid"],
    "fulfillmentMode": "DELIVERY",
    "recipientName": "Nguyen Van A",
    "recipientPhone": "0901234567",
    "recipientEmail": "vana@example.com",
    "deliveryAddress": {
      "street": "123 Le Loi",
      "ward": "Ben Nghe",
      "district": "Quan 1",
      "city": "TP Ho Chi Minh"
    },
    "sourcePlanMode": "N/A",
    "preP1Acknowledgement": {
      "noticeVersion": "v1.0",
      "privacyNoticeAcknowledged": true,
      "p1NonrefundAcknowledged": true
    }
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "statusCode": 201,
    "message": "Order created successfully",
    "data": {
      "orderId": "o1a2b3c4-order-uuid",
      "orderNo": "ORD-20261114-A1B2",
      "status": "AWAITING_P1",
      "sourcePlanMode": "N/A",
      "itemsCount": 1,
      "totalAmount": 15500000.00,
      "depositAmount": 4650000.00,
      "currency": "VND",
      "createdAt": "2026-11-14T04:00:00.000Z"
    }
  }
  ```

---

### [ORDER-002] GET /api/v1/orders
- **Query Params:** `page`, `limit`, `status`
- **Success Response (200 OK):**
  Danh sách các đơn hàng thuộc quyền sở hữu của Customer / Guest kèm phân trang.

---

### [ORDER-003] GET /api/v1/orders/{orderId}
- **Path Params:** `orderId` (UUID)
- **Success Response (200 OK):**
  Chi tiết đơn hàng: trạng thái hiện tại, thông tin người nhận, quote tạm tính, danh sách Ring Items.

---

### [ORDER-004] GET /api/v1/orders/{orderId}/timeline
- **Path Params:** `orderId` (UUID)
- **Success Response (200 OK):**
  Dòng thời gian các cột mốc của đơn hàng (Tạo đơn, Cọc P1, Thu thập nguồn, Xác nhận giá cuối, Đúc nhẫn, Giao hàng).

---

### [ORDER-007] GET /api/v1/orders/{orderId}/items/{ringItemId}
- **Path Params:** `orderId` (UUID), `ringItemId` (UUID)
- **Success Response (200 OK):**
  Thông tin kỹ thuật chi tiết của chiếc nhẫn trong đơn: size, chất liệu, đá quý đính kèm, gói cá nhân hóa và version hiện hành.

---

## 5. Implementation Sequence

1. **Phase 1: Contracts & Protobuf**
   - Tạo file `proto/commerce/v1/ordering.proto` với service `OrderingService` (5 RPCs).
   - Tạo handwritten contract `libs/contracts/src/commerce/ordering.grpc.ts` và export qua `libs/contracts/src/index.ts`.
   - `npm run proto:check`.
2. **Phase 2: Commerce Service Core (`ordering`)**
   - Tạo `OrderingRepository` trong `apps/commerce-service/src/repositories/ordering.repository.ts` (quản lý transaction tạo `orders`, `ring_items`, `ring_item_versions`, `ring_item_version_gemstones`, `quotes`, `quote_items`, cập nhật `ring_design_drafts`).
   - Tạo `OrderingService` trong `apps/commerce-service/src/application/ordering/ordering.service.ts` (kiểm tra 1-2 items, phân nhánh `AWAITING_P1` vs `PENDING_FINAL_QUOTE`, validate pre-P1 notice).
   - Tạo `OrderingGrpcController` trong `apps/commerce-service/src/presentation/grpc/ordering.grpc.controller.ts`.
   - Đăng ký `OrderingModule` và cập nhật `COMMERCE_GRPC_PROTOS`.
3. **Phase 3: API Gateway Layer (`ordering`)**
   - Tạo module `apps/api-gateway/src/modules/ordering/` (khớp domain `ordering`).
   - Tạo `OrderingGrpcClient`.
   - Tạo DTOs (`create-order.dto.ts`, etc.) và Swagger documentation.
   - Tạo `OrderingController` định tuyến `/api/v1/orders`.
   - Đăng ký `OrderingModule` vào Gateway `AppModule`.
4. **Phase 4: Tests & Verification**
   - Chạy `npm run proto:check`, `npm run boundaries`, `npm run typecheck`, `npm run lint:check`.
   - Chạy unit tests cho `OrderingService`.

---

## 6. Implementation Progress Log

| Date | Step / Item | Status | Evidence | Checked by |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Plan Created | `APPROVED` | `docs/plans/active/commerce-ordering-checkout.md` | Antigravity AI |
| 2026-11-14 | Plan Approved | `COMPLETED` | Phê duyệt bởi User theo Phương án A | User DuyPQ |
| 2026-11-14 | Phase 1 (Proto & Contracts) | `COMPLETED` | `proto/commerce/v1/ordering.proto`, `libs/contracts/src/commerce/ordering.grpc.ts` | Antigravity AI |
| 2026-11-14 | Phase 2 (Commerce Core) | `COMPLETED` | `OrderingRepository`, `OrderingService`, `OrderingGrpcController`, `OrderingModule` | Antigravity AI |
| 2026-11-14 | Phase 3 (Gateway HTTP) | `COMPLETED` | `OrdersController`, `OrderingGrpcClient`, DTOs, Swagger Docs | Antigravity AI |
| 2026-11-14 | Phase 4 (Verification & Tests) | `COMPLETED` | 8/8 unit tests pass, boundaries 0 findings, build ok | Antigravity AI |
