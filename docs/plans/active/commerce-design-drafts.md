# MEMORA — Commerce Design Draft Details & Duplication API Plan (APPROVED)

> **Mục đích:** Kế hoạch chi tiết triển khai 2 API xem chi tiết và nhân bản bản nháp thiết kế nhẫn **Design Drafts** (`DESIG-007..008`) thuộc `commerce-service` (schema `design`) trên nhánh `DuyPQ` theo `.cursor/skills/plan-api`.
>
> **Trạng thái:** `APPROVED` — Đã được phê duyệt bởi Tech Lead/User để thực thi.

---

## 1. Metadata & Approval Record

| Trường | Giá trị |
| --- | --- |
| Repository | `memora-backend` |
| Branch | `DuyPQ` |
| Domain / feature | `design` / `commerce-design-drafts` |
| HTTP owner | `apps/api-gateway` (`src/modules/design/`) |
| Business / DB owner | `apps/commerce-service` (PostgreSQL schema `design`) |
| File path trong repo | `docs/plans/active/commerce-design-drafts.md` |
| Plan status | `COMPLETED` |
| Approval decision | Đã duyệt và hoàn thành triển khai toàn bộ 2 API (DESIG-007, DESIG-008) |
| Approved API IDs | `DESIG-007`, `DESIG-008` |
| Date prepared | 2026-11-14 |
| Author | Antigravity AI |

### Invariants cam kết theo kiến trúc MEMORA & Design Drafts

1. **Ranh giới Gateway vs Service:** Gateway nhận HTTP request, trích xuất danh tính Actor (`userId` từ JWT hoặc `guestSessionId` từ header `x-guest-session-id`), DTO validation, Swagger decorators và gọi gRPC nội bộ sang `commerce-service`. `commerce-service` sở hữu logic kiểm tra quyền sở hữu draft, tính lại giá và thao tác dữ liệu.
2. **Quy tắc Kiểm tra Quyền sở hữu Bản nháp (Draft Ownership Invariant):**
   - Chỉ người dùng tạo ra bản nháp (thông qua Cart gắn với `userId` hoặc `guestSessionId`) mới được phép xem (`DESIG-007`) hoặc nhân bản (`DESIG-008`).
   - Nếu draft thuộc về Cart của người khác, service từ chối với `403 Forbidden` (hoặc `404 Not Found` để tránh lộ tài nguyên).
3. **Quy tắc Nhân bản (Duplicate Draft Invariant - DESIG-008):**
   - Bản nháp mới được tạo sẽ thuộc Cart `ACTIVE` hiện hành của người dùng.
   - Toàn bộ cấu hình thiết kế (template variant, target size, bố cục đá quý `gemstone_config_json`, gói cá nhân hóa, chữ khắc, font, memory toggle) được sao chép nguyên vẹn.
   - Bản nháp mới được khởi tạo ở trạng thái `IN_CART`.
   - Hệ thống tự động gọi `PricingService.estimatePrice` để tính lại giá thời gian thực (`estimated_price`, `estimated_price_at = now()`) phòng trường hợp phiên bản giá đã thay đổi kể từ khi tạo draft gốc.

---

## 2. API Inventory Chi tiết

| API ID | Method | Endpoint | Auth / Identity | Mục đích & Ràng buộc |
| --- | --- | --- | --- | --- |
| **DESIG-007** | `GET` | `/api/v1/design/drafts/{draftId}` | JWT (Customer) **HOẶC** `x-guest-session-id` | Tra cứu chi tiết cấu hình và giá tạm tính của bản nháp thiết kế. Kiểm tra quyền sở hữu. |
| **DESIG-008** | `POST` | `/api/v1/design/drafts/{draftId}/duplicate` | JWT (Customer) **HOẶC** `x-guest-session-id` | Nhân bản một draft có sẵn sang một draft mới trong cart của người dùng và tính lại giá. |

---

## 3. Implementation Sequence

1. **Phase 1: Protobuf & Contracts**
   - Mở rộng `proto/commerce/v1/cart.proto`: Thêm 2 RPCs `GetDesignDraft` và `DuplicateDesignDraft` vào `CartService` (hoặc tạo gRPC method phù hợp).
   - Cập nhật handwritten contracts `libs/contracts/src/commerce/cart.grpc.ts`.
   - Chạy `npm run proto:check`.
2. **Phase 2: Commerce Service Core (`design`)**
   - Mở rộng `CartRepository` (`apps/commerce-service/src/repositories/cart.repository.ts`): Thêm method `findDraftById` và `duplicateDraft`.
   - Cập nhật `CartService` (`apps/commerce-service/src/application/cart/cart.service.ts`): Thêm 2 phương thức nghiệp vụ có kiểm tra quyền sở hữu và re-estimate price.
   - Cập nhật `CartGrpcController` (`apps/commerce-service/src/presentation/grpc/cart.grpc.controller.ts`).
3. **Phase 3: API Gateway Layer (`design`)**
   - Mở rộng `CartGrpcClient` (`apps/api-gateway/src/modules/cart/clients/cart-grpc.client.ts`).
   - Tạo DTOs và Swagger documentation cho `/api/v1/design/drafts/{draftId}`.
   - Tạo Controller `DesignDraftController` (`apps/api-gateway/src/modules/design/controllers/design-draft.controller.ts`).
   - Đăng ký vào `DesignModule` (`apps/api-gateway/src/modules/design/design.module.ts`).
4. **Phase 4: Tests & Verification**
   - Bổ sung unit tests trong `apps/commerce-service/src/application/cart/cart.service.spec.ts`.
   - Chạy kiểm tra: `npm run proto:check`, `npm run boundaries`, `npm run typecheck`, `npm run lint:check`, jest tests, và webpack build.

---

## 4. Implementation Progress Log

| Date | Step / Item | Status | Evidence | Checked by |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Plan Created & Approved | `COMPLETED` | `docs/plans/active/commerce-design-drafts.md` | Tech Lead / User |
| 2026-11-14 | Phase 1 (Proto & Contracts) | `COMPLETED` | `proto/commerce/v1/cart.proto`, `libs/contracts/src/commerce/cart.grpc.ts` | Antigravity AI |
| 2026-11-14 | Phase 2 (Commerce Core) | `COMPLETED` | `apps/commerce-service/src/application/cart/cart.service.ts`, `cart.grpc.controller.ts` | Antigravity AI |
| 2026-11-14 | Phase 3 (Gateway HTTP) | `COMPLETED` | `design-draft.controller.ts`, `design.module.ts`, `design-grpc.client.ts`, `cart.dto.ts` | Antigravity AI |
| 2026-11-14 | Phase 4 (Verification & Tests) | `COMPLETED` | 12/12 unit tests PASS, proto check OK, boundaries 0 issues, typecheck 0 errors, build OK | Antigravity AI |
