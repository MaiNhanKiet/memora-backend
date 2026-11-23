# Kế Hoạch Nghiệp Vụ: Cầu Nối Tự Động Commerce ➔ Memory & Tích Hợp Gói Bảo Trì Lifetime Polishing

## 1. Metadata

- **Branch:** `DuyPQ`
- **Domain:** `ordering`, `pricing`, `memory`
- **Services:** `commerce-service`, `experience-service`, `api-gateway`
- **Plan Status:** `APPROVED (Đã chuẩn hóa kiến trúc & sẵn sàng thực thi)`
- **Ngày cập nhật:** 2026-11-23
- **Tài liệu căn cứ:**
  - `docs/duypq/MAIN FLOW/MainFlow.md` (Baseline 4 Main Flows sau Review 2)
  - `docs/duypq/MAIN FLOW/MF01.md` (MF01-BR17, MF01-BR25..BR28, MF01-S04, MF01-S08)
  - `docs/duypq/MAIN FLOW/MF03.md` (Handover & Digital Memory Activation)
  - `docs/duypq/MEMORA_API_MASTER_SPECIFICATION_v1.0_AGENT.md` (Row 2, 6, 7 trong `4MF API ALIGNMENT`)
  - `apps/commerce-service/prisma/schema.prisma` & `apps/experience-service/prisma/schema.prisma`
  - `.agents/rules/` (`00-memora-core.md`, `13-business-service-structure.md`, `21-grpc-contracts.md`, `AGENTS.md`)

---

## 2. Bối Cảnh Nghiệp Vụ & Chuẩn Hóa Kiến Trúc (Architecture Standardization)

### 2.1. Đánh giá hiện trạng sau khi hoàn thành 80 API Commerce và 14 API Memory
- Toàn bộ **80 API Commerce** (`CATAL-001..021`, `PRICI-001..010`, `INVEN-001..013`, `DESIG-001..010`, `ORDER-001..026`) và **14 API Memory** (`MEMOR-001..014`) đã được triển khai đầy đủ về mặt khung hợp đồng và đạt 100% test automation E2E độc lập.
- Tuy nhiên, khi đối chiếu với tài liệu kinh doanh thực tế (4 Main Flows Baseline), tồn tại 2 khoảng trống nghiệp vụ liên thông:
  1. **Đứt gãy giữa Commerce và Memory:** Trong test suite `run-memory-e2e.ts`, bản ghi `memory_cards` phải chèn thủ công bằng câu lệnh SQL seed. Chưa có cơ chế để đơn hàng tự động sinh ra Thẻ Ký Ức cho khách hàng.
  2. **Thiếu gói bảo trì `LIFETIME_POLISHING`:** Dù Database schema đã có sẵn constraint hỗ trợ `MAINTENANCE_PLAN` trong `pricing.price_items` và `ordering.quote_items`, code ứng dụng chưa có trường chọn gói này trong Giỏ hàng/Đơn hàng và chưa tính tiền vào Báo giá.
  3. **Quy trình thiết kế Ký Ức (Memory Design) tại MF01:** Khách hàng opt-in `memory_enabled=true` cần được thiết kế nội dung (lời thề, ảnh kỷ niệm) ngay ở MF01 sau khi cọc P1.

### 2.2. Các quyết định kỹ thuật chuẩn hóa tuân thủ 100% Rules & AGENTS.md
1. **Tuân thủ quy ước Proto & Contracts (`21-grpc-contracts.md`):**
   - Giữ nguyên tên gRPC Service chuẩn **`MemoryService`** trong `proto/experience/v1/memory.proto` (không tạo service mới `MemoryCardService`).
   - Mọi message gRPC có actor đều tuân thủ quy ước: **`memora.common.v1.VerifiedActor actor = 1;`** là field đầu tiên.
