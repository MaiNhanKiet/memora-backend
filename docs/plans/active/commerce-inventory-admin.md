# MEMORA — Commerce Admin Inventory Management API Plan (APPROVED)

> **Mục đích:** Kế hoạch chi tiết triển khai 8 API quản lý kho vật tư & đá quý **Admin Inventory Management** (`INVEN-001..006`, `INVEN-012..013`) thuộc `commerce-service` (schema `inventory`) trên nhánh `DuyPQ` theo `.cursor/skills/plan-api`.
>
> **Trạng thái:** `APPROVED` — Đã được phê duyệt bởi Tech Lead/User để thực thi.

---

## 1. Metadata & Approval Record

| Trường | Giá trị |
| --- | --- |
| Repository | `memora-backend` |
| Branch | `DuyPQ` |
| Domain / feature | `inventory` / `admin-inventory-management` |
| HTTP owner | `apps/api-gateway` (`src/modules/inventory/`) |
| Business / DB owner | `apps/commerce-service` (PostgreSQL schema `inventory`) |
| File path trong repo | `docs/plans/active/commerce-inventory-admin.md` |
| Plan status | `COMPLETED` |
| Approval decision | Đã duyệt và hoàn thành triển khai toàn bộ 8 API (INVEN-001..006, INVEN-012..013) |
| Approved API IDs | `INVEN-001`, `INVEN-002`, `INVEN-003`, `INVEN-004`, `INVEN-005`, `INVEN-006`, `INVEN-012`, `INVEN-013` |
| Date prepared | 2026-11-14 |
| Author | Antigravity AI |

### Invariants cam kết theo kiến trúc MEMORA & Inventory

1. **Ranh giới Gateway vs Service:** Gateway chỉ nhận HTTP request, xác thực danh tính JWT, kiểm tra phân quyền Manager/Admin (`@Roles('MANAGER', 'ADMIN')`), validate DTOs, sinh tài liệu Swagger và gọi gRPC nội bộ sang `commerce-service`. Toàn bộ logic quản lý kho, tính toán số dư tồn và kiểm soát số cái thuộc về `commerce-service`.
2. **Nguyên tắc Sổ cái Biến động Kho (Immutable Inventory Ledger Invariant):**
   - Mọi thao tác làm thay đổi số lượng vật tư (`RECEIPT` - nhập kho, `ADJUSTMENT` - điều chỉnh kiểm kê) trong `stock_lots` hoặc viên đá trong `certified_gemstones` **bắt buộc phải thực hiện trong một Prisma `$transaction`** cùng với việc ghi một bản ghi bất biến tương ứng vào `inventory_movements`.
   - Bảng `inventory_movements` chỉ được phép `INSERT`, không bao giờ được `UPDATE` hay `DELETE` để đảm bảo truy vết kiểm toán (Audit Trail) tài chính & tài sản.
3. **Quy tắc Kiểm soát Số dư (Non-negative Stock Invariant):**
   - `quantity_on_hand` và `quantity_reserved` trong `stock_lots` không được phép âm (`>= 0`).
   - Lệnh điều chỉnh kho (`ADJUSTMENT`) nếu giảm số lượng tồn không được làm cho `quantity_on_hand` nhỏ hơn `quantity_reserved` hoặc nhỏ hơn 0.
4. **Phân quyền & Truy cập:**
   - Các API quản trị kho (`INVEN-001..004`, `INVEN-006`, `INVEN-012..013`): Yêu cầu vai trò `@Roles('MANAGER', 'ADMIN')`.
   - API kiểm tra tính khả dụng đá chứng nhận (`INVEN-005`): Endpoint công khai (`@Public()`) hoặc dành cho khách hàng phục vụ luồng tùy biến nhẫn.

---

## 2. API Inventory Chi tiết

