# MEMORA — Commerce Admin Catalog Management API Plan (APPROVED)

> **Mục đích:** Kế hoạch chi tiết triển khai 12 API quản trị danh mục sản phẩm **Admin Catalog Management** (`CATAL-005..008`, `010..011`, `013..014`, `017..020`) thuộc `commerce-service` (schema `catalog`) trên nhánh `DuyPQ` theo `.cursor/skills/plan-api`.
>
> **Trạng thái:** `APPROVED` — Đã được phê duyệt bởi chủ dự án.

---

## 1. Metadata & Approval Record

| Trường | Giá trị |
| --- | --- |
| Repository | `memora-backend` |
| Branch | `DuyPQ` |
| Domain / feature | `catalog` / `admin-catalog-management` |
| HTTP owner | `apps/api-gateway` (`src/modules/catalog/`) |
| Business / DB owner | `apps/commerce-service` (PostgreSQL schema `catalog`) |
| File path trong repo | `docs/plans/active/commerce-catalog-admin.md` |
| Plan status | `APPROVED` |
| Approval decision | Đã phê duyệt phương án trọn gói 12 API Admin Catalog |
| Approved API IDs | `CATAL-005`, `CATAL-006`, `CATAL-007`, `CATAL-008`, `CATAL-010`, `CATAL-011`, `CATAL-013`, `CATAL-014`, `CATAL-017`, `CATAL-018`, `CATAL-019`, `CATAL-020` |
| Date prepared | 2026-11-14 |
| Author | Antigravity AI |

### Invariants cam kết theo kiến trúc MEMORA & RBAC v1

1. **Ranh giới Gateway vs Service:** Gateway chỉ nhận HTTP request, xác thực JWT, kiểm tra quyền RBAC (`PermissionsGuard`), validate DTOs, Swagger decorators, và gọi gRPC sang `commerce-service`. `commerce-service` sở hữu toàn bộ logic nghiệp vụ, trạng thái vòng đời mẫu nhẫn và tương tác Prisma.
2. **Quyền RBAC (Role `MANAGER`):**
   - Quản lý mẫu nhẫn (`CATAL-005..008`): Yêu cầu quyền `CATALOG_TEMPLATE_MANAGE`.
   - Quản lý chất liệu, đá quý, tương thích (`CATAL-010..011`, `CATAL-017..018`): Yêu cầu quyền `CATALOG_OPTION_MANAGE`.
   - Quản lý biến thể & chính sách chỉnh size (`CATAL-013..014`, `CATAL-020`): Yêu cầu quyền `CATALOG_VARIANT_MANAGE`.
   - `CATAL-019` (Xem chính sách resize): Công khai (`PUBLIC`).
3. **Vòng đời mẫu nhẫn (Lifecycle State Machine):**
   - Khi tạo mới (`CATAL-005`): Trạng thái mặc định là `DRAFT`.
   - Khi công bố (`CATAL-007`): `DRAFT` $\rightarrow$ `ACTIVE` (chỉ cho phép khi mẫu nhẫn đã có ít nhất 1 biến thể `template_variants`).
   - Khi ngừng (`CATAL-008`): `ACTIVE` $\rightarrow$ `ARCHIVED` (không cho phép xóa vật lý nếu đã có đơn hàng/giỏ hàng tham chiếu).

---

## 2. API Inventory Chi tiết

