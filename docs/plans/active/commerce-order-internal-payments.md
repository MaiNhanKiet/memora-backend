# MEMORA — Commerce Internal Payments, Receipts & Invoices API Plan

> **Mục đích:** Kế hoạch chi tiết triển khai nhóm **API thuần nội bộ 100% không phụ thuộc bên thứ 3** (`commerce-service`, PostgreSQL schema `ordering`) trên nhánh `DuyPQ` theo `.agents/rules/13-business-service-structure.md`, `05-techlead-code-style.md`, `22-iam-auth-security.md` và skill `plan-api`.
>
> **Trạng thái:** `APPROVED` — Đã được Chủ dự án / Tech Lead phê duyệt triển khai.

---

## 1. Metadata & Scope

| Trường thông tin | Giá trị quy định |
| :--- | :--- |
| **Repository** | `memora-backend` |
| **Branch** | `DuyPQ` |
| **Domain / Feature** | `ordering` / `commerce-order-internal-payments` |
| **HTTP Owner** | `apps/api-gateway` (`src/modules/ordering/`) |
| **Business / DB Owner** | `apps/commerce-service` (PostgreSQL schema `ordering`) |
| **File Plan Path** | `docs/plans/active/commerce-order-internal-payments.md` |
| **Plan Status** | `APPROVED` |
| **Commit Rule (Bắt buộc)** | **TUYỆT ĐỐI KHÔNG TỰ COMMIT**: Giữ nguyên working tree để người dùng tự kiểm tra và commit |
| **APIs đề xuất** | `ORDER-017`, `ORDER-018`, `ORDER-021`, `ORDER-022`, `ORDER-023` (và tùy chọn `ORDER-024`, `ORDER-025`) |
| **Loại bỏ / Trì hoãn** | `ORDER-016`, `ORDER-019`, `ORDER-020`, `ORDER-026` (Phụ thuộc vào PayOS API/Webhook bên thứ 3) |
| **Ngày lập kế hoạch** | 2026-11-15 |
| **Tác giả** | Antigravity AI Assistant |

---

## 2. Invariants & Kiến trúc cốt lõi

1. **Tính độc lập 100% (Zero 3rd-party Dependency):**
   - Tất cả các endpoint trong nhóm này chỉ truy xuất và thao tác trên các bảng nội bộ `payment_transactions`, `orders`, `quotes`, `payment_item_allocations` của `commerce-service`.
   - Không gọi bất kỳ HTTP endpoint hay SDK bên thứ 3 nào.
2. **Bảo toàn Ranh giới Kiến trúc (Gateway vs Service):**
   - **API Gateway**: Chỉ đón nhận HTTP REST, xác thực Token JWT / Guest session, trích xuất actor qua `toVerifiedActor(principal)`, validate DTO qua `class-validator`, Swagger docs độc lập, gọi gRPC client. Không query Prisma trực tiếp.
   - **Commerce Service**: Độc quyền truy xuất Prisma DB, thực thi transaction, sinh mã hóa đơn/biên lai (`receipt_no`, `invoice_no`), kiểm tra quyền sở hữu order/transaction.
3. **Actor Security & Phân quyền:**
   - Khách hàng (`CUSTOMER` / `VERIFIED_GUEST`): Chỉ được tra cứu giao dịch, biên lai, hóa đơn của đơn hàng do chính mình sở hữu (`owner_customer_identity_id` hoặc `guest_email`).
   - Nhân viên quản trị (`STORE_STAFF`, `STORE_MANAGER`, `ADMIN`): Được tra cứu toàn hệ thống và được quyền lập phiếu yêu cầu hoàn tiền (`ORDER-023`).

---

## 3. API Inventory Chi tiết

| API ID | Method | Endpoint | Actor / Quyền | Mục đích nghiệp vụ | Database Tables | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ORDER-017** | `GET` | `/api/v1/orders/:orderId/payments` | Customer (Own) / Staff | Xem lịch sử toàn bộ các lần thanh toán / hoàn tiền của đơn hàng | `payment_transactions`, `orders` | `AWAITING_APPROVAL` |
| **ORDER-018** | `GET` | `/api/v1/orders/:orderId/payments/:transactionId` | Customer (Own) / Staff | Tra cứu chi tiết một giao dịch cụ thể (mã giao dịch, số tiền, mốc P1/P2/P3, trạng thái PENDING/SUCCEEDED/FAILED) | `payment_transactions`, `orders` | `AWAITING_APPROVAL` |
| **ORDER-021** | `GET` | `/api/v1/orders/:orderId/payments/:transactionId/receipt` | Customer (Own) / Staff | Lấy biên lai thanh toán điện tử bất biến (Immutable Payment Receipt) phục vụ đối soát và xuất file | `payment_transactions`, `orders` | `AWAITING_APPROVAL` |
| **ORDER-022** | `GET` | `/api/v1/orders/:orderId/invoice` | Customer (Own) / Staff | Lấy hóa đơn mua hàng / Hóa đơn điện tử của đơn hàng (bóc tách thuế, phụ phí, tổng số tiền đã đóng) | `orders`, `quotes`, `payment_transactions` | `AWAITING_APPROVAL` |
| **ORDER-023** | `POST` | `/api/v1/admin/payments/:transactionId/refund-requests` | Staff / Manager (`@Roles(...)`) | Lập phiếu yêu cầu hoàn tiền nội bộ (tạo transaction REFUND liên kết với transaction gốc chờ phê duyệt) | `payment_transactions` | `AWAITING_APPROVAL` |

