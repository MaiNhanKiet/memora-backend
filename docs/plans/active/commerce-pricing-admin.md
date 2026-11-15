# MEMORA — Commerce Admin Pricing Management API Plan (APPROVED)

> **Mục đích:** Kế hoạch chi tiết triển khai 9 API quản trị định giá & quy tắc giá **Admin Pricing Management** (`PRICI-002..010`) thuộc `commerce-service` (schema `pricing`) trên nhánh `DuyPQ` theo `.cursor/skills/plan-api`.
>
> **Trạng thái:** `APPROVED` — Đã được phê duyệt bởi Tech Lead/User để thực thi.

---

## 1. Metadata & Approval Record

| Trường | Giá trị |
| --- | --- |
| Repository | `memora-backend` |
| Branch | `DuyPQ` |
| Domain / feature | `pricing` / `admin-pricing-management` |
| HTTP owner | `apps/api-gateway` (`src/modules/pricing/`) |
| Business / DB owner | `apps/commerce-service` (PostgreSQL schema `pricing`) |
| File path trong repo | `docs/plans/active/commerce-pricing-admin.md` |
| Plan status | `COMPLETED` |
| Approval decision | Đã duyệt và hoàn thành triển khai toàn bộ 9 API (PRICI-002..010) |
| Approved API IDs | `PRICI-002`, `PRICI-003`, `PRICI-004`, `PRICI-005`, `PRICI-006`, `PRICI-007`, `PRICI-008`, `PRICI-009`, `PRICI-010` |
| Date prepared | 2026-11-14 |
| Author | Antigravity AI |

### Invariants cam kết theo kiến trúc MEMORA & Pricing

1. **Ranh giới Gateway vs Service:** Gateway chỉ nhận HTTP request, xác thực JWT, kiểm tra phân quyền Manager/Admin (`@Roles('MANAGER', 'ADMIN')`), validate DTOs, Swagger docs, và gọi gRPC sang `commerce-service`. `commerce-service` sở hữu toàn bộ logic nghiệp vụ, thẩm định giá và trạng thái vòng đời phiên bản giá.
2. **Quy tắc Duyệt giá & Versioning (Price Versions State Machine):**
   - Tạo mới (`PRICI-005`): Khởi tạo bản ghi `price_versions` ở trạng thái `DRAFT` với `version_no = max(version_no) + 1`.
   - Phê duyệt (`PRICI-006`): `DRAFT` $\rightarrow$ `ACTIVE`. Lưu `reviewed_by_user_id` và `reviewed_at`. Để đảm bảo ràng buộc cơ sở dữ liệu `pricing_price_versions_price_item_id_e509871_uq` (duy nhất 1 version có `status = 'ACTIVE'` trên mỗi price item), version đang `ACTIVE` hiện tại (nếu có) sẽ tự động chuyển sang `SUPERSEDED`.
   - Từ chối (`PRICI-007`): `DRAFT` $\rightarrow$ `REJECTED` kèm lý do thẩm định `review_note`.
3. **Quy tắc Quản lý Pricing Rules:**
   - Tạo mới (`PRICI-009`): Khởi tạo rule ở trạng thái `DRAFT`.
   - Kích hoạt (`PRICI-010`): Chuyển rule từ `DRAFT` $\rightarrow$ `ACTIVE`. Nếu rule thuộc loại duy nhất (`DELIVERY_FEE`, `CANCELLATION_FEE`, `REDELIVERY_FEE`, `RESIZE_FEE`), rule đang `ACTIVE` trước đó của cùng scope/mã sẽ được chuyển sang `ARCHIVED`.

---

## 2. API Inventory Chi tiết