2. **Tuân thủ Ranh giới Orchestration của Gateway (`AGENTS.md` & `13-business-service-structure.md`):**
   - **Gateway sở hữu Orchestration:** Gateway tiếp nhận request của khách, điều phối gọi `orderingClient` và `memoryClient`.
   - **Commerce Service giữ nguyên tính độc lập (Pure Domain Service):** `commerce-service` không mở kết nối gRPC trực tiếp sang `experience-service` để tránh biến kiến trúc thành mạng nhện (Tight Coupling), không cần bổ sung biến môi trường Experience vào Commerce.
   - **Cơ chế chịu lỗi (Fault-Tolerance & Lazy Fallback):**
     - Khi tạo Order: Gateway gọi `orderingClient.createOrder`. Sau khi tạo thành công, Gateway gọi tiếp `memoryClient.provisionMemoryCard` (timeout 3000ms, bọc try-catch để nếu Experience chập chờn thì đơn hàng vẫn tạo thành công 100%).
     - Khi xem chi tiết nhẫn (`ORDER-005`): Gateway gọi `orderingClient.getRingItemDetails`, đồng thời nếu có cờ `memory_enabled = true`, Gateway gọi `memoryClient.getCardByRingItemId` (hoặc gọi bù provision nếu chưa có) để ghép object `memoryCard: { id, status }` trả về cho Client.
3. **Mô hình hóa Gói bảo trì `LIFETIME_POLISHING` (Zero DDL Migration - `00-memora-core.md`):**
   - Được định nghĩa là một **`PriceItem`** (loại `price_type = 'MAINTENANCE_PLAN'`) có giá niêm yết cố định (500.000 VNĐ) gắn với `PriceVersion`, **không phải là `PricingRule`** (vì đây là một SKU thương mại, không phải luật chiết khấu động).
   - **Vị trí lưu trữ tối ưu không sửa Prisma DDL:**
     - `ring_item_versions.preview_snapshot_json`: `{ "maintenancePlan": "LIFETIME_POLISHING", ... }`.
     - `ordering.quote_items`: Lưu 1 dòng riêng với `component_type = 'MAINTENANCE_PLAN'`, `ring_item_id = ringItem.id`, `unit_amount = 500000`, `line_amount = 500000`.
     - Giữ nguyên toàn vẹn baseline 74 bảng PostgreSQL hiện tại.
4. **Từ chối Anti-pattern "Get or Create":**
   - Phân định rõ 2 RPC: `ProvisionMemoryCard` (Command tạo thẻ idempotent) và `GetCardByRingItemId` (Query tra cứu), bảo đảm nguyên lý CQRS.

---

## 3. Thiết Kế Kiến Trúc & Hợp Đồng (Architecture & Contract Design)

### 3.1. Hợp đồng gRPC tại Experience Service
Tại `proto/experience/v1/memory.proto` (thuộc service `MemoryService`):

```protobuf
service MemoryService {
  // Các RPC hiện có: ListMyCards, GetCardDetail, ActivateCard, SetupPin, ChangePin...
  
  // RPC MỚI: Khởi tạo Thẻ Ký Ức tự động từ Đơn Hàng (Idempotent: nếu đã có thẻ thì trả về thẻ hiện tại)
  rpc ProvisionMemoryCard (ProvisionMemoryCardRequest) returns (MemoryCardDetailResponse);
  
  // RPC MỚI: Tra cứu Thẻ Ký Ức theo Ring Item ID
  rpc GetCardByRingItemId (GetCardByRingItemIdRequest) returns (MemoryCardDetailResponse);
}

message ProvisionMemoryCardRequest {
  memora.common.v1.VerifiedActor actor = 1;
  string ring_item_id = 2;
  string owner_customer_identity_id = 3;
  string owner_email = 4;
}

message GetCardByRingItemIdRequest {
  memora.common.v1.VerifiedActor actor = 1;
  string ring_item_id = 2;
}
```

### 3.2. Cập nhật DTO tại API Gateway & Commerce Service

