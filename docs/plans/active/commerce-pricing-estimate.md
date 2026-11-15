# MEMORA — Commerce Pricing Estimate API Plan (APPROVED)

> **Mục đích:** Kế hoạch chi tiết để triển khai API tính giá tạm tính thời gian thực **PRICI-001** (`commerce-service`) cho màn hình 3D Configurator trên nhánh `DuyPQ` theo `.cursor/skills/plan-api`, `implement-api`.
>
> **Trạng thái:** `APPROVED` — Chủ dự án đã phê duyệt ngày 2026-11-14.

---

## 1. Metadata & Approval Record

| Trường | Giá trị |
| --- | --- |
| Repository | `memora-backend` |
| Branch | `DuyPQ` |
| Domain / feature | `pricing` / `commerce-pricing-estimate` |
| HTTP owner | `apps/api-gateway` (`src/modules/pricing/`) |
| Business / DB owner | `apps/commerce-service` (PostgreSQL schema `pricing`, `catalog`) |
| File path trong repo | `docs/plans/active/commerce-pricing-estimate.md` |
| Plan status | `APPROVED` |
| Approval decision | `APPROVED` — D1–D4 và PRICI-001 |
| Approved API IDs | `PRICI-001` |
| Excluded / Deferred | `PRICI-002..PRICI-004` (Admin Pricing Management APIs — thuộc plan quản trị riêng) |
| Date prepared | 2026-11-14 |
| Approver | Chủ dự án MEMORA |

### Invariants cam kết theo kiến trúc MEMORA

1. **Ranh giới Gateway vs Service:** Gateway chỉ nhận HTTP request, validate dữ liệu đầu vào bằng `class-validator`, gọi gRPC sang `commerce-service` và trả về chuẩn success envelope `{ statusCode, message, data }`. Toàn bộ logic nghiệp vụ tính giá, truy vấn `price_items`, `price_versions`, `pricing_rules` nằm tại `commerce-service`. Tuyệt đối không import hay query Prisma từ Gateway.
2. **Quyết định D19 (Pricing Simplification):** Schema `pricing` gồm 3 bảng (`price_items`, `price_versions`, `pricing_rules`). Không tính phí `DIGITAL_MEMORY` (gói Digital Memory miễn phí cho khách chọn Fingerprint / Soundwave theo BM04).
3. **Quyết định D32 (Microservice Boundary):** Không tạo Prisma `@relation` hay foreign key vật lý sang các service khác (IAM, Operations, Experience). Chỉ dùng UUID logical references.
4. **Quyền truy cập Public:** `POST /api/v1/pricing/estimates` là public endpoint (không bắt buộc JWT), cho phép khách vãng lai (Guest) và khách đã đăng nhập đều xem được giá thay đổi thời gian thực trên màn hình 3D.
5. **Độ an toàn giá (Version & Active Check):** Chỉ áp dụng giá từ `price_versions` và `pricing_rules` có `status = 'ACTIVE'` và nằm trong khoảng `effective_from` -> `effective_to` hợp lệ.

---

## 2. API Inventory

| API ID | Method | Endpoint | Mục đích | Auth / RBAC | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| **PRICI-001** | `POST` | `/api/v1/pricing/estimates` | Tính giá ước tính thời gian thực (phôi + đá + cá nhân hóa + resize fee) | Public / None | `PROPOSED` |

---

## 3. Approval Decisions — D1 đến D4 cho Pricing Estimate

| ID | Quyết định | Trạng thái |
| --- | --- | --- |
| **D1** | **Công thức cấu thành giá:** $\text{estimatedTotal} = \text{baseBlankPrice} + \text{gemstonesPrice} + \text{personalizationFee} + \text{resizeFee}$. Chi tiết từng khoản mục được trả về trong object `breakdown`. | `PROPOSED` |
| **D2** | **Cơ chế tính Resize Fee:** Đọc từ `pricing.pricing_rules` có `rule_type = 'RESIZE_FEE'`, `template_variant_id = variant.id`, `resize_direction = 'UP' \| 'DOWN'`, `status = 'ACTIVE'`. Phí được tính theo công thức trong `config_json` (ví dụ: `base_fee + delta * fee_per_unit_delta`). Nếu không có rule riêng cho variant, `resizeFee = 0`. | `PROPOSED` |
| **D3** | **Cơ chế định danh vật phẩm định giá:** `price_items` liên kết 1-1 với `template_variants` (cho `RING_BLANK`), `gemstone_options` (cho `GEMSTONE`), và chuỗi mã gói (cho `PERSONALIZATION`). | `PROPOSED` |
| **D4** | **Phân biệt Estimate vs Final Quote:** Giá ước tính từ API này mang tính tham khảo thời gian thực cho khách, chưa phải là Báo giá cuối khóa cố định (`quotes.quotes`). Không sinh transaction hay khóa hàng tồn kho tại bước này. | `PROPOSED` |

---

## 4. API Contract Chi tiết — [PRICI-001]

