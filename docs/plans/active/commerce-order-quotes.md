# MEMORA — Commerce Order Quotes & Customer Confirmations API Plan

> **Mục đích:** Kế hoạch chi tiết triển khai nhóm API **Customer Cancel & Final Quotes (`ORDER-005`, `ORDER-011..015`)** thuộc bước **MF02 (Review & Final Quote)** và **MF03 (Customer Final Confirmation)** (`commerce-service`, PostgreSQL schema `ordering`, `inventory`, `catalog`) trên nhánh `DuyPQ` theo `.agents/rules/13-business-service-structure.md`, `05-techlead-code-style.md`, `22-iam-auth-security.md` và skill `plan-api`.
>
> **Trạng thái:** `APPROVED` — Đã được Chủ dự án / Tech Lead phê duyệt.

---

## 1. Metadata & Approval Record

| Trường thông tin | Giá trị quy định |
| :--- | :--- |
| **Repository** | `memora-backend` |
| **Branch** | `DuyPQ` |
| **Domain / Feature** | `ordering` / `commerce-order-quotes` |
| **HTTP Owner** | `apps/api-gateway` (`src/modules/ordering/`) |
| **Business / DB Owner** | `apps/commerce-service` (PostgreSQL schemas `ordering`, `inventory`) |
| **File Plan Path** | `docs/plans/active/commerce-order-quotes.md` |
| **Plan Status** | `APPROVED` |
| **Commit Rule (Bắt buộc)** | **TUYỆT ĐỐI KHÔNG TỰ COMMIT**: Giữ nguyên working tree để người dùng tự kiểm tra và commit |
| **Approved API IDs** | `ORDER-005`, `ORDER-011`, `ORDER-012`, `ORDER-013`, `ORDER-014`, `ORDER-015` |
| **Excluded / Deferred** | `ORDER-016..021` (Thanh toán PayOS Milestone P2/P3 & Webhooks — thuộc nhóm Payment tiếp theo) |
| **Ngày lập kế hoạch** | 2026-11-15 |
| **Tác giả** | Antigravity AI Assistant |

---

## 2. Invariants & Kiến trúc cốt lõi

1. **Ranh giới Gateway vs Service (Layered Architecture):**
   - **API Gateway**: Chỉ tiếp nhận HTTP REST, xác thực Token JWT / Guest session, trích xuất danh tính Actor qua `toVerifiedActor(principal)`, validate DTO qua `class-validator`, tài liệu hóa Swagger độc lập trong `docs/`, chuyển tiếp sang `OrderingGrpcClient`. Tuyệt đối không import hoặc query Prisma trực tiếp từ Gateway.
   - **Commerce Service**: Sở hữu toàn bộ logic nghiệp vụ, quản lý vòng đời trạng thái Đơn hàng, tính toán báo giá cuối, kiểm soát transaction cơ sở dữ liệu (`orders`, `quotes`, `quote_items`, `final_confirmations`, `final_confirmation_items`, `allocations`).
2. **Hợp đồng danh tính Actor (VerifiedActor Contract — D-P-03):**
   - Gateway tạo actor: `toVerifiedActor(principal)` (`apps/api-gateway/src/common/grpc/verified-actor.ts`).
   - Commerce Service phân tích: `parseVerifiedActor(request.actor)` (`@app/common`), sau đó thu hẹp bằng `requireUserActor` hoặc kiểm tra quyền sở hữu order theo `actor.userId` / `actor.guestSessionId`.
3. **Quy tắc Hủy đơn tiền sản xuất (ORDER-005):**
   - Chỉ cho phép khách hàng hủy đơn khi đơn ở một trong các trạng thái tiền sản xuất: `AWAITING_P1`, `PENDING_FINAL_QUOTE`, `AWAITING_CUSTOMER_CONFIRMATION`.
   - Khi hủy đơn: Đơn hàng chuyển sang `CANCELLED`, ghi nhận thời gian `cancelled_at` và lý do hủy `cancellation_reason`. Toàn bộ `allocations` (phôi/đá) đang ở trạng thái `HOLD` hoặc `RESERVED` của các ring items trong đơn tự động được giải phóng về `RELEASED`.
