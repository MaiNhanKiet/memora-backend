# Plan: Commerce Service Claims Service Quotes (ORDER-024, ORDER-025)

## 1. Context & Business Scope
Theo tài liệu kiến trúc [MEMORA_API_MASTER_SPECIFICATION_v1.0_AGENT.md](file:///d:/BTFPT/DoAn/Source/memora-backend/docs/duypq/MEMORA_API_MASTER_SPECIFICATION_v1.0_AGENT.md):
- **ORDER-024 (`GET /api/v1/claims/:claimId/quotes`)**: Khách hàng xem danh sách báo giá dịch vụ (bảo hành, sửa chữa, đánh bóng...) gắn liền với một khiếu nại/yêu cầu hậu mãi (`claimId`). Các báo giá này có `quote_type = 'SERVICE'` trong bảng `ordering.quotes`.
- **ORDER-025 (`POST /api/v1/claims/:claimId/quotes/:quoteId/accept`)**: Khách hàng chấp nhận báo giá dịch vụ hậu mãi. Trạng thái quote chuyển từ `ISSUED` sang `ACCEPTED`, cập nhật `accepted_by_customer_identity_id` và `accepted_at`.

Cả 2 API này thao tác trực tiếp trên bảng `ordering.quotes` và `ordering.quote_items` của schema `ordering` trong `commerce-service` database. Không phụ thuộc cổng thanh toán bên thứ ba PayOS.

---

## 2. API Contract & Data Mapping

### 2.1. ORDER-024: GET /api/v1/claims/:claimId/quotes
- **Path**: `/api/v1/claims/:claimId/quotes`
- **Method**: `GET`
- **Auth**: Customer (`@Roles('CUSTOMER')`, `@CurrentUser() principal: AuthenticatedPrincipal`)
- **Query / Params**: `claimId: string` (UUID)
- **Response**: Array of `FullQuoteDetailDto` (hoặc `{ quotes: FullQuoteDetailDto[] }`), mỗi phần tử bao gồm:
  - `id`, `quoteNo`, `claimId`, `orderId`, `quoteType` (SERVICE), `versionNo`, `status` (DRAFT, ISSUED, ACCEPTED, REJECTED, EXPIRED), `subtotalAmount`, `deliveryAmount`, `adjustmentAmount`, `totalAmount`, `currency`, `validUntil`, `issuedAt`, `acceptedAt`, `createdAt`, và danh sách `items` (`QuoteLineItemDto[]`).
- **Authorization / Invariants**:
  - Tra cứu các record trong `ordering.quotes` có `claim_id = claimId`.
  - Nếu quote có liên kết đơn hàng hoặc customer, kiểm tra quyền sở hữu của customer (hoặc cho phép tra cứu theo claimId của customer).

### 2.2. ORDER-025: POST /api/v1/claims/:claimId/quotes/:quoteId/accept
- **Path**: `/api/v1/claims/:claimId/quotes/:quoteId/accept`
- **Method**: `POST`
- **Auth**: Customer (`@Roles('CUSTOMER')`, `@CurrentUser() principal: AuthenticatedPrincipal`)
- **Params**: `claimId: string`, `quoteId: string`
- **Body**: Trống hoặc `{ note?: string }`
- **Response**: `{ success: boolean; quoteId: string; status: 'ACCEPTED'; acceptedAt: string }`
- **Business Invariants**:
  - Quote phải tồn tại, có `id = quoteId` và `claim_id = claimId`.
  - Quote phải có `quote_type = 'SERVICE'`.
  - Quote phải đang ở trạng thái `ISSUED` (hoặc hợp lệ để accept; nếu đã `ACCEPTED` thì idempotent hoặc báo lỗi; nếu đã `EXPIRED` / `REJECTED` thì trả về `400 Bad Request`).
  - Kiểm tra `valid_until`: nếu đã quá hạn `valid_until < now()`, từ chối chấp nhận (`Quote has expired`).
  - Cập nhật quote: `status = 'ACCEPTED'`, `accepted_by_customer_identity_id = customerActor.customerIdentityId`, `accepted_at = new Date()`.

---

## 3. Architecture & File Placement

Tuân thủ nghiêm ngặt quy tắc [13-business-service-structure.md](file:///d:/BTFPT/DoAn/Source/memora-backend/.agents/rules/13-business-service-structure.md) và Tech Lead benchmark (`iam-service`):

### 3.1. Protobuf & Handwritten gRPC Contracts
- **`proto/commerce/v1/ordering.proto`**:
  - RPC `ListClaimQuotes (ListClaimQuotesRequest) returns (ListClaimQuotesResponse);`
  - RPC `AcceptServiceQuote (AcceptServiceQuoteRequest) returns (AcceptServiceQuoteResponse);`
  - Thêm messages:
    - `message ListClaimQuotesRequest { string claim_id = 1; common.v1.VerifiedActor actor = 2; }`
    - `message ListClaimQuotesResponse { repeated FullQuoteDetail quotes = 1; }`
    - `message AcceptServiceQuoteRequest { string claim_id = 1; string quote_id = 2; common.v1.VerifiedActor actor = 3; }`
    - `message AcceptServiceQuoteResponse { bool success = 1; string quote_id = 2; string status = 3; string accepted_at = 4; }`
- **`libs/contracts/src/commerce/ordering.grpc.ts`**:
  - Export types và interface methods cho `ListClaimQuotes` và `AcceptServiceQuote`.

### 3.2. Commerce Service (Business Core)
- **`apps/commerce-service/src/repositories/ordering.repository.ts`**:
  - `findClaimQuotes(claimId: string): Promise<QuoteWithItems[]>`
  - `acceptClaimQuote(claimId: string, quoteId: string, customerIdentityId: string): Promise<quotes>` (sử dụng transaction, atomic update kiểm tra trạng thái và hạn dùng).
- **`apps/commerce-service/src/application/ordering/ordering.service.ts`**:
  - Triển khai `listClaimQuotes(req)`: parse actor bằng `parseVerifiedActor`, gọi repository, map dữ liệu ra protobuf format.
  - Triển khai `acceptServiceQuote(req)`: parse actor bằng `requireCustomerIdentity`, gọi repository cập nhật, trả kết quả.
- **`apps/commerce-service/src/presentation/grpc/ordering.grpc.controller.ts`**:
  - Thêm 2 gRPC methods `@GrpcMethod('OrderingService', 'ListClaimQuotes')` và `@GrpcMethod('OrderingService', 'AcceptServiceQuote')`.

### 3.3. API Gateway
- **`apps/api-gateway/src/modules/ordering/clients/ordering-grpc.client.ts`**:
  - Thêm 2 methods: `listClaimQuotes(claimId, actor)` và `acceptServiceQuote(claimId, quoteId, actor)`.
- **`apps/api-gateway/src/modules/ordering/controllers/claim-quotes.controller.ts`** (Tạo mới theo feature `claims/quotes`):
  - `@Controller('api/v1/claims')`
  - `@Get(':claimId/quotes')` -> `@Roles('CUSTOMER')`, gọi client `listClaimQuotes` với `toVerifiedActor(principal)`.
  - `@Post(':claimId/quotes/:quoteId/accept')` -> `@Roles('CUSTOMER')`, gọi client `acceptServiceQuote` với `toVerifiedActor(principal)`.
- **`apps/api-gateway/src/modules/ordering/docs/claim-quotes.swagger.ts`**:
  - Swagger decorators `@ApiTags('Claims')`, `@ApiOperation`, `@ApiResponse` cho 2 endpoints.
- **`apps/api-gateway/src/modules/ordering/dto/claim-quotes.dto.ts`**:
  - DTOs response & swagger schemas.
- **`apps/api-gateway/src/modules/ordering/ordering.module.ts`**:
  - Khai báo `ClaimQuotesController` vào `controllers`.

---

## 4. Verification & Testing Gate
1. `npm run proto:check`: Verify protobuf files.
2. `npm run typecheck`: Strict TypeScript compile pass 100%.
3. `npm run boundaries`: Zero boundary violations across monorepo.
4. Unit tests: Viết tests kiểm thử `ordering.service.spec.ts` cho 2 RPC mới (happy path, quote not found, quote expired, quote wrong type, forbidden actor).
5. Build test: `npx nest build commerce-service` và `npx nest build api-gateway`.