---

## 4. Quyết định Kỹ thuật (Technical Decisions — D1 đến D5)

| ID | Vấn đề | Quyết định kỹ thuật |
| :--- | :--- | :--- |
| **D1** | **Cơ chế sinh mã Biên lai điện tử (`receipt_no`)** | Khi một giao dịch thanh toán thành công, hệ thống gán `receipt_no = REC-<order_no>-<stage>-<timestamp_suffix>`. Dữ liệu biên lai là bất biến (immutable). |
| **D2** | **Cơ chế sinh mã Hóa đơn đơn hàng (`invoice_no`)** | Đơn hàng khi có yêu cầu lấy hóa đơn lần đầu (hoặc khi hoàn tất thanh toán) sẽ được gán `invoice_no = INV-<order_no>` và `invoice_issued_at = now()`. |
| **D3** | **Cấu trúc dữ liệu Hóa đơn (`ORDER-022`)** | Hóa đơn tổng hợp gồm: Thông tin khách hàng, chi tiết sản phẩm nhẫn, bóc tách dòng chi phí (Final Quote items), tổng số tiền đã thanh toán (tổng amount của các transaction `SUCCEEDED`), và số tiền còn lại phải thanh toán. |
| **D4** | **Quản lý Yêu cầu Hoàn tiền (`ORDER-023`)** | Chỉ cho phép tạo hoàn tiền với transaction gốc có `status = 'SUCCEEDED'` và `transaction_type = 'PAYMENT'`. Bản ghi hoàn tiền mới được tạo với `transaction_type = 'REFUND'`, `related_transaction_id = original.id`, `status = 'PENDING'`, lưu lý do hoàn tiền vào `metadata_json`. |
| **D5** | **Bảo mật quyền truy cập** | Sử dụng `toVerifiedActor` tại Gateway và `parseVerifiedActor` tại Service. Nếu actor là Customer, kiểm tra `order.owner_customer_identity_id === actor.userId`. |

---

## 5. Đặc tả Payload & gRPC Mapping

### 1. `ORDER-017` — GET `/api/v1/orders/:orderId/payments`
- **Response (200 OK):**
  ```json
  {
    "orderId": "d1a2b3c4-e5f6-7f8a-9b0c-1d2e3f4a5b6c",
    "totalPaidAmount": 15000000,
    "currency": "VND",
    "payments": [
      {
        "id": "t1a2b3c4-e5f6-7f8a-9b0c-1d2e3f4a5b6c",
        "paymentStage": "P1",
        "transactionType": "PAYMENT",
        "amount": 4500000,
        "currency": "VND",
        "status": "SUCCEEDED",
        "provider": "PAYOS",
        "paymentMethod": "PAYOS",
        "requestedAt": "2026-11-15T04:00:00.000Z",
        "completedAt": "2026-11-15T04:05:00.000Z",
        "receiptNo": "REC-ORD-123-P1-A1"
      }
    ]
  }
  ```

### 2. `ORDER-018` — GET `/api/v1/orders/:orderId/payments/:transactionId`
- **Response (200 OK):** Chi tiết đầy đủ của 1 giao dịch, bao gồm cả lý do thất bại (nếu FAILED) hoặc metadata bổ sung.

### 3. `ORDER-021` — GET `/api/v1/orders/:orderId/payments/:transactionId/receipt`
- **Response (200 OK):**
  ```json
  {
    "receiptNo": "REC-ORD-123-P1-A1",
    "transactionId": "t1a2b3c4-e5f6-7f8a-9b0c-1d2e3f4a5b6c",
    "orderId": "d1a2b3c4-e5f6-7f8a-9b0c-1d2e3f4a5b6c",
    "orderNo": "ORD-20261115-A1B2",
    "paymentStage": "P1",
    "amount": 4500000,
    "currency": "VND",
    "paymentMethod": "PAYOS",
    "completedAt": "2026-11-15T04:05:00.000Z",
    "recipientName": "Nguyen Van A",
    "issuedAt": "2026-11-15T04:05:00.000Z"
  }
  ```

