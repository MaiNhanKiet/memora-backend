# MEMORA — Commerce Catalog Browse & Ring Configuration API Plan (APPROVED)

> **Mục đích:** Tài liệu duy nhất để phê duyệt và triển khai 9 API Catalog Browse & 3D Ring Configuration trên nhánh `DuyPQ` theo `.cursor/skills/plan-api`, `implement-api`, `review-api`.
>
> **Phê duyệt:** Chủ dự án đã phê duyệt kế hoạch vào ngày **2026-11-14** để bắt đầu triển khai đầu luồng **MF01 — Configure & Place Ring Order** (MF01-S01 & MF01-S02). **D1–D8 và đủ 9 API dưới đây được APPROVED**. Approval là quyền triển khai theo contract, **không đồng nghĩa đã code, test PASS, review PASS hoặc deploy**.

---

## 1. Metadata & Approval Record

| Trường | Giá trị |
| --- | --- |
| Repository | `memora-backend` |
| Branch | `DuyPQ` |
| Domain / feature | `catalog` / `commerce-catalog-browse` |
| HTTP owner | `apps/api-gateway` (`src/modules/catalog/`) |
| Business / DB owner | `apps/commerce-service` (PostgreSQL schema `catalog`) |
| File path trong repo | `docs/plans/active/commerce-catalog-browse.md` |
| Plan status | `APPROVED` |
| Approval decision | `APPROVED` — D1–D8 và đủ 9 API |
| Approved API IDs | `CATAL-001`, `CATAL-002`, `CATAL-003`, `CATAL-004`, `CATAL-009`, `CATAL-012`, `CATAL-015`, `CATAL-016`, `CATAL-021` |
| Excluded / Deferred | `CATAL-005..008`, `CATAL-010..011`, `CATAL-013..014`, `CATAL-017..018`, `CATAL-020` (Admin APIs — lập plan quản trị riêng) |
| Date prepared / approved | 2026-11-14 |
| Approver | Chủ dự án MEMORA (xác nhận trong cuộc trò chuyện 2026-11-14) |

### Approval Record — Đã xác nhận

- **Quyết định:** **APPROVED** đối với **D1–D8** và **CATAL-001, CATAL-002, CATAL-003, CATAL-004, CATAL-009, CATAL-012, CATAL-015, CATAL-016, CATAL-021** theo đúng hợp đồng trong tài liệu này.
- **Bằng chứng chấp thuận:** Chủ dự án xác nhận "có" trong phiên làm việc ngày **2026-11-14** để bắt đầu triển khai đầu luồng MF01.
- **Quy tắc thực thi:** Triển khai tuần tự từng API theo `implement-api`, bắt đầu từ tầng Protobuf & Handwritten Contracts, sau đó đến Service Repository/Application và Gateway HTTP Controller, chạy kiểm thử verification trước khi chuyển API tiếp theo.

### Invariants được duyệt cùng contract (không được vi phạm)

1. **Ranh giới Gateway vs Service:** Gateway chỉ phụ trách HTTP routing, validation (`class-validator`), Swagger decorators, và mapping gRPC. `commerce-service` sở hữu toàn bộ logic nghiệp vụ, Prisma queries trên schema `catalog`. Tuyệt đối **không** import hay query Prisma từ Gateway.
2. **Ranh giới Microservice (Quyết định D32 APPROVED):** Không tạo Foreign Key vật lý hay Prisma `@relation` chéo sang các service khác (IAM, Operations, Experience). Chỉ dùng UUID scalar logical references.
3. **Public Access:** Toàn bộ 9 API trong plan này dành cho khách duyệt danh mục và cấu hình 3D (Customer & Guest), không yêu cầu JWT authentication (Public endpoint).
4. **Chuẩn Success Envelope:** Mọi response thành công từ Gateway đều tuân thủ cấu trúc chuẩn:
   `{ "statusCode": 200, "message": "Success", "data": ..., "meta"?: { "page", "limit", "total", "totalPages" } }`.
5. **Chỉ hiển thị dữ liệu ACTIVE:** Các API public chỉ trả về Ring Templates, Materials, Variants, Gemstone Options có `status = 'ACTIVE'`. Không làm lộ bản ghi `DRAFT` hay `ARCHIVED`.

---

## 2. API Inventory & Approval Status

