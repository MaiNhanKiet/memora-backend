# MEMORA — Commerce Cart & Ring Design Drafts API Plan (APPROVED)

> **Mục đích:** Kế hoạch chi tiết để triển khai nhóm 6 API cốt lõi về **Giỏ hàng & Bản nháp thiết kế nhẫn (Cart & Ring Design Drafts)** thuộc bước **MF01-S02 / S03** (`commerce-service`, schema `design`) trên nhánh `DuyPQ` theo `.cursor/skills/plan-api`, `implement-api`.
>
> **Trạng thái:** `APPROVED` — Chủ dự án đã phê duyệt ngày 2026-11-14.

---

## 1. Metadata & Approval Record

| Trường | Giá trị |
| --- | --- |
| Repository | `memora-backend` |
| Branch | `DuyPQ` |
| Domain / feature | `design` / `commerce-design-cart` |
| HTTP owner | `apps/api-gateway` (`src/modules/design/`) |
| Business / DB owner | `apps/commerce-service` (PostgreSQL schema `design`, `catalog`, `pricing`) |
| File path trong repo | `docs/plans/active/commerce-cart-design.md` |
| Plan status | `APPROVED` |
| Approval decision | `APPROVED` — D1–D6 và DESIG-001..006 |
| Approved API IDs | `DESIG-001`, `DESIG-002`, `DESIG-003`, `DESIG-004`, `DESIG-005`, `DESIG-006` |
| Excluded / Deferred | `DESIG-007..010` (Draft duplicate / Share link / Design codes theo D20 — lập plan riêng sau) |
| Date prepared | 2026-11-14 |
| Approver | Chủ dự án MEMORA |

### Invariants cam kết theo kiến trúc MEMORA

1. **Ranh giới Gateway vs Service:** Gateway chỉ phụ trách HTTP routing, trích xuất danh tính Actor (`userId` từ JWT hoặc `guestSessionId` từ header `x-guest-session-id`), DTO validation, Swagger decorators, và mapping gRPC. `commerce-service` sở hữu toàn bộ logic nghiệp vụ, quản lý trạng thái Cart, Ring Design Drafts và Prisma queries trên schema `design`. Tuyệt đối không import hay query Prisma từ Gateway.
2. **Quy tắc sở hữu Cart (BM04 Identity Invariant):**
   - Mỗi Cart thuộc sở hữu của đúng một định danh: `user_id XOR guest_session_id`.
   - Mỗi User hoặc Guest Session chỉ được có **tối đa 1 Cart ở trạng thái `ACTIVE`**.
   - Guest Cart bắt buộc có `expires_at` (mặc định 7 ngày kể từ khi tạo/cập nhật). Khi hết hạn, Cart chuyển `EXPIRED`.
3. **Trạng thái Cart (Quyết định BM04):**
   - Cart chỉ có trạng thái: `ACTIVE`, `ABANDONED`, `EXPIRED`.
   - **Không có trạng thái `CONVERTED` cho bảng `carts`**. Khi khách checkout tạo Order, chỉ có các bản nháp được chọn (`ring_design_drafts`) chuyển trạng thái từ `IN_CART` $\rightarrow$ `CONVERTED`. Cart vẫn giữ trạng thái `ACTIVE` cho các item chưa mua (hỗ trợ partial checkout).
4. **Tích hợp Pricing thời gian thực:**
   - Khi Add to Cart (`DESIG-002`) hoặc Sửa Draft (`DESIG-003`), `commerce-service` tự động gọi module `PricingService` nội bộ để tính chính xác `estimated_price`, lưu kèm snapshot `estimated_price_at` vào bản nháp.
5. **Quyết định D32 (Microservice Boundary):** Không tạo Foreign Key vật lý hay Prisma `@relation` chéo sang IAM / Operations / Experience. Chỉ lưu UUID scalar logical reference (`owner_user_id`, `guest_session_id`).

---

## 2. API Inventory

| API ID | Method | Endpoint | Mục đích | Auth / Identity | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| **DESIG-001** | `GET` | `/api/v1/cart` | Lấy chi tiết Cart hiện tại và danh sách ring design drafts bên trong | JWT (Customer) **HOẶC** `x-guest-session-id` | `PROPOSED` |
| **DESIG-002** | `POST` | `/api/v1/cart/items` | Thêm cấu hình nhẫn (đã validate qua Catalog) vào Cart | JWT (Customer) **HOẶC** `x-guest-session-id` | `PROPOSED` |
| **DESIG-003** | `PATCH` | `/api/v1/cart/items/{draftId}` | Cập nhật draft trong cart (target size, personalization, memory toggle) | Owner Cart (User hoặc Guest) | `PROPOSED` |
| **DESIG-004** | `DELETE` | `/api/v1/cart/items/{draftId}` | Xóa draft khỏi cart | Owner Cart (User hoặc Guest) | `PROPOSED` |
| **DESIG-005** | `POST` | `/api/v1/cart/validate-checkout` | Revalidate toàn bộ giỏ hoặc các draft được chọn trước khi Create Order | Owner Cart (User hoặc Guest) | `PROPOSED` |
| **DESIG-006** | `POST` | `/api/v1/cart/abandon` | Đánh dấu Cart là `ABANDONED` | Owner Cart (User hoặc Guest) | `PROPOSED` |

