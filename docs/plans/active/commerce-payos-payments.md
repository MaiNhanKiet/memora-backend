# Plan: Commerce Service PayOS Payments Integration (ORDER-016, 019, 020, 026)

## 1. Context & Business Scope
Theo tài liệu chuẩn [MEMORA_API_MASTER_SPECIFICATION_v1.0_AGENT.md](file:///d:/BTFPT/DoAn/Source/memora-backend/docs/duypq/MEMORA_API_MASTER_SPECIFICATION_v1.0_AGENT.md):
- **ORDER-016 (`POST /api/v1/orders/:orderId/payments`)**: Khách hàng tạo link thanh toán VietQR PayOS cho đơn hàng:
  - Nếu đơn hàng cá nhân hóa:
    - Đợt 1 (**P1 - 30%**): Khi `order.status = 'AWAITING_P1'` (ước tính theo báo giá ban đầu).
    - Đợt 2 (**P2 - 40%**): Khi `order.status = 'AWAITING_P2'` (sau khi khách duyệt Final Quote).
    - Đợt 3 (**P3 - 30%**): Khi `order.status = 'AWAITING_P3'` hoặc trước khi giao hàng / nhận hàng tại quầy.
  - Nếu đơn hàng All-NONE (không cá nhân hóa): Thanh toán 100% (hoặc theo báo giá chốt).
  - Trả về: `checkoutUrl`, `qrCode`, `orderCode`, `paymentStage`, `amount`, `status: 'PENDING'`.
- **ORDER-019 (`POST /api/v1/payments/payos/webhook`)**: Nhận Webhook callback từ PayOS khi khách thanh toán thành công:
  - Xác thực chữ ký webhook bằng `PAYOS_CHECKSUM_KEY` (HMAC_SHA256).
  - Cập nhật record `ordering.payment_transactions` tương ứng sang `SUCCEEDED`, lưu `completed_at`, `provider_transaction_id`.
  - Tự động chuyển trạng thái đơn hàng (`orders.status`):
    - Đã trả P1 -> chuyển sang `PENDING_FINAL_QUOTE` (hoặc mở khóa cho cá nhân hóa).
    - Đã trả P2 -> chuyển sang `MANUFACTURING`.
    - Đã trả P3 -> hoàn tất nghĩa vụ thanh toán (`COMPLETED` hoặc sẵn sàng bàn giao).
  - Nếu là thanh toán Claim (`quote_type = 'SERVICE'`) -> đánh dấu dịch vụ đã thanh toán.
- **ORDER-020 (`POST /api/v1/payments/:transactionId/reconcile`)**: Đối soát chủ động với PayOS:
  - Gọi API PayOS `getPaymentLinkInformation` dựa trên `provider_order_code`.
  - Nếu PayOS báo `PAID` mà database vẫn `PENDING`, tự động cập nhật như luồng Webhook.
- **ORDER-026 (`POST /api/v1/claims/:claimId/payments`)**: Khách hàng tạo link thanh toán PayOS cho chi phí dịch vụ hậu mãi/bảo hành:
  - Dựa trên quote dịch vụ đã được chấp nhận (`quotes.status = 'ACCEPTED'`).
  - Tạo link PayOS với số tiền bằng `quote.total_amount`.

---

## 2. Technical Architecture & Component Design

Tuân thủ kiến trúc nhiều tầng ([13-business-service-structure.md](file:///d:/BTFPT/DoAn/Source/memora-backend/.agents/rules/13-business-service-structure.md)):

```
[ Client / Webhook ]
        │ HTTP
        ▼
[ API Gateway ]
  ├── OrdersController (ORDER-016: POST /api/v1/orders/:orderId/payments)
  ├── PaymentsWebhookController (ORDER-019: POST /api/v1/payments/payos/webhook)
  ├── AdminPaymentsController (ORDER-020: POST /api/v1/admin/payments/:transactionId/reconcile)
  └── ClaimQuotesController / ClaimsPaymentController (ORDER-026: POST /api/v1/claims/:claimId/payments)
        │ gRPC (OrderingService)
        ▼
[ Commerce Service ]
  ├── presentation/grpc/ordering.grpc.controller.ts
  ├── application/ordering/ordering.service.ts
  │     ├── createOrderPaymentLink(req)
  │     ├── handlePayosWebhook(payload)
  │     ├── reconcilePaymentTransaction(req)
  │     └── createClaimPaymentLink(req)
  ├── infrastructure/payment/payos.provider.ts (Đóng gói giao tiếp PayOS SDK / REST API & verify signature)
  └── repositories/ordering.repository.ts (Quản lý payment_transactions & atomic state transition)
```

---

## 3. Detailed Data & Protocol Specification

### 3.1. Protobuf (`proto/commerce/v1/ordering.proto`)
Thêm các RPCs:
```protobuf
rpc CreateOrderPaymentLink (CreateOrderPaymentLinkRequest) returns (PaymentLinkResponse);
rpc ProcessPayosWebhook (PayosWebhookRequest) returns (PayosWebhookResponse);
rpc ReconcilePaymentTransaction (ReconcilePaymentTransactionRequest) returns (PaymentTransactionDetail);
rpc CreateClaimPaymentLink (CreateClaimPaymentLinkRequest) returns (PaymentLinkResponse);
```

Messages:
- `CreateOrderPaymentLinkRequest`: `order_id`, `payment_stage` (optional, tự suy luận theo trạng thái đơn nếu không truyền), `return_url`, `cancel_url`, `actor`.
- `PaymentLinkResponse`: `transaction_id`, `order_code`, `checkout_url`, `qr_code`, `amount`, `currency`, `payment_stage`, `status`.
- `PayosWebhookRequest`: `raw_body`, `signature` (hoặc JSON payload đã decode kèm signature).
- `PayosWebhookResponse`: `success`, `message`.
- `ReconcilePaymentTransactionRequest`: `transaction_id`, `actor`.
- `CreateClaimPaymentLinkRequest`: `claim_id`, `return_url`, `cancel_url`, `actor`.

### 3.2. PayOS Provider (`apps/commerce-service/src/infrastructure/payment/payos.provider.ts`)
- Quản lý config: `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`.
- Nếu thiếu config môi trường (hoặc dev/mock mode), hỗ trợ chế độ Dev Simulator / Graceful mock để CI/CD và Unit Test không bị block.
- Sinh `orderCode`: Số nguyên dương an toàn (`Date.now() % 9007199254740991` hoặc sequence duy nhất).
- Tính toán checksum HMAC_SHA256 theo chuẩn PayOS để verify webhook.

---

## 4. Planned Files to Create & Modify

1. **Protobuf & Contracts**:
   - `proto/commerce/v1/ordering.proto` (thêm 4 RPCs & messages)
   - `libs/contracts/src/commerce/ordering.grpc.ts` (thêm types & interfaces)
2. **Commerce Service**:
   - `apps/commerce-service/src/infrastructure/payment/payos.provider.ts` (Tạo mới)
   - `apps/commerce-service/src/infrastructure/payment/payos.interface.ts` (Tạo mới)
   - `apps/commerce-service/src/repositories/ordering.repository.ts` (thêm methods quản lý payment_transactions và atomic updates)
   - `apps/commerce-service/src/application/ordering/ordering.service.ts` (triển khai logic 4 RPCs)
   - `apps/commerce-service/src/presentation/grpc/ordering.grpc.controller.ts` (gRPC handlers)
   - `apps/commerce-service/src/application/ordering/ordering.service.spec.ts` (unit tests cho cả 4 luồng)
3. **API Gateway**:
   - `apps/api-gateway/src/modules/ordering/clients/ordering-grpc.client.ts` (thêm 4 client methods)
   - `apps/api-gateway/src/modules/ordering/dto/payments.dto.ts` (Tạo mới hoặc bổ sung DTOs)
   - `apps/api-gateway/src/modules/ordering/docs/payments.swagger.ts` (Swagger docs)
   - `apps/api-gateway/src/modules/ordering/controllers/orders.controller.ts` (thêm `POST :orderId/payments`)
   - `apps/api-gateway/src/modules/ordering/controllers/payments-webhook.controller.ts` (Tạo mới cho webhook `POST /api/v1/payments/payos/webhook`)
   - `apps/api-gateway/src/modules/ordering/controllers/admin-payments.controller.ts` (thêm endpoint `POST :transactionId/reconcile`)
   - `apps/api-gateway/src/modules/ordering/controllers/claim-quotes.controller.ts` (thêm `POST :claimId/payments`)
   - `apps/api-gateway/src/modules/ordering/ordering.module.ts` (đăng ký `PaymentsWebhookController`)

---

## 5. Verification Gate
1. `npm run proto:check`: Verify protobuf syntax.
2. `npm run typecheck`: 0 lỗi strict TypeScript.
3. `npm run boundaries`: 0 vi phạm kiến trúc.
4. Unit tests: Chạy toàn bộ test suites trong `ordering.service.spec.ts`.
5. Build test: `npx nest build commerce-service` và `npx nest build api-gateway`.