| API ID | Method | Endpoint | Quyền / Vai trò | Mục đích & Ràng buộc |
| --- | --- | --- | --- | --- |
| **INVEN-001** | `GET` | `/api/v1/admin/inventory/ring-blanks` | `MANAGER`, `ADMIN` | Tra cứu tồn kho phôi nhẫn theo chất liệu, kích thước chuẩn. Hỗ trợ phân trang và lọc status. |
| **INVEN-002** | `POST` | `/api/v1/admin/inventory/ring-blanks/receipts` | `MANAGER`, `ADMIN` | Nhập kho lô phôi nhẫn mới. Tăng `quantity_on_hand` và ghi nhận movement loại `RECEIPT`. |
| **INVEN-003** | `GET` | `/api/v1/admin/inventory/gemstone-batches` | `MANAGER`, `ADMIN` | Tra cứu tồn kho các lô đá quý tấm/lô thông thường theo `gemstone_option_id`. |
| **INVEN-004** | `POST` | `/api/v1/admin/inventory/gemstone-batches/receipts` | `MANAGER`, `ADMIN` | Nhập kho lô đá quý mới. Tăng `quantity_on_hand` và ghi nhận movement loại `RECEIPT`. |
| **INVEN-005** | `GET` | `/api/v1/inventory/certified-gemstones/availability` | Public / Customer | Tra cứu các viên đá kiểm định (GIA/IGI) khả dụng (`AVAILABLE`) để khách hàng gắn vào nhẫn. |
| **INVEN-006** | `POST` | `/api/v1/admin/inventory/certified-gemstones` | `MANAGER`, `ADMIN` | Đăng ký một viên đá có chứng nhận mới vào kho (`status: AVAILABLE`, ghi movement `RECEIPT`). |
| **INVEN-012** | `GET` | `/api/v1/admin/inventory/movements` | `MANAGER`, `ADMIN` | Tra cứu sổ cái biến động kho (Audit trail: nhập, giữ, xuất, điều chỉnh) theo lot hoặc viên đá. |
| **INVEN-013** | `POST` | `/api/v1/admin/inventory/adjustments` | `MANAGER`, `ADMIN` | Điều chỉnh số lượng tồn kho có lý do kiểm kê (bắt buộc `reason`, ghi movement `ADJUSTMENT`). |

---

## 3. Implementation Sequence

1. **Phase 1: Protobuf & Contracts**
   - Tạo mới `proto/commerce/v1/inventory.proto` với service `InventoryService` và 8 RPCs tương ứng.
   - Tạo handwritten contracts `libs/contracts/src/commerce/inventory.grpc.ts` và export trong `libs/contracts/src/index.ts`.
   - Kiểm tra tương thích với `npm run proto:check`.
2. **Phase 2: Commerce Service Core (`inventory`)**
   - Tạo `InventoryRepository` (`apps/commerce-service/src/repositories/inventory.repository.ts`) đóng gói toàn bộ query và `$transaction` ghi sổ cái.
   - Tạo `InventoryMapper` (`apps/commerce-service/src/application/inventory/inventory.mapper.ts`).
   - Tạo `InventoryService` (`apps/commerce-service/src/application/inventory/inventory.service.ts`) chứa logic nghiệp vụ và kiểm tra ràng buộc số dư.
   - Tạo `InventoryGrpcController` (`apps/commerce-service/src/presentation/grpc/inventory.grpc.controller.ts`) gắn `CommerceInternalGrpcAuthGuard`.
   - Cập nhật `InventoryModule` (`apps/commerce-service/src/modules/inventory/inventory.module.ts`).
3. **Phase 3: API Gateway Layer (`inventory`)**
   - Tạo `InventoryGrpcClient` (`apps/api-gateway/src/modules/inventory/clients/inventory-grpc.client.ts`).
   - Tạo DTOs request/response với `class-validator`, `class-transformer` và `@nestjs/swagger`.
   - Tạo Swagger docs decorators.
   - Tạo `AdminInventoryController` (`/api/v1/admin/inventory`) với `@Roles('MANAGER', 'ADMIN')`.
   - Tạo `InventoryController` (`/api/v1/inventory`) cho endpoint công khai `INVEN-005`.
   - Đăng ký module `InventoryModule` vào Gateway `AppModule`.
4. **Phase 4: Tests & Verification**
   - Viết trọn bộ unit tests cho `InventoryService` trong `apps/commerce-service/src/application/inventory/inventory.service.spec.ts`.
   - Chạy bộ kiểm tra chuẩn: `npm run proto:check`, `npm run boundaries`, `npm run typecheck`, `npm run lint:check`, unit test jest, và build webpack cả 2 apps.

---

## 4. Implementation Progress Log

| Date | Step / Item | Status | Evidence | Checked by |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Plan Created | `PROPOSED` | `docs/plans/active/commerce-inventory-admin.md` | Antigravity AI |
| 2026-11-14 | Plan Approved | `APPROVED` | Phê duyệt bởi User / Tech Lead | User |
| 2026-11-14 | Phase 1 (Proto & Contracts) | `DONE` | `proto/commerce/v1/inventory.proto`, `libs/contracts/src/commerce/inventory.grpc.ts`, proto:check OK | Antigravity AI |
| 2026-11-14 | Phase 2 (Commerce Core) | `DONE` | `InventoryRepository`, `InventoryMapper`, `InventoryService`, `InventoryGrpcController`, `InventoryModule` | Antigravity AI |
| 2026-11-14 | Phase 3 (Gateway HTTP) | `DONE` | `InventoryGrpcClient`, DTOs request/response, Swagger docs, `AdminInventoryController`, `InventoryController` | Antigravity AI |
| 2026-11-14 | Phase 4 (Verification & Tests) | `DONE` | 14/14 unit tests PASS (`inventory.service.spec.ts`), `boundaries` 366 files 0 findings, `typecheck` 0 errors, `lint` 0 errors, `build` OK | Antigravity AI |