| API ID | Method | Canonical endpoint | Purpose | Auth / RBAC | Approval status |
| --- | --- | --- | --- | --- | --- |
| **CATAL-001** | GET | `/api/v1/catalog/templates` | Tìm kiếm & lọc danh mục mẫu nhẫn | Public / None | `APPROVED` |
| **CATAL-002** | GET | `/api/v1/catalog/templates/{templateId}` | Chi tiết một mẫu nhẫn | Public / None | `APPROVED` |
| **CATAL-003** | GET | `/api/v1/catalog/templates/{templateId}/configuration-options` | Tổng hợp tùy chọn cấu hình cho 3D configurator | Public / None | `APPROVED` |
| **CATAL-004** | GET | `/api/v1/catalog/templates/{templateId}/3d-assets` | Metadata file GLB & danh sách anchor nodes | Public / None | `APPROVED` |
| **CATAL-009** | GET | `/api/v1/catalog/materials` | Danh sách chất liệu kim hoàn khả dụng | Public / None | `APPROVED` |
| **CATAL-012** | GET | `/api/v1/catalog/templates/{templateId}/variants` | Danh sách biến thể (size, độ dày, giới hạn resize) | Public / None | `APPROVED` |
| **CATAL-015** | GET | `/api/v1/catalog/gemstone-options` | Danh mục tùy chọn đá quý (loại đá, shape, chứng nhận) | Public / None | `APPROVED` |
| **CATAL-016** | GET | `/api/v1/catalog/templates/{templateId}/gemstone-slots` | Danh sách vị trí gắn đá (gemstone slots) của template | Public / None | `APPROVED` |
| **CATAL-021** | POST | `/api/v1/catalog/configurations/validate` | Revalidate tính tương thích và quy chuẩn trước Add to Cart | Public / None | `APPROVED` |

---

## 3. Approval Decisions — D1 đến D8

| ID | Affects | Approved Decision | Status |
| --- | --- | --- | --- |
| **D1** | CATAL-001..016 | **Bộ lọc ACTIVE:** Tất cả các truy vấn danh mục phía khách hàng bắt buộc lọc `status = 'ACTIVE'`. Mẫu nhẫn hoặc đá quý đang ở trạng thái `DRAFT`, `BLOCKED`, `ARCHIVED` không được xuất hiện trong kết quả. | `APPROVED` |
| **D2** | CATAL-003 | **Aggregated Configurator Endpoint:** Cung cấp endpoint tổng hợp `GET /templates/{id}/configuration-options` gộp Materials khả dụng, Variants, Gemstone Slots và Personalization Packages (`NONE`, `FINGERPRINT`, `SOUNDWAVE`) để giảm số lượng round-trip khi khởi tạo màn hình 3D Preview. | `APPROVED` |
| **D3** | CATAL-004 | **3D Asset CDN Mapping:** Gateway / Service đọc biến cấu hình `CATALOG_CDN_BASE_URL` (mặc định fallback `https://cdn.memora.style`) để resolve `model3dAssetKey` thành full URL tải file GLB công khai. | `APPROVED` |
| **D4** | CATAL-012, 021 | **Tích hợp Resize Policy vào Template Variants (Quyết định D18):** Không còn bảng `resize_policies`. Các giới hạn resize (`max_up_delta`, `max_down_delta`, `resize_method`, `added_metal_allowed`) được đọc trực tiếp từ `template_variants`. | `APPROVED` |
| **D5** | CATAL-015 | **Quy tắc hiển thị Certified vs Standard Gemstone:** Trả về danh mục tùy chọn đá quy chuẩn (`gemstone_options`). Đá kiểm định (`is_certified = true`) được đánh dấu rõ ràng để frontend phân biệt luồng chọn viên đá định danh cụ thể ở MF01-S02. | `APPROVED` |
| **D6** | CATAL-021 | **Quy chuẩn Validation cấu hình:** Trả về `200 OK` với `isValid: true` khi cấu hình hợp lệ; trả về `422 Unprocessable Entity` với mảng `validationErrors: [{ code, message, field }]` khi vi phạm biên độ resize, thiếu đá ở slot bắt buộc, hoặc đá không tương thích. | `APPROVED` |
| **D7** | Toàn bộ 9 API | **Cơ chế Internal gRPC Auth:** Mọi cuộc gọi gRPC từ Gateway sang `commerce-service` phải mang metadata `x-internal-secret` được xác thực bởi `CommerceInternalGrpcAuthGuard`. | `APPROVED` |
| **D8** | Toàn bộ 9 API | **Chuẩn Envelope và Swagger:** Tất cả response sử dụng `@ApiSuccessResponse` decorator, tự động gói dữ liệu trong `{ statusCode, message, data, meta? }`. Các DTO dùng `class-validator` và `@ApiProperty`. | `APPROVED` |

