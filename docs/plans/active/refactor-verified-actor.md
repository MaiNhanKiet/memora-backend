# Refactor Plan: Standardize Actor Identity to `memora.common.v1.VerifiedActor`

- **Trạng thái:** `AWAITING_APPROVAL`
- **Mục tiêu:** Đồng bộ hóa 100% việc quản lý danh tính người gọi giữa API Gateway và Commerce Service theo chuẩn hệ thống:
  - Gateway: Sử dụng `toVerifiedActor(principal)` từ `@CurrentUser()`.
  - Microservice: Sử dụng `parseVerifiedActor(request.actor)` từ `@app/common`.
  - Thay thế hoàn toàn `OrderActorIdentity` và `CartActorIdentity` tự phát bằng `memora.common.v1.VerifiedActor`.
  - Loại bỏ các decorator tự lấy session từ header không an toàn (`ExtractCartActor`, `ExtractOrderActor`).

---

## 1. Danh sách file dự kiến thay đổi (File Scope)

### A. Proto Contracts (`proto/`)
- `proto/commerce/v1/cart.proto`:
  - `import "common/v1/actor.proto";`
  - Thay thế `CartActorIdentity actor = 1;` bằng `memora.common.v1.VerifiedActor actor = 1;`
  - Xóa định nghĩa `message CartActorIdentity`.
- `proto/commerce/v1/ordering.proto`:
  - `import "common/v1/actor.proto";`
  - Thay thế `OrderActorIdentity actor = 1;` bằng `memora.common.v1.VerifiedActor actor = 1;`
  - Xóa định nghĩa `message OrderActorIdentity`.

### B. Handwritten Contracts (`libs/contracts/`)
- `libs/contracts/src/commerce/cart.grpc.ts`:
  - `import type { VerifiedActor } from '../common/actor';`
  - Thay `CartActorIdentity` bằng `VerifiedActor`.
- `libs/contracts/src/commerce/ordering.grpc.ts`:
  - `import type { VerifiedActor } from '../common/actor';`
  - Thay `OrderActorIdentity` bằng `VerifiedActor`.

### C. Commerce Service (`apps/commerce-service/`)
- `apps/commerce-service/src/presentation/grpc/cart.grpc.controller.ts`:
  - Parse request.actor bằng `parseVerifiedActor(request.actor)`.
  - Truyền `ParsedVerifiedActor` xuống Cart Application Service.
- `apps/commerce-service/src/application/cart/cart.service.ts`:
  - Cập nhật hàm xử lý actor nhận `ParsedVerifiedActor` thay vì `CartActorIdentity`.
- `apps/commerce-service/src/presentation/grpc/ordering.grpc.controller.ts`:
  - Parse request.actor bằng `parseVerifiedActor(request.actor)`.
  - Thu hẹp kiểu bằng `requireUserActor(actor)` hoặc cho phép guest session tùy nghiệp vụ.
  - Truyền parsed actor xuống Ordering Application Service.
- `apps/commerce-service/src/application/ordering/ordering.service.ts`:
  - Cập nhật `validateActor` sử dụng `ParsedVerifiedActor`.

### D. API Gateway (`apps/api-gateway/`)
- `apps/api-gateway/src/modules/ordering/controllers/orders.controller.ts`:
  - Bỏ `@Public()` ở các route cần user đăng nhập.
  - Sử dụng `@CurrentUser() principal: AuthenticatedPrincipal`.
  - Tạo actor bằng `toVerifiedActor(principal)`.
  - Xóa bỏ phụ thuộc vào `ExtractOrderActor`.
- `apps/api-gateway/src/modules/design/controllers/cart.controller.ts`:
  - Đối với các route cart có đăng nhập: dùng `@CurrentUser()` và `toVerifiedActor(principal)`.
- Xóa bỏ hoặc deprecate các decorator không an toàn:
  - `apps/api-gateway/src/modules/ordering/decorators/extract-order-actor.decorator.ts`
  - `apps/api-gateway/src/modules/design/decorators/extract-cart-actor.decorator.ts`

---

## 2. Kế hoạch kiểm thử & nghiệm thu
1. `npm run proto:check`
2. `npm run typecheck`
3. `npx nest build commerce-service`
4. `npx nest build api-gateway`
5. `npm run boundaries`
