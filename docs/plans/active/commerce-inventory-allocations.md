# MEMORA — Commerce Inventory Allocations & Stock Lifecycle Plan (APPROVED)

> **Mục đích:** Kế hoạch chi tiết triển khai 5 API/RPCs vòng đời cấp phát vật tư **Inventory Allocations & Stock Lifecycle** (`INVEN-007..011`) thuộc `commerce-service` (schema `inventory`) trên nhánh `DuyPQ` theo `.agents/rules/13-business-service-structure.md`, `implement-api`.
>
> **Trạng thái:** `APPROVED` — Đã cập nhật đồng bộ các quy chuẩn kiến trúc mới nhất (D-P-03 `memora.common.v1.VerifiedActor`, `INVENTORY_ALLOCATE` permission, package `memora.commerce.v1`).

---

## 1. Metadata & Ranh giới Kiến trúc

| Trường | Giá trị |
| --- | --- |
| Repository | `memora-backend` |
| Branch | `DuyPQ` |
| Domain / Feature | `inventory` / `commerce-inventory-allocations` |
| HTTP Owner | `apps/api-gateway` (`src/modules/inventory/`) |
| Business / DB Owner | `apps/commerce-service` (PostgreSQL schema `inventory`, `ordering`) |
| File path trong repo | `docs/plans/active/commerce-inventory-allocations.md` |
| Plan status | `APPROVED` |
| Approved API IDs | `INVEN-007`, `INVEN-008`, `INVEN-009`, `INVEN-010`, `INVEN-011` |
| Author | Antigravity AI |

### Invariants cam kết theo kiến trúc MEMORA & Inventory Allocations

1. **Ranh giới Gateway vs Service & Quyền hạn (RBAC):**
   - Gateway nhận HTTP requests quản trị phân bổ vật tư (`/api/v1/admin/inventory/allocations/**`), xác thực JWT, kiểm tra `@RequirePermissions(PERMISSIONS.INVENTORY_ALLOCATE)` (hoặc `@Roles('MANAGER', 'ADMIN')`), trích xuất danh tính Actor qua `toVerifiedActor(principal)`.
   - `commerce-service` tiếp nhận qua gRPC với `memora.common.v1.VerifiedActor actor = 1`, kiểm tra bằng `parseVerifiedActor(request.actor)` và `requireUserActor(actor)`.
   - `commerce-service` sở hữu logic quản lý bảng `allocations`, tính toán số dư `stock_lots` (`quantity_on_hand`, `quantity_reserved`), cập nhật trạng thái `certified_gemstones` và ghi sổ cái bất biến `inventory_movements`.
2. **Quy tắc Vòng đời Cấp phát (Allocation State Machine Invariant):**
   - Trạng thái hợp lệ: `HOLD` $\rightarrow$ `RESERVED` $\rightarrow$ `ALLOCATED` $\rightarrow$ `CONSUMED`.
   - Tại bất kỳ trạng thái nào trước `CONSUMED`, có thể chuyển sang `RELEASED`.
   - Khi `HOLD` / `RESERVED`: tăng `quantity_reserved` trong `stock_lots` hoặc đổi trạng thái viên đá thành `RESERVED`.
   - Khi `CONSUMED`: trừ đồng thời `quantity_on_hand` và `quantity_reserved` trong `stock_lots` (hoặc đánh dấu viên đá là `MOUNTED`), ghi một movement loại `OUTBOUND` vào `inventory_movements`.
   - Khi `RELEASED`: giảm `quantity_reserved` trong `stock_lots` (hoặc đổi viên đá về `AVAILABLE`), ghi một movement loại `ADJUSTMENT` nếu cần truy vết.
3. **Nguyên tắc Sổ cái Biến động Kho Bất biến (Immutable Movement Ledger):**
   - Bảng `inventory_movements` chỉ được phép `INSERT`, không bao giờ `UPDATE` hay `DELETE`.
   - Mọi thay đổi vật tư đều thực thi nguyên tử trong một Prisma `$transaction`.

---

## 2. API Inventory Chi tiết

