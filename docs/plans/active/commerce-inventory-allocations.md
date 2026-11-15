# MEMORA — Commerce Inventory Allocations & Stock Lifecycle Plan (PROPOSED)

> **Mục đích:** Kế hoạch chi tiết triển khai 5 API/RPCs vòng đời cấp phát vật tư **Inventory Allocations & Stock Lifecycle** (`INVEN-007..011`) thuộc `commerce-service` (schema `inventory`) trên nhánh `DuyPQ` theo `.cursor/skills/plan-api`.
>
> **Trạng thái:** `AWAITING_APPROVAL` — Chờ Tech Lead/User xem xét và phê duyệt.

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
| Plan status | `AWAITING_APPROVAL` |
| Proposed API IDs | `INVEN-007`, `INVEN-008`, `INVEN-009`, `INVEN-010`, `INVEN-011` |
| Author | Antigravity AI |

### Invariants cam kết theo kiến trúc MEMORA & Inventory Allocations

1. **Ranh giới Gateway vs Service:**
   - Gateway nhận HTTP requests quản trị phân bổ vật tư (`/api/v1/admin/inventory/allocations/**`), xác thực JWT, kiểm tra `@Roles('MANAGER', 'ADMIN')`, validate DTOs và gọi gRPC nội bộ sang `commerce-service`.
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
| **INVEN-007** | `POST` | `/api/v1/admin/inventory/allocations/hold` & gRPC `HoldInventory` | `MANAGER`, `ADMIN` / Internal gRPC | Giữ tạm stock (phôi nhẫn hoặc viên đá) cho một chiếc nhẫn với TTL (`expires_at`), status = `HOLD`. | `PROPOSED` |
| **INVEN-008** | `POST` | `/api/v1/admin/inventory/allocations/reserve` & gRPC `ReserveInventory` | `MANAGER`, `ADMIN` / Internal gRPC | Chốt giữ stock cho đơn hàng sau khi hoàn tất cọc (status chuyển từ `HOLD` $\rightarrow$ `RESERVED`, xoá TTL). | `PROPOSED` |
| **INVEN-009** | `POST` | `/api/v1/admin/inventory/allocations/allocate` & gRPC `AllocateInventory` | `MANAGER`, `ADMIN` / Internal gRPC | Cấp phát vật tư cụ thể cho lượt chế tác (`production_attempt_id`), status = `ALLOCATED`. | `PROPOSED` |
| **INVEN-010** | `POST` | `/api/v1/admin/inventory/allocations/consume` & gRPC `ConsumeInventory` | `MANAGER`, `ADMIN` / Internal gRPC | Ghi nhận tiêu hao vật tư sau khi chế tác hoàn tất (trừ tồn kho on-hand, status = `CONSUMED`, ghi `OUTBOUND` movement). | `PROPOSED` |
| **INVEN-011** | `POST` | `/api/v1/admin/inventory/allocations/release` & gRPC `ReleaseInventory` | `MANAGER`, `ADMIN` / Internal gRPC | Giải phóng stock đã giữ hoặc cấp phát (giảm reserved, trả vật tư về khả dụng, status = `RELEASED`). | `PROPOSED` |

---

## 3. Implementation Sequence

1. **Phase 1: Protobuf & Handwritten Contracts**
   - Mở rộng `proto/commerce/v1/inventory.proto`: Thêm 5 RPCs: `HoldInventory`, `ReserveInventory`, `AllocateInventory`, `ConsumeInventory`, `ReleaseInventory`.
   - Cập nhật `libs/contracts/src/commerce/inventory.grpc.ts`.
   - Chạy `npm run proto:check`.
2. **Phase 2: Commerce Service Core (`inventory`)**
   - Mở rộng `InventoryRepository` (`apps/commerce-service/src/repositories/inventory.repository.ts`): Thêm các transactions thao tác bảng `allocations`, cập nhật `stock_lots`, `certified_gemstones` và `inventory_movements`.
   - Mở rộng `InventoryService` (`apps/commerce-service/src/application/inventory/inventory.service.ts`): Áp dụng state machine và kiểm tra số dư.
   - Đăng ký gRPC handlers trong `InventoryGrpcController`.
3. **Phase 3: API Gateway Layer (`inventory`)**
   - Cập nhật `InventoryGrpcClient`.
   - Thêm endpoints vào `AdminInventoryController` (`apps/api-gateway/src/modules/inventory/controllers/admin-inventory.controller.ts`).
   - Thêm DTOs và Swagger documentation.
4. **Phase 4: Tests & Verification**
   - Viết bổ sung unit tests trong `inventory.service.spec.ts`.
   - Chạy kiểm tra: `npm run proto:check`, `npm run boundaries`, `npm run typecheck`, `npm run lint:check`, jest tests, webpack build.

---

## 4. Implementation Progress Log

| Date | Step / Item | Status | Evidence | Checked by |
| --- | --- | --- | --- | --- |
| 2026-11-15 | Plan Created | `AWAITING_APPROVAL` | `docs/plans/active/commerce-inventory-allocations.md` | Antigravity AI |
| | Plan Approved | `PENDING` | Chờ người dùng phê duyệt | |
| | Phase 1 (Proto & Contracts) | `NOT_STARTED` | | |
| | Phase 2 (Commerce Core) | `NOT_STARTED` | | |
| | Phase 3 (Gateway HTTP) | `NOT_STARTED` | | |
| | Phase 4 (Verification & Tests) | `NOT_STARTED` | | |
