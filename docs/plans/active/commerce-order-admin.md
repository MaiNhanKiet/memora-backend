# MEMORA — Commerce Order Admin Management Core Plan (APPROVED)

> **Mục đích:** Kế hoạch chi tiết triển khai nhóm 3 API cốt lõi **Quản trị Đơn hàng (Admin Order Management Core)** (`ORDER-006`, `ORDER-ADMIN-01`, `ORDER-ADMIN-02`) thuộc `commerce-service` (schema `ordering`) trên nhánh `DuyPQ` theo `.cursor/skills/implement-api`.
>
> **Trạng thái:** `APPROVED` — Đã được Tech Lead/User phê duyệt theo Phương án B.

---

## 1. Metadata & Ranh giới Kiến trúc

| Trường | Giá trị |
| --- | --- |
| Repository | `memora-backend` |
| Branch | `DuyPQ` |
| Domain / Feature | `ordering` / `commerce-order-admin` |
| HTTP Owner | `apps/api-gateway` (`src/modules/ordering/`) |
| Business / DB Owner | `apps/commerce-service` (PostgreSQL schema `ordering`, `pricing`, `catalog`) |
| File path trong repo | `docs/plans/active/commerce-order-admin.md` |
| Plan status | `COMPLETED` |
| Approved API IDs | `ORDER-006`, `ORDER-ADMIN-01`, `ORDER-ADMIN-02` |
| Deferred API IDs | `ORDER-008`, `ORDER-009`, `ORDER-010` (chuyển sang giai đoạn sau) |
| Author | Antigravity AI |

### Invariants cam kết theo kiến trúc MEMORA

1. **Ranh giới Gateway vs Service:**
   - **Gateway** sở hữu định tuyến HTTP, trích xuất staff actor từ JWT, phân quyền `@RequirePermissions('ORDER_READ_OPERATIONS')`, DTO validation, Swagger docs, mapping gRPC.
   - **Commerce Service** sở hữu domain logic, truy vấn database Prisma schema `ordering`, đảm bảo trạng thái đơn tuân thủ state machine của MEMORA, tuyệt đối không lộ Prisma ra Gateway.
2. **Quy tắc Phân quyền (RBAC Invariant):**
   - Các endpoint Admin (`/api/v1/admin/orders/**`) yêu cầu quyền `ORDER_READ_OPERATIONS` và chỉ cấp cho các role vận hành (`STORE_MANAGER`, `STORE_STAFF`, `SUPER_ADMIN`).
3. **Quy tắc Chuyển trạng thái Đơn hàng (State Transition Invariant):**
   - Cho phép chuyển đổi trạng thái hợp lệ theo luồng nghiệp vụ của MEMORA:
     - `AWAITING_P1` $\rightarrow$ `PENDING_FINAL_QUOTE` / `CANCELLED`
     - `PENDING_FINAL_QUOTE` $\rightarrow$ `AWAITING_CUSTOMER_CONFIRMATION` / `CANCELLED`
     - `AWAITING_CUSTOMER_CONFIRMATION` $\rightarrow$ `AWAITING_P2` / `CANCELLED`
     - `AWAITING_P2` $\rightarrow$ `MANUFACTURING` / `CANCELLED`
     - `MANUFACTURING` $\rightarrow$ `COMPLETED_MANUFACTURING` / `READY_FOR_DELIVERY`
     - `READY_FOR_DELIVERY` $\rightarrow$ `DELIVERED`
     - Bất kỳ trạng thái hợp lệ nào $\rightarrow$ `CANCELLED` (kèm `cancellation_reason` và `cancelled_at = now()`).

---

## 2. API Inventory Chi tiết

| API ID | Method | Endpoint | Auth / Permission | Mục đích & Nghiệp vụ | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| **ORDER-006** | `GET` | `/api/v1/admin/orders` | JWT · `ORDER_READ_OPERATIONS` | Danh sách đơn hàng toàn hệ thống với bộ lọc theo trạng thái (`status`), từ khoá (`search` theo order_no / recipient), ngày tạo (`from`, `to`), phân trang (`page`, `limit`). | `APPROVED` |
| **ORDER-ADMIN-01** | `GET` | `/api/v1/admin/orders/{orderId}` | JWT · `ORDER_READ_OPERATIONS` | Xem chi tiết toàn diện đơn hàng cho quản trị: thông tin khách, chi tiết ring items, báo giá hiện hành, pre-P1 evidence, lịch sử thanh toán. | `APPROVED` |
| **ORDER-ADMIN-02** | `PATCH` | `/api/v1/admin/orders/{orderId}/status` | JWT · `ORDER_READ_OPERATIONS` | Cập nhật chuyển trạng thái đơn hàng (ví dụ: chuyển từ `PENDING_FINAL_QUOTE` $\rightarrow$ `AWAITING_CUSTOMER_CONFIRMATION`, hoặc huỷ đơn có lý do). | `APPROVED` |

---

## 3. Implementation Sequence

1. **Phase 1: Protobuf & Handwritten Contracts**
   - Mở rộng `proto/commerce/v1/ordering.proto`: Thêm RPCs `ListAdminOrders`, `GetAdminOrderDetails`, `UpdateOrderStatus`.
   - Cập nhật `libs/contracts/src/commerce/ordering.grpc.ts`.
   - Chạy `npm run proto:check`.
2. **Phase 2: Commerce Service Core (`ordering`)**
   - Mở rộng `OrderRepository` (`apps/commerce-service/src/repositories/order.repository.ts`).
   - Mở rộng `OrderService` (`apps/commerce-service/src/application/order/order.service.ts`).
   - Đăng ký gRPC handlers trong `OrderGrpcController`.
3. **Phase 3: API Gateway Layer (`ordering`)**
   - Cập nhật `OrderingGrpcClient`.
   - Tạo Controller `AdminOrdersController` (`apps/api-gateway/src/modules/ordering/controllers/admin-orders.controller.ts`).
   - Tạo DTOs và Swagger documentation.
   - Đăng ký controller vào `ordering.module.ts`.
4. **Phase 4: Tests & Verification**
   - Bổ sung unit tests trong `order.service.spec.ts`.
   - Chạy kiểm tra: `npm run proto:check`, `npm run boundaries`, `npm run typecheck`, `npm run lint:check`, jest tests, webpack build.

---

## 5. Implementation Progress Log

| Date | Step / Item | Status | Evidence | Checked by |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Plan Created & Approved | `COMPLETED` | `docs/plans/active/commerce-order-admin.md` | Tech Lead / User |
| 2026-11-14 | Phase 1 (Proto & Contracts) | `COMPLETED` | `proto/commerce/v1/ordering.proto`, `libs/contracts/src/commerce/ordering.grpc.ts` | Antigravity AI |
| 2026-11-14 | Phase 2 (Commerce Core) | `COMPLETED` | `ordering.repository.ts`, `ordering.service.ts`, `ordering.grpc.controller.ts` | Antigravity AI |
| 2026-11-14 | Phase 3 (Gateway HTTP) | `COMPLETED` | `admin-orders.controller.ts`, `ordering.module.ts`, `ordering-grpc.client.ts`, `ordering.dto.ts`, `ordering.swagger.ts` | Antigravity AI |
| 2026-11-14 | Phase 4 (Verification & Tests) | `COMPLETED` | 14/14 unit tests PASS, proto check OK, boundaries 0 issues, typecheck 0 errors, build OK | Antigravity AI |