| API ID | Method | Endpoint / RPC | Auth / Vai trò | Mục đích & Nghiệp vụ | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| **INVEN-007** | `POST` | `/api/v1/admin/inventory/allocations/hold` & gRPC `HoldInventory` | `INVENTORY_ALLOCATE` / `MANAGER`, `ADMIN` | Giữ tạm stock (phôi nhẫn hoặc viên đá) cho một chiếc nhẫn với TTL (`expires_at`), status = `HOLD`. | `APPROVED` |
| **INVEN-008** | `POST` | `/api/v1/admin/inventory/allocations/reserve` & gRPC `ReserveInventory` | `INVENTORY_ALLOCATE` / `MANAGER`, `ADMIN` | Chốt giữ stock cho đơn hàng sau khi hoàn tất cọc (status chuyển từ `HOLD` $\rightarrow$ `RESERVED`, xoá TTL). | `APPROVED` |
| **INVEN-009** | `POST` | `/api/v1/admin/inventory/allocations/allocate` & gRPC `AllocateInventory` | `INVENTORY_ALLOCATE` / `MANAGER`, `ADMIN` | Cấp phát vật tư cụ thể cho lượt chế tác (`production_attempt_id`), status = `ALLOCATED`. | `APPROVED` |
| **INVEN-010** | `POST` | `/api/v1/admin/inventory/allocations/consume` & gRPC `ConsumeInventory` | `INVENTORY_ALLOCATE` / `MANAGER`, `ADMIN` | Ghi nhận tiêu hao vật tư sau khi chế tác hoàn tất (trừ tồn kho on-hand, status = `CONSUMED`, ghi `OUTBOUND` movement). | `APPROVED` |
| **INVEN-011** | `POST` | `/api/v1/admin/inventory/allocations/release` & gRPC `ReleaseInventory` | `INVENTORY_ALLOCATE` / `MANAGER`, `ADMIN` | Giải phóng stock đã giữ hoặc cấp phát (giảm reserved, trả vật tư về khả dụng, status = `RELEASED`). | `APPROVED` |

---

## 3. Danh sách file dự kiến tạo / sửa đổi (Pre-execution Gate)

1. **Protobuf Wire:**
   - `proto/commerce/v1/inventory.proto`: Thêm `import "common/v1/actor.proto";`, thêm 5 RPCs `HoldInventory`, `ReserveInventory`, `AllocateInventory`, `ConsumeInventory`, `ReleaseInventory` kèm message requests mang `memora.common.v1.VerifiedActor actor = 1`.
2. **Handwritten TypeScript Contracts:**
   - `libs/contracts/src/commerce/inventory.grpc.ts`: Thêm request/response interfaces, cập nhật `InventoryServiceClient` & `InventoryServiceHandler`.
3. **Commerce Service Core:**
   - `apps/commerce-service/src/repositories/inventory.repository.ts`: Bổ sung methods giao dịch allocation (`createAllocationTransaction`, `updateAllocationStatusTransaction`, `findAllocationById`).
   - `apps/commerce-service/src/application/inventory/inventory.service.ts`: Implement logic 5 RPCs, kiểm tra actor bằng `parseVerifiedActor` & `requireUserActor`, kiểm tra trạng thái và số lượng tồn kho.
   - `apps/commerce-service/src/presentation/grpc/inventory.grpc.controller.ts`: Đăng ký 5 gRPC method handlers.
4. **API Gateway Layer:**
   - `apps/api-gateway/src/modules/inventory/clients/inventory-grpc.client.ts`: Expose 5 methods gRPC call.
   - `apps/api-gateway/src/modules/inventory/controllers/admin-inventory.controller.ts`: Thêm 5 endpoints HTTP tại `/api/v1/admin/inventory/allocations/**`, inject `@CurrentUser()` và chuyển qua `toVerifiedActor(principal)`.
   - `apps/api-gateway/src/modules/inventory/dto/request/admin-inventory.dto.ts`: Thêm DTOs validation cho allocation requests.
   - `apps/api-gateway/src/modules/inventory/docs/admin-inventory.swagger.ts`: Thêm Swagger docs decorators.
5. **Testing & Verification:**
   - `apps/commerce-service/src/application/inventory/inventory.service.spec.ts`: Bổ sung unit tests cho 5 methods mới.

---

## 4. Implementation Progress Log

| Date | Step / Item | Status | Evidence | Checked by |
| --- | --- | --- | --- | --- |
| 2026-11-15 | Plan Created & Synchronized | `APPROVED` | Đã sync VerifiedActor, Permissions, Protobuf package | Antigravity AI |
| | Phase 1 (Proto & Contracts) | `NOT_STARTED` | | |
| | Phase 2 (Commerce Core) | `NOT_STARTED` | | |
| | Phase 3 (Gateway HTTP) | `NOT_STARTED` | | |
| | Phase 4 (Verification & Tests) | `NOT_STARTED` | | |