#### A. Thêm trường Gói Bảo Trì (`maintenancePlan`):
- `AddCartItemDto`, `UpdateCartItemDto`, `CreateOrderDto`:
  ```ts
  @ApiPropertyOptional({ enum: ['NONE', 'LIFETIME_POLISHING'], default: 'NONE' })
  @IsOptional()
  @IsEnum(['NONE', 'LIFETIME_POLISHING'])
  maintenancePlan?: string;
  ```

#### B. Cập nhật Response Chi Tiết Chiếc Nhẫn (`ORDER-005`):
- Endpoint: `GET /api/v1/orders/:orderId/items/:ringItemId`
- Bổ sung thông tin thẻ ký ức số trong response DTO:
  ```ts
  export class RingItemDetailResponseDto {
    id!: string;
    orderId!: string;
    personalizationPackage!: string;
    memoryEnabled!: boolean;
    maintenancePlan?: string;
    memoryCard?: {
      id: string;
      status: string; // PENDING | ACTIVE
    };
  }
  ```

### 3.3. Xử lý Logic trong Commerce Service

1. **Khi tạo đơn hàng (`OrderingService.createOrderTransaction`):**
   - Với mỗi Draft có `maintenancePlan === 'LIFETIME_POLISHING'`:
     - Lưu thông tin gói vào `ring_item_versions.preview_snapshot_json`: `{ "maintenancePlan": "LIFETIME_POLISHING", ... }`.
     - Tạo thêm 1 dòng `ordering.quote_items` với `component_type = 'MAINTENANCE_PLAN'`, `ring_item_id = ringItem.id`, đơn giá lấy từ `PriceItem` (500.000 VNĐ).
     - Cộng 500.000 VNĐ vào `total_amount` của Provisional Quote.
2. **Khi khách hàng cọc P1 (30%):**
   - Đơn cọc P1 tự động bao gồm 30% giá trị của chiếc nhẫn + gói bảo trì (theo đúng quy tắc `MF01-BR27`).

### 3.4. Xử lý Điều Phối tại API Gateway (Gateway Orchestration)

1. **Tại `CheckoutOrdersController.createOrder` (`ORDER-001`):**
   - Gọi `orderingClient.createOrder(dto)`.
   - Sau khi Order được tạo thành công, duyệt qua danh sách các ring item vừa tạo:
     - Với mỗi item có `memory_enabled = true`: gọi `memoryClient.provisionMemoryCard(...)` (timeout 3000ms, non-blocking fault-tolerant).
2. **Tại `CheckoutOrdersController.getRingItemDetails` (`ORDER-005`):**
   - Gọi `orderingClient.getRingItemDetails(...)`.
   - Nếu `ringItem.memoryEnabled === true`:
     - Gọi `memoryClient.getCardByRingItemId(...)`.
     - Nếu thẻ chưa tồn tại (do lúc tạo đơn bị timeout), Gateway gọi bù `provisionMemoryCard` (Lazy Fallback).
     - Ghép object `memoryCard: { id, status }` vào payload trả về.

---

## 4. Danh Sách File Dự Kiến Tạo / Sửa Đổi

### 4.1. Protobuf & Contracts
- `proto/experience/v1/memory.proto`: Thêm RPC `ProvisionMemoryCard` và `GetCardByRingItemId` vào `MemoryService`.
- `libs/contracts/src/experience/memory.grpc.ts`: Thêm interface TypeScript handwritten tương ứng.

### 4.2. Experience Service
- `apps/experience-service/src/modules/memory/cards/infrastructure/memory-card.repository.ts`:
  - Thêm phương thức `provisionCard(data)` idempotent (nếu tồn tại theo `ring_item_id` thì trả về, nếu chưa thì tạo mới với `status: 'PENDING'`).
  - Thêm phương thức `findByRingItemId(ringItemId)`.
- `apps/experience-service/src/modules/memory/cards/application/memory-card.service.ts`:
  - Triển khai `provisionMemoryCard` và `getCardByRingItemId`.