---

## 4. Approved API Contracts

### [CATAL-001] GET /api/v1/catalog/templates
- **Purpose:** Tìm kiếm và phân trang danh mục mẫu nhẫn `ACTIVE`.
- **Query Params (PaginationQueryDto):**
  - `page` (number, optional, default 1, min 1)
  - `limit` (number, optional, default 20, min 1, max 100)
  - `gender` (enum: `MEN`, `WOMEN`, `UNISEX`, optional)
  - `search` (string, optional, max 100 chars)
- **Success Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "message": "Success",
    "data": [
      {
        "id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
        "templateCode": "RT-CLASSIC-01",
        "name": "Classic Solitaire",
        "description": "Timeless solitaire design with a clean profile",
        "gender": "WOMEN",
        "engraveSurfaceType": "INNER_FLAT",
        "model3dAssetKey": "models/templates/rt-classic-01/v1.glb",
        "glbUrl": "https://cdn.memora.style/models/templates/rt-classic-01/v1.glb",
        "defaultMaterialId": "m1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
        "status": "ACTIVE"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
  ```
- **Prisma Query:**
  ```ts
  prisma.ring_templates.findMany({
    where: { status: 'ACTIVE', gender, name: { contains: search, mode: 'insensitive' } },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { created_at: 'desc' }
  });
  ```
- **gRPC Contract:**
  - Method: `rpc ListTemplates (ListTemplatesRequest) returns (ListTemplatesResponse);`
- **Checklist:**
  - [ ] proto definition (`proto/commerce/v1/catalog.proto`)
  - [ ] handwritten contract (`libs/contracts/src/commerce/catalog.ts`)
  - [ ] owning-service gRPC handler (`apps/commerce-service/src/presentation/grpc/catalog.controller.ts`)
  - [ ] owning-service repository & mapper (`apps/commerce-service/src/repositories/catalog.repository.ts`)
  - [ ] Gateway client & module (`apps/api-gateway/src/modules/catalog/`)
  - [ ] Gateway controller & DTOs (`apps/api-gateway/src/modules/catalog/catalog.controller.ts`)
  - [ ] Unit & integration tests

---

### [CATAL-002] GET /api/v1/catalog/templates/{templateId}
- **Purpose:** Xem chi tiết một mẫu nhẫn theo ID.
- **Path Params:** `templateId` (UUID)
- **Success Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "message": "Success",
    "data": {
      "id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "templateCode": "RT-CLASSIC-01",
      "name": "Classic Solitaire",
      "description": "Timeless solitaire design with a clean profile",
      "gender": "WOMEN",
      "engraveSurfaceType": "INNER_FLAT",
      "model3dAssetKey": "models/templates/rt-classic-01/v1.glb",
      "glbUrl": "https://cdn.memora.style/models/templates/rt-classic-01/v1.glb",
      "mappingVersion": "1.0",
      "defaultMaterialId": "m1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "status": "ACTIVE"
    }
  }
  ```
- **Error Response:** 404 Not Found (`TEMPLATE_NOT_FOUND`).
- **gRPC Contract:** `rpc GetTemplateById (GetTemplateByIdRequest) returns (GetTemplateByIdResponse);`
- **Checklist:**
  - [ ] proto definition
  - [ ] handwritten contract
  - [ ] owning-service gRPC handler
  - [ ] owning-service repository
  - [ ] Gateway client & controller
  - [ ] Unit & integration tests

---

### [CATAL-003] GET /api/v1/catalog/templates/{templateId}/configuration-options
- **Purpose:** Lấy toàn bộ tùy chọn cấu hình hợp lệ của Template trong 1 lần gọi cho 3D Configurator.
- **Path Params:** `templateId` (UUID)
- **Success Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "message": "Success",
    "data": {
      "templateId": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "availableMaterials": [
        {
          "id": "m1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
          "materialCode": "YG-18K",
          "name": "Yellow Gold 18K",
          "metalType": "GOLD",
          "purityKarat": 18
        }
      ],
      "availableVariants": [
        {
          "id": "v1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
          "materialId": "m1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
          "standardSize": 12.0,
          "maxUpDelta": 2.0,
          "maxDownDelta": 1.5,
          "resizeMethod": "COMPRESSION_STRETCH",
          "addedMetalAllowed": false,
          "localWallThicknessMm": 1.8,
          "maxSafeEngravingDepthMm": 0.4
        }
      ],
      "gemstoneSlots": [
        {
          "slotNumber": 1,
          "slotType": "CENTER_STONE",
          "isRequired": true,
          "gemstoneGroupId": "g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
          "anchorNodeName": "Stone_Center_Anchor"
        }
      ],
      "allowedPersonalizationPackages": ["NONE", "FINGERPRINT", "SOUNDWAVE"]
    }
  }
  ```
- **gRPC Contract:** `rpc GetTemplateConfigurationOptions (GetTemplateConfigurationOptionsRequest) returns (GetTemplateConfigurationOptionsResponse);`
- **Checklist:**
  - [ ] proto definition
  - [ ] handwritten contract
  - [ ] owning-service gRPC handler
  - [ ] owning-service aggregation logic
  - [ ] Gateway client & controller
  - [ ] Unit & integration tests

---

### [CATAL-004] GET /api/v1/catalog/templates/{templateId}/3d-assets
- **Purpose:** Lấy URL GLB công khai và danh sách anchor nodes 3D.
- **Path Params:** `templateId` (UUID)
- **Success Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "message": "Success",
    "data": {
      "templateId": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "model3dAssetKey": "models/templates/rt-classic-01/v1.glb",
      "glbUrl": "https://cdn.memora.style/models/templates/rt-classic-01/v1.glb",
      "mappingVersion": "1.0",
      "anchors": [
        { "nodeName": "Stone_Center_Anchor", "slotNumber": 1, "slotType": "CENTER_STONE" },
        { "nodeName": "Engrave_Inner_Plane", "surfaceType": "INNER_FLAT" }
      ]
    }
  }
  ```
- **gRPC Contract:** `rpc GetTemplate3DAssets (GetTemplate3DAssetsRequest) returns (GetTemplate3DAssetsResponse);`
- **Checklist:**
  - [ ] proto definition
  - [ ] handwritten contract
  - [ ] owning-service gRPC handler
  - [ ] Gateway client & controller
  - [ ] Unit & integration tests

---

### [CATAL-009] GET /api/v1/catalog/materials
- **Purpose:** Lấy danh sách chất liệu kim hoàn `ACTIVE`.
- **Success Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "message": "Success",
    "data": [
      {
        "id": "m1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
        "materialCode": "YG-18K",
        "name": "Yellow Gold 18K",
        "metalType": "GOLD",
        "purityKarat": 18,
        "densityGCm3": 15.58,
        "status": "ACTIVE"
      }
    ]
  }
  ```
- **gRPC Contract:** `rpc ListMaterials (ListMaterialsRequest) returns (ListMaterialsResponse);`
- **Checklist:**
  - [ ] proto definition
  - [ ] handwritten contract
  - [ ] owning-service gRPC handler
  - [ ] Gateway client & controller
  - [ ] Unit & integration tests

---

### [CATAL-012] GET /api/v1/catalog/templates/{templateId}/variants
- **Purpose:** Lấy danh sách cấu hình biến thể của template (size, material, resize policy theo D18).
- **Path Params:** `templateId` (UUID)
- **Query Params:** `materialId` (UUID, optional)
- **Success Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "message": "Success",
    "data": [
      {
        "id": "v1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
        "ringTemplateId": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
        "materialId": "m1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
        "standardSize": 12.0,
        "maxUpDelta": 2.0,
        "maxDownDelta": 1.5,
        "resizeMethod": "COMPRESSION_STRETCH",
        "addedMetalAllowed": false,
        "localWallThicknessMm": 1.8,
        "minRemainingWallThicknessMm": 1.4,
        "maxSafeEngravingDepthMm": 0.4,
        "status": "ACTIVE"
      }
    ]
  }
  ```