4. **Quy trình Báo giá cuối (Final Quote Lifecycle — ORDER-011..013):**
   - Nhân viên lập báo giá cuối khi đơn ở trạng thái `PENDING_FINAL_QUOTE` (sau khi hoàn tất rà soát thông số kỹ thuật thực tế).
   - Quote mới được tạo với `quote_type = 'FINAL'`, `status = 'DRAFT'`, tự động tính `version_no` tăng dần (F1, F2...).
   - Chỉ khi quote ở `DRAFT`, nhân viên mới được phép chỉnh sửa qua `PATCH`.
   - Khi nhân viên bấm `publish`: quote chuyển sang `ISSUED`, gán `issued_at = now()`, `valid_until = now() + 7 days`. Đơn hàng chuyển sang `AWAITING_CUSTOMER_CONFIRMATION` và trỏ `current_quote_id = quote.id`.
5. **Quy trình Khách hàng chốt Báo giá & Chốt Thiết kế (ORDER-014..015):**
   - Khi khách hàng xác nhận (`confirm`): Quote chuyển sang `ACCEPTED`. Hệ thống tạo bản ghi bất biến trong `final_confirmations` và khóa cứng snapshot version của từng chiếc nhẫn trong `final_confirmation_items`.
   - Phân nhánh trạng thái Đơn hàng sau khi chốt:
     - **Đơn cá nhân hóa (FP/SW)**: Chuyển sang `AWAITING_P2` (sẵn sàng tạo link cọc đợt 2 40% trước khi đưa vào sản xuất xưởng).
     - **Đơn All-NONE**: Chuyển thẳng sang `PRODUCTION_AUTHORIZED` (không cần cọc P2).
   - Nếu khách hàng từ chối (`reject`): Quote chuyển sang `REJECTED`, đơn hàng quay về `PENDING_FINAL_QUOTE` kèm lý do từ chối để nhân viên điều chỉnh lại báo giá.

---

## 3. API Inventory Chi tiết

| API ID | Method | Endpoint | Actor / Quyền | Mục đích nghiệp vụ | Database Tables | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ORDER-005** | `POST` | `/api/v1/orders/:orderId/cancel-requests`<br>*(alias: `/cancel`)* | Customer (`toVerifiedActor`) | Khách hàng yêu cầu hủy đơn hàng trước sản xuất; giải phóng allocations phôi/đá | `orders`, `allocations` | `AWAITING_APPROVAL` |
| **ORDER-011** | `POST` | `/api/v1/admin/orders/:orderId/quotes` | Staff / Manager (`@Roles(...)`) | Nhân viên tạo bản thảo Báo giá cuối (`FINAL` / `DRAFT`) kèm danh sách chi phí bóc tách | `quotes`, `quote_items` | `AWAITING_APPROVAL` |
| **ORDER-012** | `PATCH` | `/api/v1/admin/orders/:orderId/quotes/:quoteId` | Staff / Manager (`@Roles(...)`) | Điều chỉnh giá trị, phụ thu, giảm giá, valid date hoặc các line items của quote DRAFT | `quotes`, `quote_items` | `AWAITING_APPROVAL` |
| **ORDER-013** | `POST`<br>`GET` | `/api/v1/admin/orders/:orderId/quotes/:quoteId/publish`<br>`/api/v1/orders/:orderId/quotes/:quoteId` | Staff (`publish`)<br>Customer / Staff (`get`) | **Publish**: Phát hành quote sang `ISSUED`, chuyển đơn sang `AWAITING_CUSTOMER_CONFIRMATION`<br>**Detail**: Xem chi tiết báo giá và các dòng chi phí | `quotes`, `quote_items`, `orders` | `AWAITING_APPROVAL` |
| **ORDER-014** | `POST` | `/api/v1/orders/:orderId/final-confirmations`<br>*(alias: `/quotes/confirm`)* | Customer (`toVerifiedActor`) | Khách hàng chốt báo giá cuối và khóa cứng các ring item versions; chuyển đơn sang `AWAITING_P2` (hoặc `PRODUCTION_AUTHORIZED`) | `final_confirmations`, `final_confirmation_items`, `quotes`, `orders` | `AWAITING_APPROVAL` |
| **ORDER-015** | `GET`<br>`POST` | `/api/v1/orders/:orderId/final-confirmations`<br>`/api/v1/orders/:orderId/quotes/reject` | Customer / Staff (`get`)<br>Customer (`reject`) | **Get**: Lấy lịch sử xác nhận báo giá & version chốt<br>**Reject**: Khách hàng từ chối báo giá, đưa đơn về `PENDING_FINAL_QUOTE` | `final_confirmations`, `quotes`, `orders` | `AWAITING_APPROVAL` |