- `apps/experience-service/src/modules/memory/cards/presentation/memory-card.grpc.controller.ts`:
  - Khai báo `@GrpcMethod(MEMORY_SERVICE_NAME, 'ProvisionMemoryCard')` và `@GrpcMethod(MEMORY_SERVICE_NAME, 'GetCardByRingItemId')`.

### 4.3. Commerce Service
- `apps/commerce-service/prisma/seed.ts`:
  - Seed bổ sung `PriceItem` mã `'LIFETIME_POLISHING'` loại `MAINTENANCE_PLAN` kèm `PriceVersion` 500.000 VNĐ.
- `apps/commerce-service/src/modules/pricing/pricing-core/application/pricing.service.ts`:
  - Bổ sung logic tính giá dòng `MAINTENANCE_PLAN` (500k) khi estimate giỏ hàng.
- `apps/commerce-service/src/modules/ordering/ordering-core/application/ordering.service.ts`:
  - Trong `createOrderTransaction`: tính giá dòng gói bảo trì `LIFETIME_POLISHING` vào quote.
  - Lưu `maintenancePlan` vào `preview_snapshot_json` của `ring_item_versions`.
- `apps/commerce-service/src/modules/design/cart/` & `drafts/`:
  - Cập nhật DTO & proto cart tiếp nhận `maintenancePlan`.

### 4.4. API Gateway
- `apps/api-gateway/src/modules/memory/clients/memory-grpc.client.ts`:
  - Thêm phương thức `provisionMemoryCard` và `getCardByRingItemId`.
- `apps/api-gateway/src/modules/design/cart/dto/`:
  - Thêm trường `maintenancePlan` vào DTOs.
- `apps/api-gateway/src/modules/ordering/checkout-orders/controllers/checkout-orders.controller.ts`:
  - Điều phối gọi `memoryClient.provisionMemoryCard` khi tạo order và merge `memoryCard` vào response `ORDER-005`.

### 4.5. Test Automation Suite
- `test/automation/commerce/flows/phase1-mf01-order-p1.ts`:
  - Thêm test case chọn mua gói bảo trì `LIFETIME_POLISHING` và kiểm tra giá quote tăng chính xác 500.000 VNĐ.
  - Kiểm tra `ORDER-005` trả về `memoryCard.id` thật từ hệ thống mà không cần seed database.
- `test/automation/experience/run-memory-e2e.ts`:
  - Loại bỏ hoàn toàn hàm `prepareDatabaseSeed()` chèn SQL trực tiếp!
  - Sử dụng trực tiếp `cardId` sinh ra tự động từ luồng Commerce để thực hiện toàn bộ 14 test case Memory E2E.

---

## 5. Kế Hoạch Triển Khai Tuần Tự (4 Implementation Slices)

- [ ] **Slice 1:** Proto & Contracts definition (`ProvisionMemoryCard` & `GetCardByRingItemId`).
- [ ] **Slice 2:** Experience Service implementation (Repository, Service, Controller gRPC).
- [ ] **Slice 3:** Commerce Service Pricing & Maintenance Plan (`PriceItem` seed, Quote items calculation).
- [ ] **Slice 4:** Gateway Orchestration (`createOrder` provision, `ORDER-005` merge) & Verification E2E tests.

---

## 6. Tiêu Chuẩn Nghiệm Thu & Kiểm Thử (Verification Strategy)

1. **Kiểm tra kiểu dữ liệu & lint:**
   - `npx tsc --noEmit` đạt 0 lỗi (Exit code 0).
2. **Kiểm tra Unit Tests:**
   - Chạy toàn bộ unit test của `experience-service` và `commerce-service` đạt 100% PASS.
3. **Kiểm tra Automation E2E:**
   - Chạy `npm run test:commerce:e2e`: Báo giá có xuất hiện dòng gói bảo trì `MAINTENANCE_PLAN`, cọc P1 tính đúng 30% tổng tiền, `ORDER-005` trả về `memoryCard`.
   - Chạy `npm run test:memory:e2e`: Chạy mượt mà từ đầu đến cuối không cần SQL seed thủ công.