- **gRPC Contract:** `rpc ListTemplateVariants (ListTemplateVariantsRequest) returns (ListTemplateVariantsResponse);`
- **Checklist:**
  - [ ] proto definition
  - [ ] handwritten contract
  - [ ] owning-service gRPC handler
  - [ ] Gateway client & controller
  - [ ] Unit & integration tests

---

### [CATAL-015] GET /api/v1/catalog/gemstone-options
- **Purpose:** Lọc danh sách các tùy chọn đá quý.
- **Query Params:**
  - `page`, `limit` (pagination)
  - `stoneType` (optional: `DIAMOND`, `SAPPHIRE`, `RUBY`, etc.)
  - `shape` (optional: `ROUND`, `PRINCESS`, `EMERALD`, etc.)
  - `isCertified` (optional boolean)
- **Success Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "message": "Success",
    "data": [
      {
        "id": "g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
        "stoneCode": "DIA-RD-050-VS1",
        "stoneType": "DIAMOND",
        "shape": "ROUND",
        "cutGrade": "EXCELLENT",
        "color": "F",
        "clarity": "VS1",
        "caratWeight": 0.50,
        "dimensionLengthMm": 5.1,
        "dimensionWidthMm": 5.1,
        "dimensionHeightMm": 3.15,
        "isCertified": true,
        "status": "ACTIVE"
      }
    ],
    "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  }
  ```
- **gRPC Contract:** `rpc ListGemstoneOptions (ListGemstoneOptionsRequest) returns (ListGemstoneOptionsResponse);`
- **Checklist:**
  - [ ] proto definition
  - [ ] handwritten contract
  - [ ] owning-service gRPC handler
  - [ ] Gateway client & controller
  - [ ] Unit & integration tests

---

### [CATAL-016] GET /api/v1/catalog/templates/{templateId}/gemstone-slots
- **Purpose:** Lấy các vị trí gắn đá (gemstone slots) của template.
- **Path Params:** `templateId` (UUID)
- **Success Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "message": "Success",
    "data": [
      {
        "id": "s1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
        "ringTemplateId": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
        "slotNumber": 1,
        "slotType": "CENTER_STONE",
        "gemstoneGroupId": "grp-uuid",
        "anchorNodeName": "Stone_Center_Anchor",
        "isRequired": true
      }
    ]
  }
  ```