---

## 4. Quyết định Kỹ thuật (Technical Decisions — D1 đến D6)

| ID | Vấn đề | Quyết định kỹ thuật |
| :--- | :--- | :--- |
| **D1** | **Điều kiện hủy đơn của khách (ORDER-005)** | Chỉ cho phép hủy khi `orders.status` $\in$ `['AWAITING_P1', 'PENDING_FINAL_QUOTE', 'AWAITING_CUSTOMER_CONFIRMATION']`. Nếu đơn đã ở `IN_PRODUCTION`, `COMPLETED` hoặc `CANCELLED`, ném lỗi `BadRequestException`. |
| **D2** | **Quản lý phiên bản Báo giá cuối (ORDER-011)** | Mỗi lần tạo báo giá cuối cho đơn, hệ thống tự động tìm max `version_no` của quote `FINAL` thuộc `order_id` đó và tăng lên 1 (F1, F2...). Mã `quote_no` có định dạng `QUO-<order_no>-F<version_no>`. |
| **D3** | **Bảo vệ tính toàn vẹn của Báo giá (ORDER-012)** | Chỉ cho phép sửa khi quote ở trạng thái `DRAFT`. Nếu quote đã `ISSUED` hoặc `ACCEPTED`, không được sửa đè mà nhân viên phải tạo một phiên bản Final Quote mới. |
| **D4** | **Thời hạn hiệu lực của Báo giá (ORDER-013)** | Khi bấm Publish, nếu trường `valid_until` chưa được đặt, hệ thống tự động gán hạn hiệu lực là `now() + 7 ngày`. Quá hạn này, quote không thể được confirm. |
| **D5** | **Khóa cứng Version nhẫn tại thời điểm xác nhận (ORDER-014)** | Bảng `final_confirmations` lưu snapshot quan hệ bất biến (`order_id`, `quote_id`, `confirmed_by_customer_identity_id`, `confirmed_at`). Bảng con `final_confirmation_items` lưu danh sách cặp (`ring_item_id`, `ring_item_version_id`), đảm bảo xưởng gia công đúng version đã chốt. |
| **D6** | **Chuyển tiếp trạng thái đơn sau khi xác nhận (ORDER-014)** | Đơn cá nhân hóa (có FP hoặc SW) chuyển sang `AWAITING_P2` (sẵn sàng chờ khách đóng cọc đợt 2 40% trước khi gia công). Đơn All-NONE chuyển thẳng sang `PRODUCTION_AUTHORIZED`. |

---

## 5. Đặc tả Contracts & Payload Chi tiết

### [ORDER-005] POST /api/v1/orders/:orderId/cancel-requests
- **Headers:** `Authorization: Bearer <customer_token>`
- **Request Body:**
  ```json
  {
    "reason": "Khách hàng muốn thay đổi thiết kế nhẫn hoàn toàn mới"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "orderId": "d1a2b3c4-e5f6-7f8a-9b0c-1d2e3f4a5b6c",
    "status": "CANCELLED",
    "cancelledAt": "2026-11-15T08:30:00.000Z",
    "cancellationReason": "Khách hàng muốn thay đổi thiết kế nhẫn hoàn toàn mới"
  }
  ```