### 4. `ORDER-022` — GET `/api/v1/orders/:orderId/invoice`
- **Response (200 OK):**
  ```json
  {
    "invoiceNo": "INV-ORD-20261115-A1B2",
    "orderId": "d1a2b3c4-e5f6-7f8a-9b0c-1d2e3f4a5b6c",
    "orderNo": "ORD-20261115-A1B2",
    "issuedAt": "2026-11-15T09:00:00.000Z",
    "totalAmount": 15000000,
    "totalPaidAmount": 15000000,
    "remainingAmount": 0,
    "currency": "VND",
    "recipientName": "Nguyen Van A",
    "recipientPhone": "0901234567",
    "deliveryAddressJson": "{\"street\":\"123 Le Loi\"}",
    "items": [
      {
        "componentType": "GOLD_MATERIAL",
        "description": "18K Gold Setting",
        "quantity": 1,
        "lineAmount": 8500000
      }
    ],
    "paymentTransactions": [
      {
        "paymentStage": "P1",
        "amount": 4500000,
        "completedAt": "2026-11-15T04:05:00.000Z"
      }
    ]
  }
  ```

### 5. `ORDER-023` — POST `/api/v1/admin/payments/:transactionId/refund-requests`
- **Request Body:**
  ```json
  {
    "refundAmount": 4500000,
    "reason": "Khách hàng yêu cầu hủy đơn hợp lệ trước gia công xưởng",
    "notes": "Đã duyệt bởi Quản lý cửa hàng"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "refundTransactionId": "r1a2b3c4-e5f6-7f8a-9b0c-1d2e3f4a5b6c",
    "originalTransactionId": "t1a2b3c4-e5f6-7f8a-9b0c-1d2e3f4a5b6c",
    "orderId": "d1a2b3c4-e5f6-7f8a-9b0c-1d2e3f4a5b6c",
    "refundAmount": 4500000,
    "currency": "VND",
    "status": "PENDING",
    "requestedAt": "2026-11-15T10:00:00.000Z",
    "reason": "Khách hàng yêu cầu hủy đơn hợp lệ trước gia công xưởng"
  }
  ```

---

## 6. Danh sách File dự kiến tạo / sửa đổi

1. `docs/plans/active/commerce-order-internal-payments.md` (Tài liệu Plan này)
2. `proto/commerce/v1/ordering.proto` (Thêm 5 RPCs: `ListOrderPayments`, `GetOrderPaymentById`, `GetPaymentReceipt`, `GetOrderInvoice`, `CreateRefundRequest`)
3. `libs/contracts/src/commerce/ordering.grpc.ts` (Types & interfaces gRPC)
4. `apps/commerce-service/src/repositories/ordering.repository.ts` (Queries bảng `payment_transactions`, `orders`, `quotes`)
5. `apps/commerce-service/src/application/ordering/ordering.service.ts` (Business logic, actor checking, tính toán số tiền đã nạp)
6. `apps/commerce-service/src/presentation/grpc/ordering.grpc.controller.ts` (gRPC Controller handlers)
7. `apps/api-gateway/src/modules/ordering/clients/ordering-grpc.client.ts` (Gateway gRPC Client wrapper)
8. `apps/api-gateway/src/modules/ordering/dto/ordering.dto.ts` (DTOs & validation)
9. `apps/api-gateway/src/modules/ordering/docs/ordering.swagger.ts` (Swagger documentation)
10. `apps/api-gateway/src/modules/ordering/controllers/orders.controller.ts` (Customer endpoints: payments, receipt, invoice)
11. `apps/api-gateway/src/modules/ordering/controllers/admin-payments.controller.ts` (Admin refund request endpoint)
12. `apps/api-gateway/src/modules/ordering/ordering.module.ts` (Đăng ký AdminPaymentsController)
13. `apps/commerce-service/src/application/ordering/ordering.service.spec.ts` (Unit tests bao phủ 100%)

---

## 7. Tiêu chuẩn Kiểm thử & Xác minh (Verification Checklist)

- [x] **Proto Check:** `npm run proto:check` $\rightarrow$ PASS 100%.
- [x] **TypeScript Typecheck:** `npm run typecheck` $\rightarrow$ PASS không có lỗi kiểu dữ liệu.
- [x] **Architectural Boundaries Check:** `npm run boundaries` $\rightarrow$ PASS (376 files, 0 finding).
- [x] **Service Unit Tests:** `npx jest apps/commerce-service/` $\rightarrow$ PASS toàn bộ 115/115 tests (riêng `ordering.service.spec.ts` đạt 52/52 tests).
- [x] **NestJS Build:** `commerce-service` và `api-gateway` đều compiled successfully với webpack.
- [ ] **Người dùng kiểm tra và tự thực hiện Git Commit:** Giữ nguyên working tree để người dùng commit.