---

## 3. Approval Decisions — D1 đến D6 cho Cart & Design Drafts

| ID | Quyết định | Trạng thái |
| --- | --- | --- |
| **D1** | **Xác thực kép (Dual-Identity Support):** Gateway hỗ trợ cả khách đã đăng nhập (đọc `user.id` từ Bearer JWT qua `@CurrentUser()`) và khách vãng lai (đọc `x-guest-session-id` từ request header). Nếu không có cả hai, Gateway từ chối với `401 Unauthorized`. | `PROPOSED` |
| **D2** | **Tự động khởi tạo Cart (Auto-provision Cart):** Khi gọi `GET /api/v1/cart` hoặc `POST /api/v1/cart/items`, nếu User/Guest chưa có Cart `ACTIVE`, hệ thống sẽ tự động tạo một Cart mới `ACTIVE` (với Guest thì tính `expires_at = now() + 7 days`). | `PROPOSED` |
| **D3** | **Cấu trúc JSON Gemstone Config:** Lưu trong `ring_design_drafts.gemstone_config_json` dạng mảng: `[{"slotNumber": 1, "gemstoneOptionId": "uuid"}]`. | `PROPOSED` |
| **D4** | **Tính giá tự động khi biến động:** Khi Add/Update draft, gọi trực tiếp `PricingService.estimatePrice` để cập nhật `estimated_price`, `currency: "VND"`, `estimated_price_at = now()`. | `PROPOSED` |
| **D5** | **Giới hạn giỏ hàng trước Checkout (Validate Checkout - DESIG-005):** Theo BM04, mỗi Order chỉ chứa tối đa **1–2 Ring Items** (nhẫn đơn hoặc cặp nhẫn đôi). Khách có thể chọn 1 hoặc 2 `selectedDraftIds` để checkout. API kiểm tra tính hợp lệ về size, đá, và tính lại giá mới nhất. | `PROPOSED` |
| **D6** | **Ràng buộc sở hữu (Resource Ownership Guard):** Khi sửa (`PATCH`) hoặc xóa (`DELETE`) một `draftId`, service bắt buộc kiểm tra `draft.cart_id == currentCart.id` và `(cart.user_id == actor.userId OR cart.guest_session_id == actor.guestSessionId)`. Ném `403 Forbidden` nếu cố truy cập draft của người khác. | `PROPOSED` |

---

## 4. API Contracts Chi tiết

### [DESIG-001] GET /api/v1/cart
- **Headers:** `Authorization: Bearer <token>` **HOẶC** `x-guest-session-id: <uuid>`
- **Success Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "message": "Success",
    "data": {
      "id": "c1a2b3c4-cart-uuid",
      "status": "ACTIVE",
      "itemsCount": 1,
      "totalEstimatedPrice": 15500000.00,
      "currency": "VND",
      "expiresAt": "2026-11-21T03:30:00.000Z",
      "items": [
        {
          "draftId": "d1a2b3c4-draft-uuid",
          "templateVariantId": "v1a2b3c4-variant-uuid",
          "templateCode": "RT-CLASSIC-01",
          "templateName": "Classic Solitaire",
          "materialName": "Yellow Gold 18K",
          "standardSize": 12.0,
          "targetSize": 13.0,
          "personalizationPackage": "SOUNDWAVE",
          "memoryEnabled": true,
          "gemstoneSelections": [
            { "slotNumber": 1, "gemstoneOptionId": "g1a2b3c4-uuid" }
          ],
          "estimatedPrice": 15500000.00,
          "currency": "VND",
          "estimatedPriceAt": "2026-11-14T03:30:00.000Z",
          "status": "IN_CART",
          "createdAt": "2026-11-14T03:30:00.000Z"
        }
      ]
    }
  }
  ```

---

### [DESIG-002] POST /api/v1/cart/items
- **Request Body:**
  ```json
  {
    "templateVariantId": "v1a2b3c4-variant-uuid",
    "targetSize": 13.0,
    "gemstoneSelections": [
      { "slotNumber": 1, "gemstoneOptionId": "g1a2b3c4-gem-uuid" }
    ],
    "personalizationPackage": "SOUNDWAVE",
    "memoryEnabled": true
  }
  ```
- **Success Response (201 Created):**
  Trả về thông tin Draft vừa được thêm vào Cart kèm giá ước tính tính từ Pricing Service.

---

### [DESIG-003] PATCH /api/v1/cart/items/{draftId}
- **Path Params:** `draftId` (UUID)
- **Request Body (Partial):**
  ```json
  {
    "targetSize": 12.5,
    "personalizationPackage": "NONE",
    "memoryEnabled": false
  }
  ```
- **Success Response (200 OK):**
  Trả về Draft đã cập nhật với `estimated_price` được tính lại.

---

### [DESIG-004] DELETE /api/v1/cart/items/{draftId}
- **Path Params:** `draftId` (UUID)
- **Success Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "message": "Item removed from cart successfully",
    "data": { "removedDraftId": "d1a2b3c4-draft-uuid" }
  }
  ```