---

### [ORDER-011] POST /api/v1/admin/orders/:orderId/quotes
- **Headers:** `Authorization: Bearer <staff_token>`
- **Request Body:**
  ```json
  {
    "subtotalAmount": 15000000,
    "deliveryAmount": 50000,
    "adjustmentAmount": -500000,
    "totalAmount": 14550000,
    "currency": "VND",
    "validUntil": "2026-11-22T23:59:59.000Z",
    "items": [
      {
        "ringItemId": "b1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
        "componentType": "GOLD_MATERIAL",
        "description": "Vàng trắng 18K trọng lượng thực tế 3.85g",
        "quantity": 1,
        "unitAmount": 8500000,
        "lineAmount": 8500000,
        "priceSourceType": "CATALOG_RULE"
      },
      {
        "ringItemId": "b1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
        "componentType": "CERTIFIED_GEMSTONE",
        "description": "Kim cương tự nhiên GIA 0.5ct F/VVS1",
        "quantity": 1,
        "unitAmount": 6500000,
        "lineAmount": 6500000,
        "priceSourceType": "INVENTORY_LOT"
      }
    ]
  }
  ```
- **Success Response (201 Created):** `FullQuoteDetail` với `status: "DRAFT"`, `versionNo: 1`.

---

### [ORDER-012] PATCH /api/v1/admin/orders/:orderId/quotes/:quoteId
- **Headers:** `Authorization: Bearer <staff_token>`
- **Request Body:** Cập nhật các trường `totalAmount`, `subtotalAmount`, `adjustmentAmount`, hoặc cập nhật lại danh sách `items`.
- **Success Response (200 OK):** `FullQuoteDetail` đã được cập nhật.

---

### [ORDER-013 Part A] POST /api/v1/admin/orders/:orderId/quotes/:quoteId/publish
- **Headers:** `Authorization: Bearer <staff_token>`
- **Success Response (200 OK):**
  `FullQuoteDetail` với `status: "ISSUED"`, `issuedAt: "2026-11-15T..."`, `validUntil: "2026-11-22T..."`.
  Đơn hàng cập nhật `status: "AWAITING_CUSTOMER_CONFIRMATION"`.

---

### [ORDER-013 Part B] GET /api/v1/orders/:orderId/quotes/:quoteId
- **Headers:** `Authorization: Bearer <token>`
- **Success Response (200 OK):** Chi tiết toàn diện của báo giá và danh sách chi phí chi tiết.

---

### [ORDER-014] POST /api/v1/orders/:orderId/final-confirmations
- **Headers:** `Authorization: Bearer <customer_token>`
- **Request Body:**
  ```json
  {
    "quoteId": "q1a2b3c4-e5f6-7f8a-9b0c-1d2e3f4a5b6c",
    "notes": "Đã đồng ý thông số kỹ thuật và báo giá cuối"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "confirmationId": "c1a2b3c4-e5f6-7f8a-9b0c-1d2e3f4a5b6c",
    "orderId": "d1a2b3c4-e5f6-7f8a-9b0c-1d2e3f4a5b6c",
    "quoteId": "q1a2b3c4-e5f6-7f8a-9b0c-1d2e3f4a5b6c",
    "status": "ACTIVE",
    "confirmedAt": "2026-11-15T09:00:00.000Z",
    "nextOrderStatus": "AWAITING_P2",
    "items": [
      {
        "id": "f1a2b3c4-e5f6-7f8a-9b0c-1d2e3f4a5b6c",
        "ringItemId": "b1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
        "ringItemVersionId": "v1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
        "versionNo": 2
      }
    ]
  }
  ```

---