| API ID | Method | Endpoint | Quyền RBAC | Mục đích |
| --- | --- | --- | --- | --- |
| **CATAL-005** | `POST` | `/api/v1/admin/catalog/templates` | `CATALOG_TEMPLATE_MANAGE` | Tạo mẫu nhẫn mới (DRAFT) |
| **CATAL-006** | `PATCH` | `/api/v1/admin/catalog/templates/{templateId}` | `CATALOG_TEMPLATE_MANAGE` | Cập nhật thông tin mẫu nhẫn (tên, mô tả, category, gender, asset keys) |
| **CATAL-007** | `POST` | `/api/v1/admin/catalog/templates/{templateId}/publish` | `CATALOG_TEMPLATE_MANAGE` | Công bố mẫu nhẫn (DRAFT $\rightarrow$ ACTIVE) |
| **CATAL-008** | `POST` | `/api/v1/admin/catalog/templates/{templateId}/archive` | `CATALOG_TEMPLATE_MANAGE` | Ngừng kinh doanh mẫu nhẫn (ACTIVE $\rightarrow$ ARCHIVED) |
| **CATAL-010** | `POST` | `/api/v1/admin/catalog/materials` | `CATALOG_OPTION_MANAGE` | Thêm chất liệu mới (Vàng, Bạch kim, Bạc...) |
| **CATAL-011** | `PATCH` | `/api/v1/admin/catalog/materials/{materialId}` | `CATALOG_OPTION_MANAGE` | Cập nhật thông tin chất liệu |
| **CATAL-013** | `POST` | `/api/v1/admin/catalog/variants` | `CATALOG_VARIANT_MANAGE` | Tạo biến thể chất liệu & kích cỡ cho mẫu nhẫn |
| **CATAL-014** | `PATCH` | `/api/v1/admin/catalog/variants/{variantId}` | `CATALOG_VARIANT_MANAGE` | Cập nhật thông số kích cỡ/độ dày biến thể |
| **CATAL-017** | `POST` | `/api/v1/admin/catalog/gemstone-options` | `CATALOG_OPTION_MANAGE` | Thêm tùy chọn đá quý (kim cương, sapphire...) |
| **CATAL-018** | `PUT` | `/api/v1/admin/catalog/compatibilities` | `CATALOG_OPTION_MANAGE` | Thiết lập bảng tương thích đá cho mẫu nhẫn |
| **CATAL-019** | `GET` | `/api/v1/catalog/resize-policies` | `PUBLIC` | Lấy thông số giới hạn chỉnh size cho biến thể nhẫn |
| **CATAL-020** | `PUT` | `/api/v1/admin/catalog/resize-policies` | `CATALOG_VARIANT_MANAGE` | Cập nhật chính sách chỉnh size (min/max size, độ dày) |

---

## 3. Implementation Sequence

1. **Phase 1: Protobuf & Contracts**
   - Mở rộng `proto/commerce/v1/catalog.proto` với các RPCs quản trị: `CreateTemplate`, `UpdateTemplate`, `PublishTemplate`, `ArchiveTemplate`, `CreateMaterial`, `UpdateMaterial`, `CreateVariant`, `UpdateVariant`, `CreateGemstoneOption`, `UpdateCompatibilities`, `GetResizePolicies`, `UpdateResizePolicies`.
   - Cập nhật handwritten contracts `libs/contracts/src/commerce/catalog.grpc.ts`.
   - `npm run proto:check`.
2. **Phase 2: Commerce Service Core (`catalog`)**
   - Mở rộng `CatalogRepository` (`apps/commerce-service/src/repositories/catalog.repository.ts`) với các query mutation/update.
   - Thêm methods nghiệp vụ trong `CatalogService` (`apps/commerce-service/src/application/catalog/catalog.service.ts`).
   - Cập nhật `CatalogGrpcController` (`apps/commerce-service/src/presentation/grpc/catalog.grpc.controller.ts`).
3. **Phase 3: API Gateway Layer (`catalog`)**
   - Mở rộng `CatalogGrpcClient`.
   - Tạo DTOs (`create-template.dto.ts`, `update-template.dto.ts`, etc.) và Swagger documentation.
   - Tạo `AdminCatalogController` định tuyến `/api/v1/admin/catalog` gắn `PermissionsGuard` và các mã quyền RBAC tương ứng.
   - Bổ sung endpoint `GET /api/v1/catalog/resize-policies` vào `CatalogController`.
4. **Phase 4: Tests & Verification**
   - Viết unit tests cho các nghiệp vụ quản trị trong `catalog.service.spec.ts`.
   - Chạy `npm run proto:check`, `npm run boundaries`, `npm run typecheck`, `npm run lint:check`, `npm test`.

---

## 4. Implementation Progress Log

| Date | Step / Item | Status | Evidence | Checked by |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Plan Created | `APPROVED` | `docs/plans/active/commerce-catalog-admin.md` | Antigravity AI |
| 2026-11-14 | Plan Approved | `COMPLETED` | Phê duyệt bởi User theo Phương án A | User DuyPQ |
| 2026-11-14 | Phase 1 (Proto & Contracts) | `COMPLETED` | `proto/commerce/v1/catalog.proto`, `libs/contracts/src/commerce/catalog.grpc.ts` | Antigravity AI |
| 2026-11-14 | Phase 2 (Commerce Core) | `COMPLETED` | `CatalogRepository`, `CatalogService`, `CatalogMapper`, `CatalogGrpcController` | Antigravity AI |
| 2026-11-14 | Phase 3 (Gateway HTTP) | `COMPLETED` | `AdminCatalogController`, `CatalogController`, DTOs, Swagger Docs | Antigravity AI |
| 2026-11-14 | Phase 4 (Verification & Tests) | `COMPLETED` | 12/12 unit tests pass, boundaries 0 findings, build ok | Antigravity AI |