---

### [DESIG-005] POST /api/v1/cart/validate-checkout
- **Request Body:**
  ```json
  {
    "selectedDraftIds": ["d1a2b3c4-draft-uuid"]
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "message": "Cart is valid for checkout",
    "data": {
      "isValid": true,
      "totalEstimatedPrice": 15500000.00,
      "currency": "VND",
      "issues": []
    }
  }
  ```

---

### [DESIG-006] POST /api/v1/cart/abandon
- **Request Body:** `{}`
- **Success Response (200 OK):**
  Đổi trạng thái Cart sang `ABANDONED`.

---

## 5. Implementation Sequence

1. **Phase 1: Contracts & Protobuf**
   - Tạo `proto/commerce/v1/cart.proto` (Service `CartService` với đủ 6 RPCs).
   - Tạo handwritten contracts `libs/contracts/src/commerce/cart.grpc.ts` và export qua `libs/contracts/src/index.ts`.
   - `npm run proto:check`.
2. **Phase 2: Commerce Service Persistence & Core Logic**
   - Tạo `CartRepository` trong `apps/commerce-service/src/repositories/cart.repository.ts` (truy vấn `carts`, `ring_design_drafts`, `template_variants`).
   - Tạo `CartService` trong `apps/commerce-service/src/application/cart/cart.service.ts` (gọi `PricingService` để tính giá, validate ownership).
   - Tạo `CartGrpcController` trong `apps/commerce-service/src/presentation/grpc/cart.grpc.controller.ts`.
   - Đăng ký `DesignModule` và cập nhật `COMMERCE_GRPC_PROTOS`.
3. **Phase 3: API Gateway Layer (Module `design`)**
   - Đặt tại `apps/api-gateway/src/modules/design/` (khớp domain `design` theo API Master Spec).
   - Tạo `DesignGrpcClient` tại `apps/api-gateway/src/modules/design/clients/design-grpc.client.ts`.
   - Tạo DTOs trong `apps/api-gateway/src/modules/design/dto/`.
   - Tạo `CartController` (định tuyến `/api/v1/cart`) và sau này mở rộng thêm `DraftsController` (`/api/v1/design/drafts`).
   - Đăng ký `DesignModule` vào `apps/api-gateway/src/app.module.ts`.
4. **Phase 4: Tests & Verification**
   - Chạy `npm run proto:check`
   - Chạy `npm run boundaries`
   - Chạy `npm run typecheck`
   - Chạy `npm run lint:check`
   - Chạy unit tests cho `CartService`.

---

## 6. Implementation Progress Log

| Date | Step / Item | Status | Evidence | Checked by |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Plan Created | `APPROVED` | `docs/plans/active/commerce-cart-design.md` | Antigravity AI |
| 2026-11-14 | Plan Approved | `APPROVED` | Chủ dự án phê duyệt lựa chọn A | DuyPQ |
| 2026-11-14 | Phase 1 (Proto & Contracts) | `COMPLETED` | `proto/commerce/v1/cart.proto`, `libs/contracts/src/commerce/cart.grpc.ts` | DuyPQ |
| 2026-11-14 | Phase 2 (Commerce Core) | `COMPLETED` | `CartRepository`, `CartService`, `CartGrpcController`, `DesignModule` | DuyPQ |
| 2026-11-14 | Phase 3 (Gateway HTTP) | `COMPLETED` | Module `apps/api-gateway/src/modules/design/`, `CartController`, `DesignGrpcClient`, DTOs | DuyPQ |
| 2026-11-14 | Phase 4 (Verification & Tests) | `COMPLETED` | `proto:check` PASS, `boundaries` PASS (334 files, 0 findings), `typecheck` PASS, `lint:check` PASS, `jest` PASS (6 tests) | DuyPQ |
| 2026-11-14 | DESIG-001 | `COMPLETED` | GET /api/v1/cart | DuyPQ |
| 2026-11-14 | DESIG-002 | `COMPLETED` | POST /api/v1/cart/items | DuyPQ |
| 2026-11-14 | DESIG-003 | `COMPLETED` | PATCH /api/v1/cart/items/{draftId} | DuyPQ |
| 2026-11-14 | DESIG-004 | `COMPLETED` | DELETE /api/v1/cart/items/{draftId} | DuyPQ |
| 2026-11-14 | DESIG-005 | `COMPLETED` | POST /api/v1/cart/validate-checkout | DuyPQ |
| 2026-11-14 | DESIG-006 | `COMPLETED` | POST /api/v1/cart/abandon | DuyPQ |
