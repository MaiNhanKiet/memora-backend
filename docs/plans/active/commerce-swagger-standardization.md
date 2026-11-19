# MEMORA — Commerce Swagger & Response Envelope Standardization Plan (APPROVED)

> **Mục đích:** Chuẩn hóa toàn diện tài liệu Swagger OpenAPI và cấu trúc phản hồi (Response Envelope) của tất cả 80 API thuộc Commerce Service tại API Gateway, bảo đảm đồng bộ 100% theo IAM Benchmark và Global Interceptor `ResponseTransformInterceptor`.
>
> **Phê duyệt:** Chủ dự án đã phê duyệt kế hoạch triển khai trên nhánh `DuyPQ`.

---

## 1. Metadata & Approval Record

| Trường | Giá trị |
| --- | --- |
| Repository | `memora-backend` |
| Branch | `DuyPQ` |
| Domain / feature | `commerce` / `swagger-and-response-envelope-standardization` |
| HTTP owner | `apps/api-gateway` |
| Business owner | `apps/commerce-service` |
| File path trong repo | `docs/plans/active/commerce-swagger-standardization.md` |
| Plan status | `APPROVED` |
| Approver | Chủ dự án MEMORA |
| Date approved | 2026-11-16 |

---

## 2. Standards & Technical Decisions (Quy chuẩn kỹ thuật)

### A. Chuẩn hóa Swagger Documentation (IAM Benchmark)
1. **Controller Class-Level `@ApiTags`:**
   - Đặt duy nhất tại cấp Class Controller với tiền tố `commerce-*` rõ ràng:
     - `commerce-catalog` & `commerce-admin-catalog`
     - `commerce-pricing` & `commerce-admin-pricing`
     - `commerce-inventory` & `commerce-admin-inventory`
     - `commerce-orders` & `commerce-admin-orders`
     - `commerce-payments` & `commerce-admin-payments`
     - `commerce-claims`
     - `commerce-cart` & `commerce-design-drafts`
   - Loại bỏ toàn bộ `ApiTags(...)` lẻ tẻ hoặc trùng lặp bên trong các hàm doc decorator.
2. **Security Bearer:**
   - Dùng thống nhất `ApiBearerAuth('bearer')`.
3. **Response Envelope Decorator (`ApiSuccessResponse`):**
   - Single item: `ApiSuccessResponse({ type: MyDto, status: 200/201 })`
   - List / Array: `ApiSuccessResponse({ type: MyDto, isArray: true })`
   - Paginated: `ApiSuccessResponse({ type: MyDto, isArray: true, paginated: true })`
4. **Standard Error Responses:**
   - `400`: `ApiResponse({ status: 400, description: 'Invalid request payload or query parameters' })`
   - `401`: `ApiResponse({ status: 401, description: 'Missing or invalid access token' })`
   - `403`: `ApiResponse({ status: 403, description: 'Caller lacks required role or ownership' })`
   - `404`: `ApiResponse({ status: 404, description: 'Resource not found' })`

### B. Chuẩn hóa Runtime Response Envelope & Phân trang (IAM Benchmark)
1. **Envelope Structure (`toPaginatedSuccessResponse`):**
   - Mọi endpoint phân trang tại Gateway đều dùng `toPaginatedSuccessResponse` bọc kết quả trong `SuccessResponse<T[]>`.
   - Global Interceptor `ResponseTransformInterceptor` sẽ unwrap thành:
     ```json
     {
       "statusCode": 200,
       "message": "SUCCESS",
       "data": [],
       "meta": {
         "page": 1,
         "limit": 20,
         "total": 0,
         "totalPages": 0
       }
     }
     ```
   - `data`: Nằm ở root level (chứa mảng item).
   - `meta`: Nằm ở root level ngang hàng với `data`.
2. **Empty Array Fallback (Chống gRPC omission):**
   - Protobuf gRPC lược bỏ mảng rỗng trên wire khiến client nhận `undefined`. Bổ sung fallback `res.data ?? []` (hoặc `res.items ?? []`) để key `data` không bị JSON serializer lược bỏ.
3. **Safe Int64 to Number:**
   - Dùng `toPaginationMeta` từ `@app/common` chuyển đổi `total` từ gRPC wire `int64` (string `"0"`) về kiểu số `number` `0`.