### Request HTTP
- **Endpoint:** `POST /api/v1/pricing/estimates`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "templateVariantId": "v1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    "targetSize": 13.0,
    "gemstoneOptionIds": [
      "g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c"
    ],
    "personalizationPackage": "SOUNDWAVE"
  }
  ```

### Response HTTP (200 OK)
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "estimatedTotal": 15500000.00,
    "currency": "VND",
    "estimatedAt": "2026-11-14T03:35:00.000Z",
    "breakdown": {
      "baseBlankPrice": 8000000.00,
      "gemstonesPrice": 6500000.00,
      "personalizationFee": 800000.00,
      "resizeFee": 200000.00
    },
    "gemstoneLineItems": [
      {
        "gemstoneOptionId": "g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
        "price": 6500000.00
      }
    ]
  }
}
```

### Response HTTP khi cấu hình lỗi (404 / 422)
- `404 Not Found`: Khi không tìm thấy `templateVariantId` đang `ACTIVE` hoặc không có phiên bản giá `ACTIVE` tương ứng.
- `422 Unprocessable Entity`: Khi `targetSize` nằm ngoài biên độ cho phép của variant.

### gRPC Contract
```protobuf
syntax = "proto3";

package commerce.v1;

service PricingService {
  rpc EstimatePrice (EstimatePriceRequest) returns (EstimatePriceResponse);
}

message EstimatePriceRequest {
  string template_variant_id = 1;
  double target_size = 2;
  repeated string gemstone_option_ids = 3;
  string personalization_package = 4;
}

message PriceBreakdown {
  double base_blank_price = 1;
  double gemstones_price = 2;
  double personalization_fee = 3;
  double resize_fee = 4;
}

message GemstonePriceLineItem {
  string gemstone_option_id = 1;
  double price = 2;
}

message EstimatePriceResponse {
  double estimated_total = 1;
  string currency = 2;
  string estimated_at = 3;
  PriceBreakdown breakdown = 4;
  repeated GemstonePriceLineItem gemstone_line_items = 5;
}
```

---

## 5. Implementation Sequence

1. **Phase 1: Contracts & Protobuf**
   - Tạo file `proto/commerce/v1/pricing.proto` với service `PricingService`.
   - Cập nhật `scripts/ci/check-protos.cjs`.
   - Tạo handwritten contract `libs/contracts/src/commerce/pricing.grpc.ts` và export qua `libs/contracts/src/index.ts`.
2. **Phase 2: Commerce Service Core**
   - Tạo `PricingRepository` trong `apps/commerce-service/src/repositories/pricing.repository.ts` (truy vấn `price_items`, `price_versions`, `pricing_rules`, `template_variants`).
   - Tạo `PricingService` trong `apps/commerce-service/src/application/pricing/pricing.service.ts` (thực hiện công thức D1, D2).
   - Tạo `PricingGrpcController` trong `apps/commerce-service/src/presentation/grpc/pricing.grpc.controller.ts` (bảo vệ bởi `CommerceInternalGrpcAuthGuard`).
   - Đăng ký `PricingModule` và cập nhật `COMMERCE_GRPC_PROTOS`.
3. **Phase 3: API Gateway Layer**
   - Tạo `PricingGrpcClient` tại `apps/api-gateway/src/modules/pricing/clients/pricing-grpc.client.ts`.
   - Tạo DTO request & response: `estimate-price.dto.ts`.
   - Tạo Swagger documentation & `PricingController`.
   - Đăng ký `PricingModule` vào `apps/api-gateway/src/app.module.ts`.
4. **Phase 4: Tests & Verification**
   - Chạy `npm run proto:check`
   - Chạy `npm run boundaries`
   - Chạy `npm run typecheck`
   - Chạy `npm run lint:check`
   - Chạy unit tests cho `PricingService`.

---

## 6. Implementation Progress Log

| Date | Step / Item | Status | Evidence | Checked by |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Plan Created | `APPROVED` | `docs/plans/active/commerce-pricing-estimate.md` | Antigravity AI |
| 2026-11-14 | Plan Approved | `APPROVED` | Chủ dự án phê duyệt lựa chọn A | DuyPQ |
| 2026-11-14 | Phase 1 (Proto & Contracts) | `COMPLETED` | `proto/commerce/v1/pricing.proto`, `libs/contracts/src/commerce/pricing.grpc.ts` | DuyPQ |
| 2026-11-14 | Phase 2 (Commerce Core) | `COMPLETED` | `PricingRepository`, `PricingService`, `PricingGrpcController` | DuyPQ |
| 2026-11-14 | Phase 3 (Gateway HTTP) | `COMPLETED` | `PricingController`, `PricingGrpcClient`, DTOs, Swagger Docs | DuyPQ |
| 2026-11-14 | Phase 4 (Verification & Tests) | `COMPLETED` | `proto:check` PASS, `boundaries` PASS (323 files, 0 findings), `typecheck` PASS, `lint:check` PASS, `jest` PASS (3 tests) | DuyPQ |
| 2026-11-14 | PRICI-001 | `COMPLETED` | POST /api/v1/pricing/estimates | DuyPQ |