### [ORDER-015 Part B] POST /api/v1/orders/:orderId/quotes/reject
- **Headers:** `Authorization: Bearer <customer_token>`
- **Request Body:**
  ```json
  {
    "quoteId": "q1a2b3c4-e5f6-7f8a-9b0c-1d2e3f4a5b6c",
    "reason": "Chi phí đá kiểm định vượt ngân sách, đề nghị đổi sang dòng đá Moissanite"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "orderId": "d1a2b3c4-e5f6-7f8a-9b0c-1d2e3f4a5b6c",
    "quoteId": "q1a2b3c4-e5f6-7f8a-9b0c-1d2e3f4a5b6c",
    "status": "REJECTED",
    "reason": "Chi phí đá kiểm định vượt ngân sách, đề nghị đổi sang dòng đá Moissanite",
    "updatedOrderStatus": "PENDING_FINAL_QUOTE"
  }
  ```

---

### [ORDER-015 Part A] GET /api/v1/orders/:orderId/final-confirmations
- **Headers:** `Authorization: Bearer <token>`
- **Success Response (200 OK):** Danh sách các bản ghi chốt báo giá và version của đơn hàng.

---

## 6. Danh sách File và Tiến độ Triển khai

| STT | File Path | Trách nhiệm kiến trúc |
| :--- | :--- | :--- |
| 1 | `docs/plans/active/commerce-order-quotes.md` | Tài liệu Plan chi tiết |
| 2 | `proto/commerce/v1/ordering.proto` | Khai báo 8 RPCs và schema Protobuf cho Cancel, Quote & Confirmation |
| 3 | `libs/contracts/src/commerce/ordering.grpc.ts` | Khai báo Handwritten TypeScript types, client & handler interfaces |
| 4 | `apps/commerce-service/src/repositories/ordering.repository.ts` | Encapsulate toàn bộ Prisma transactions cho quotes, confirmations, allocations |
| 5 | `apps/commerce-service/src/application/ordering/ordering.service.ts` | Domain service, kiểm tra actor bằng `parseVerifiedActor`, validate trạng thái |
| 6 | `apps/commerce-service/src/presentation/grpc/ordering.grpc.controller.ts` | Presentation thin controller kèm `@UseGuards(CommerceInternalGrpcAuthGuard)` |
| 7 | `apps/api-gateway/src/modules/ordering/clients/ordering-grpc.client.ts` | Gateway gRPC client gọi unary RPCs |
| 8 | `apps/api-gateway/src/modules/ordering/dto/ordering.dto.ts` | Request / Response DTOs với `@ApiProperty` & `class-validator` |
| 9 | [ordering.swagger.ts](file:///d:/BTFPT\DoAn\Source\memora-backend\apps\api-gateway\src\modules\ordering\docs\ordering.swagger.ts) | Tách biệt toàn bộ Swagger annotations độc lập |
| 10 | `apps/api-gateway/src/modules/ordering/controllers/orders.controller.ts` | Customer REST endpoints (`/cancel-requests`, `/quotes/:id`, `/final-confirmations`, `/reject`) |
| 11 | `apps/api-gateway/src/modules/ordering/controllers/admin-orders.controller.ts` | Staff / Manager REST endpoints (`POST /quotes`, `PATCH /quotes/:id`, `POST /publish`) |
| 12 | `apps/commerce-service/src/application/ordering/ordering.service.spec.ts` | Unit tests bao phủ 100% các ca thành công và biên lỗi cho 8 nghiệp vụ mới |

---

## 7. Tiêu chuẩn Kiểm thử & Xác minh (Verification Checklist)

- [x] **Proto Check:** `npm run proto:check` PASS 100%.
- [x] **TypeScript Typecheck:** `npm run typecheck` (tsc --noEmit) PASS không có bất kỳ lỗi nào.
- [x] **Architectural Boundaries Check:** `npm run boundaries` PASS (375 files, 0 finding).
- [x] **Service Unit Tests:** `npx jest apps/commerce-service/` PASS 104/104 tests (trong đó `ordering.service.spec.ts` đạt 41/41 tests).
- [ ] **Người dùng kiểm tra và tự thực hiện Git Commit:** Tuyệt đối không tự ý commit từ phía agent.