4. **Zero TotalPages Calculation:**
   - Điều chỉnh logic tính `totalPages = total <= 0 ? 0 : Math.ceil(total / limit)` trong service để khi `total = 0` thì `totalPages = 0` (thay vì `Math.ceil(total / limit) || 1` vốn trả về `1`).

---

## 3. Danh sách Endpoints & Files liên quan

### A. API Gateway Controllers & Docs
1. **Catalog Module:**
   - `apps/api-gateway/src/modules/catalog/controllers/catalog.controller.ts` (`@ApiTags('commerce-catalog')`, `listTemplates`, `listGemstoneOptions`, fallback `?? []`)
   - `apps/api-gateway/src/modules/catalog/controllers/admin-catalog.controller.ts` (`@ApiTags('commerce-admin-catalog')`)
   - `apps/api-gateway/src/modules/catalog/docs/catalog.swagger.ts`
   - `apps/api-gateway/src/modules/catalog/docs/admin-catalog.swagger.ts`
2. **Pricing Module:**
   - `apps/api-gateway/src/modules/pricing/controllers/pricing.controller.ts` (`@ApiTags('commerce-pricing')`)
   - `apps/api-gateway/src/modules/pricing/controllers/admin-pricing.controller.ts` (`@ApiTags('commerce-admin-pricing')`)
   - `apps/api-gateway/src/modules/pricing/docs/pricing.swagger.ts`
   - `apps/api-gateway/src/modules/pricing/docs/admin-pricing.swagger.ts`
3. **Inventory Module:**
   - `apps/api-gateway/src/modules/inventory/controllers/inventory.controller.ts` (`@ApiTags('commerce-inventory')`)
   - `apps/api-gateway/src/modules/inventory/controllers/admin-inventory.controller.ts` (`@ApiTags('commerce-admin-inventory')`)
   - `apps/api-gateway/src/modules/inventory/docs/admin-inventory.swagger.ts`
4. **Ordering & Payments Module:**
   - `apps/api-gateway/src/modules/ordering/controllers/orders.controller.ts` (`@ApiTags('commerce-orders')`, `listOrders`)
   - `apps/api-gateway/src/modules/ordering/controllers/admin-orders.controller.ts` (`@ApiTags('commerce-admin-orders')`, `listAdminOrders`)
   - `apps/api-gateway/src/modules/ordering/controllers/admin-payments.controller.ts` (`@ApiTags('commerce-admin-payments')`)
   - `apps/api-gateway/src/modules/ordering/controllers/payments-webhook.controller.ts` (`@ApiTags('commerce-payments')`)
   - `apps/api-gateway/src/modules/ordering/controllers/claim-quotes.controller.ts` (`@ApiTags('commerce-claims')`)
   - `apps/api-gateway/src/modules/ordering/docs/ordering.swagger.ts`
   - `apps/api-gateway/src/modules/ordering/docs/payos-payments.swagger.ts`
   - `apps/api-gateway/src/modules/ordering/docs/claim-quotes.swagger.ts`
5. **Design & Cart Module:**
   - `apps/api-gateway/src/modules/design/controllers/cart.controller.ts` (`@ApiTags('commerce-cart')`)
   - `apps/api-gateway/src/modules/design/controllers/design-draft.controller.ts` (`@ApiTags('commerce-design-drafts')`)
   - `apps/api-gateway/src/modules/design/docs/cart.swagger.ts`
   - `apps/api-gateway/src/modules/design/docs/design-draft.swagger.ts`
   - `apps/api-gateway/src/modules/design/docs/design-share.swagger.ts`
6. **Common Mapper:**
   - `apps/api-gateway/src/common/mappers/paginated-success.mapper.ts`

### B. Commerce Service Application Layer
1. `apps/commerce-service/src/application/catalog/catalog.service.ts` (`listTemplates`, `listGemstoneOptions`)

---

## 4. Verification Evidence (Bằng chứng kiểm thử)

1. **Unit Tests:**
   - `catalog.service.spec.ts`: 12/12 tests PASS.
   - `ordering.service.spec.ts`: 68/68 tests PASS.
2. **Typecheck:**
   - `apps/api-gateway`: 0 errors.
   - `apps/commerce-service`: 0 errors.
3. **Boundaries Check:**
   - `npm run boundaries`: 441 files checked, 0 violations.
4. **Nest Build:**
   - `npx nest build api-gateway`: Webpack compile thành công.
   - `npx nest build commerce-service`: Webpack compile thành công.