- **gRPC Contract:** `rpc ListGemstoneSlots (ListGemstoneSlotsRequest) returns (ListGemstoneSlotsResponse);`
- **Checklist:**
  - [ ] proto definition
  - [ ] handwritten contract
  - [ ] owning-service gRPC handler
  - [ ] Gateway client & controller
  - [ ] Unit & integration tests

---

### [CATAL-021] POST /api/v1/catalog/configurations/validate
- **Purpose:** Revalidate tính tương thích và an toàn kỹ thuật của một cấu hình nhẫn trước khi cho phép Add to Cart.
- **Request Body (ValidateConfigurationDto):**
  ```json
  {
    "templateId": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    "materialId": "m1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    "standardSize": 12.0,
    "targetSize": 13.0,
    "gemstoneSelections": [
      { "slotNumber": 1, "gemstoneOptionId": "g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c" }
    ],
    "personalizationPackage": "SOUNDWAVE"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "statusCode": 200,
    "message": "Configuration is valid",
    "data": {
      "isValid": true,
      "validationErrors": [],
      "templateVariantId": "v1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "safeEngravingDepthMm": 0.40,
      "resizeDelta": 1.0,
      "isResizeAllowed": true
    }
  }
  ```
- **Error Response (422 Unprocessable Entity):**
  ```json
  {
    "statusCode": 422,
    "message": "Configuration validation failed",
    "error": "Unprocessable Entity",
    "data": {
      "isValid": false,
      "validationErrors": [
        {
          "code": "RESIZE_OUT_OF_BOUNDS",
          "message": "Target size 15.0 exceeds max up delta 2.0 for standard size 12.0",
          "field": "targetSize"
        }
      ]
    }
  }
  ```
- **gRPC Contract:** `rpc ValidateConfiguration (ValidateConfigurationRequest) returns (ValidateConfigurationResponse);`
- **Checklist:**
  - [ ] proto definition
  - [ ] handwritten contract
  - [ ] owning-service gRPC handler
  - [ ] owning-service validation domain engine
  - [ ] Gateway client & controller
  - [ ] Unit & integration tests

---

## 5. Implementation Sequence

Triển khai lần lượt theo 4 phase chuẩn:

- [ ] **Phase 1: Contracts & Protobuf Scaffolding**
  - Tạo `proto/commerce/v1/catalog.proto` (Service `CatalogService` chứa đủ 9 RPCs).
  - Cập nhật `scripts/ci/check-protos.cjs` để CI kiểm tra proto mới.
  - Viết handwritten contracts TypeScript tại `libs/contracts/src/commerce/catalog.ts` và export qua `libs/contracts/src/index.ts`.
- [ ] **Phase 2: Commerce Service Persistence & Business Core**
  - Tạo `apps/commerce-service/src/repositories/catalog.repository.ts`.
  - Tạo `apps/commerce-service/src/application/catalog/catalog.service.ts` (xử lý logic, mappers, CDN base URL, rule validation).
  - Tạo `apps/commerce-service/src/presentation/grpc/catalog.controller.ts` (gRPC handlers + `CommerceInternalGrpcAuthGuard`).
  - Đăng ký controller, providers vào `apps/commerce-service/src/modules/catalog/catalog.module.ts`.
- [ ] **Phase 3: API Gateway Endpoints & DTOs**
  - Tạo module `apps/api-gateway/src/modules/catalog/`:
    + `catalog.module.ts` (đăng ký gRPC client kết nối `COMMERCE_GRPC_URL`).
    + `catalog.controller.ts` (9 REST endpoints với `@ApiTags('catalog')`, `@ApiSuccessResponse`).
    + DTOs: `PaginationQueryDto`, `TemplateFilterDto`, `ValidateConfigurationDto`, etc.
  - Đăng ký `CatalogModule` vào `apps/api-gateway/src/app.module.ts`.
- [ ] **Phase 4: Tests & Verification**
  - Chạy `npm run proto:check`
  - Chạy `npm run boundaries`
  - Chạy `npm run typecheck`
  - Unit tests cho `CatalogService` và validation logic.

---

## 6. Implementation Progress Log

| Date | API ID / Phase | Status | Evidence | Checked by |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Plan Approved | `APPROVED` | Chủ dự án phê duyệt triển khai nhóm Catalog MF01 | DuyPQ |
| 2026-11-14 | Phase 1 (Proto & Contracts) | `COMPLETED` | `proto/commerce/v1/catalog.proto`, `libs/contracts/src/commerce/catalog.grpc.ts` | DuyPQ |
| 2026-11-14 | Phase 2 (Commerce Service Core) | `COMPLETED` | `CatalogRepository`, `CatalogService`, `CatalogMapper`, `CatalogGrpcController` | DuyPQ |
| 2026-11-14 | Phase 3 (Gateway HTTP Layer) | `COMPLETED` | `CatalogController`, `CatalogGrpcClient`, DTOs, Swagger Docs | DuyPQ |
| 2026-11-14 | Phase 4 (Tests & Verification) | `COMPLETED` | `proto:check` PASS, `boundaries` PASS (313 files, 0 findings), `typecheck` PASS, `lint:check` PASS, `jest` PASS (5 tests) | DuyPQ |
| 2026-11-14 | CATAL-001 | `COMPLETED` | GET /api/v1/catalog/templates | DuyPQ |
| 2026-11-14 | CATAL-002 | `COMPLETED` | GET /api/v1/catalog/templates/{templateId} | DuyPQ |
| 2026-11-14 | CATAL-003 | `COMPLETED` | GET /api/v1/catalog/templates/{templateId}/configuration-options | DuyPQ |
| 2026-11-14 | CATAL-004 | `COMPLETED` | GET /api/v1/catalog/templates/{templateId}/3d-assets | DuyPQ |
| 2026-11-14 | CATAL-009 | `COMPLETED` | GET /api/v1/catalog/materials | DuyPQ |
| 2026-11-14 | CATAL-012 | `COMPLETED` | GET /api/v1/catalog/templates/{templateId}/variants | DuyPQ |
| 2026-11-14 | CATAL-015 | `COMPLETED` | GET /api/v1/catalog/gemstone-options | DuyPQ |
| 2026-11-14 | CATAL-016 | `COMPLETED` | GET /api/v1/catalog/templates/{templateId}/gemstone-slots | DuyPQ |
| 2026-11-14 | CATAL-021 | `COMPLETED` | POST /api/v1/catalog/configurations/validate | DuyPQ |