| API ID | Method | Endpoint | Quyền / Vai trò | Mục đích |
| --- | --- | --- | --- | --- |
| **PRICI-002** | `GET` | `/api/v1/admin/pricing/items` | `MANAGER`, `ADMIN` | Tra cứu danh sách price items (phôi nhẫn, đá, cá nhân hóa) |
| **PRICI-003** | `POST` | `/api/v1/admin/pricing/items` | `MANAGER`, `ADMIN` | Định nghĩa price item mới gắn với variant, đá hoặc gói cá nhân hóa |
| **PRICI-004** | `GET` | `/api/v1/admin/pricing/versions` | `MANAGER`, `ADMIN` | Tra cứu lịch sử các phiên bản giá theo price item |
| **PRICI-005** | `POST` | `/api/v1/admin/pricing/versions` | `MANAGER`, `ADMIN` | Tạo phiên bản giá đề xuất mới (`DRAFT`) |
| **PRICI-006** | `POST` | `/api/v1/admin/pricing/versions/{versionId}/approve` | `MANAGER`, `ADMIN` | Phê duyệt phiên bản giá (`DRAFT` $\rightarrow$ `ACTIVE`) |
| **PRICI-007** | `POST` | `/api/v1/admin/pricing/versions/{versionId}/reject` | `MANAGER`, `ADMIN` | Từ chối phiên bản giá đề xuất (`DRAFT` $\rightarrow$ `REJECTED`) |
| **PRICI-008** | `GET` | `/api/v1/admin/pricing/rules` | `MANAGER`, `ADMIN` | Tra cứu danh sách các quy tắc định giá (phí vận chuyển, resize, hủy đơn...) |
| **PRICI-009** | `POST` | `/api/v1/admin/pricing/rules` | `MANAGER`, `ADMIN` | Tạo quy tắc định giá mới (`DRAFT`) |
| **PRICI-010** | `POST` | `/api/v1/admin/pricing/rules/{ruleId}/activate` | `MANAGER`, `ADMIN` | Kích hoạt áp dụng quy tắc định giá (`DRAFT` $\rightarrow$ `ACTIVE`) |

---

## 3. Implementation Sequence

1. **Phase 1: Protobuf & Contracts**
   - Mở rộng `proto/commerce/v1/pricing.proto` với service `PricingService` thêm 9 RPCs: `ListPriceItems`, `CreatePriceItem`, `ListPriceVersions`, `CreatePriceVersion`, `ApprovePriceVersion`, `RejectPriceVersion`, `ListPricingRules`, `CreatePricingRule`, `ActivatePricingRule`.
   - Cập nhật handwritten contracts `libs/contracts/src/commerce/pricing.grpc.ts`.
   - `npm run proto:check`.
2. **Phase 2: Commerce Service Core (`pricing`)**
   - Mở rộng `PricingRepository` (`apps/commerce-service/src/repositories/pricing.repository.ts`) với các query mutation/transaction.
   - Thêm methods nghiệp vụ trong `PricingService` (`apps/commerce-service/src/application/pricing/pricing.service.ts`).
   - Cập nhật `PricingGrpcController` (`apps/commerce-service/src/presentation/grpc/pricing.grpc.controller.ts`).
3. **Phase 3: API Gateway Layer (`pricing`)**
   - Mở rộng `PricingGrpcClient`.
   - Tạo DTOs (`admin-pricing.dto.ts`) và Swagger documentation.
   - Tạo `AdminPricingController` định tuyến `/api/v1/admin/pricing` gắn `@UseGuards(RolesGuard)` và `@Roles('MANAGER', 'ADMIN')`.
   - Đăng ký `AdminPricingController` vào Gateway `PricingModule`.
4. **Phase 4: Tests & Verification**
   - Viết unit tests cho các nghiệp vụ duyệt giá trong `pricing.service.spec.ts`.
   - Chạy `npm run proto:check`, `npm run boundaries`, `npm run typecheck`, `npm run lint:check`, `npm test`.

---

## 4. Implementation Progress Log

| Date | Step / Item | Status | Evidence | Checked by |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Plan Created | `PROPOSED` | `docs/plans/active/commerce-pricing-admin.md` | Antigravity AI |
| 2026-11-14 | Plan Approved | `APPROVED` | Phê duyệt bởi User / Tech Lead | User |
| 2026-11-14 | Phase 1 (Proto & Contracts) | `DONE` | `proto/commerce/v1/pricing.proto`, `libs/contracts/src/commerce/pricing.grpc.ts`, proto:check OK | Antigravity AI |
| 2026-11-14 | Phase 2 (Commerce Core) | `DONE` | `PricingRepository`, `PricingService`, `PricingMapper`, `PricingGrpcController`, `PricingModule` | Antigravity AI |
| 2026-11-14 | Phase 3 (Gateway HTTP) | `DONE` | `PricingGrpcClient`, DTOs request/response, Swagger docs, `AdminPricingController` (`/api/v1/admin/pricing`) | Antigravity AI |
| 2026-11-14 | Phase 4 (Verification & Tests) | `DONE` | 20/20 unit tests PASS (`pricing.service.spec.ts`), `boundaries` 353 files 0 findings, `typecheck` 0 errors, `lint:check` 0 errors, `build` OK | Antigravity AI |
