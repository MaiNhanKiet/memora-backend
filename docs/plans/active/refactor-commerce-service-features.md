# MEMORA — Master Plan: Chuẩn hóa Kiến trúc Commerce Service (Rule 13)

> **Mục đích:** Tái cấu trúc toàn bộ mã nguồn của `apps/commerce-service` từ kiến trúc phân tầng tập trung cũ (`src/presentation`, `src/application`, `src/repositories`) sang kiến trúc chuẩn mực của MEMORA theo Rule 13 (`src/modules/<domain>/<feature>/{presentation, application, infrastructure}`) tương tự như benchmark của `operations-service/src/modules/personalization/`.
>
> **Ràng buộc quan trọng:**
> 1. **Zero Breaking gRPC Contracts:** Giữ nguyên 100% định nghĩa protobuf, method names, request/response messages và gRPC Status Codes.
> 2. **100% Test Coverage Preserved:** Toàn bộ 137 unit tests của commerce-service phải tiếp tục PASS 100%.
> 3. **Eliminate Old Root Folders:** Xóa sạch hoàn toàn các thư mục phẳng tự phát ở root (`src/presentation/`, `src/application/`, `src/repositories/`, `src/infrastructure/`).
> 4. **Fix Zero `any` & Actor Parsing:** Chuẩn hóa kiểu dữ liệu type-safe trong `ordering.service.ts` và PayOS webhook.
> 5. **Phân kỳ an toàn qua 5 Đợt (5 Phases):** Thực hiện lần lượt từng domain, kiểm thử nghiệm ngặt sau mỗi đợt.

---

## 1. Metadata & Plan Status

| Trường | Giá trị |
| --- | --- |
| Repository | `memora-backend` |
| Branch | `DuyPQ` |
| Scope | Commerce Service (`apps/commerce-service/src/`) |
| Target Modules | `design`, `pricing`, `inventory`, `catalog`, `ordering` |
| Target Architecture | `src/modules/<domain>/<feature>/{presentation, application, infrastructure}` |
| Reference Benchmark | `apps/operations-service/src/modules/personalization/` |
| Quy tắc tuân thủ | `.agents/rules/13-business-service-structure.md`, `05-techlead-code-style.md`, `AGENTS.md` |
| File Plan | `docs/plans/active/refactor-commerce-service-features.md` |
| Plan Status | `COMPLETED & VERIFIED` — Đã hoàn thành toàn bộ 5 đợt & vượt qua 100% tests |
| Date Prepared | 2026-11-16 |

---

## 2. So sánh Kiến trúc Hiện tại vs Kiến trúc Mục tiêu

### Hiện trạng (Layer-First tập trung kiểu cũ):
```text
apps/commerce-service/src/
├── presentation/grpc/                  <-- Gom chung 5 gRPC controller
│   ├── cart.grpc.controller.ts
│   ├── catalog.grpc.controller.ts
│   ├── inventory.grpc.controller.ts
│   ├── ordering.grpc.controller.ts
│   └── pricing.grpc.controller.ts
├── application/                        <-- Gom chung 5 domain service
│   ├── cart/cart.service.ts
│   ├── catalog/catalog.service.ts
│   ├── inventory/inventory.service.ts
│   ├── ordering/ordering.service.ts
│   └── pricing/pricing.service.ts
├── repositories/                       <-- Gom chung toàn bộ Prisma repositories
│   ├── cart.repository.ts
│   ├── catalog.repository.ts
│   ├── inventory.repository.ts
│   ├── ordering.repository.ts
│   ├── pricing.repository.ts
│   └── repositories.module.ts
├── infrastructure/payment/             <-- Provider PayOS nằm lẻ ở root
├── modules/                            <-- 5 file module rỗng
└── commerce-service.module.ts
```

### Mục tiêu chuẩn mực (Domain -> Feature -> Layer theo Rule 13):
```text
apps/commerce-service/src/
├── commerce-service.module.ts          <-- Process composition root
├── grpc/                               <-- Service gRPC registry & Auth Guard
│   ├── commerce-grpc.registry.ts
│   └── commerce-internal-grpc-auth.guard.ts
├── health/                             <-- Health check endpoints
├── persistence/prisma/                 <-- PrismaClient pool sở hữu riêng
└── modules/                            <-- Toàn bộ nghiệp vụ đóng gói theo Domain & Feature
    ├── design/
    │   ├── design.module.ts
    │   └── cart/
    │       ├── cart.module.ts
    │       ├── presentation/cart.grpc.controller.ts
    │       ├── application/cart.service.ts (+ spec)
    │       └── infrastructure/cart.repository.ts
    ├── pricing/
    │   ├── pricing.module.ts
    │   └── pricing-core/
    │       ├── pricing-core.module.ts
    │       ├── presentation/pricing.grpc.controller.ts
    │       ├── application/pricing.service.ts (+ spec)
    │       └── infrastructure/pricing.repository.ts
    ├── inventory/
    │   ├── inventory.module.ts
    │   └── inventory-core/
    │       ├── inventory-core.module.ts
    │       ├── presentation/inventory.grpc.controller.ts
    │       ├── application/inventory.service.ts (+ spec)
    │       └── infrastructure/inventory.repository.ts
    ├── catalog/
    │   ├── catalog.module.ts
    │   └── catalog-core/
    │       ├── catalog-core.module.ts
    │       ├── presentation/catalog.grpc.controller.ts
    │       ├── application/catalog.service.ts (+ spec)
    │       └── infrastructure/catalog.repository.ts
    └── ordering/
        ├── ordering.module.ts
        └── ordering-core/
            ├── ordering-core.module.ts
            ├── presentation/ordering.grpc.controller.ts
            ├── application/ordering.service.ts (+ spec)
            └── infrastructure/
                ├── ordering.repository.ts
                └── payment/payos.provider.ts (+ interface)
```

---

## 3. Lộ trình Triển khai 5 Đợt (5-Phase Roadmap)

### 📌 Đợt 1: Domain `design` (Cart & Drafts)
- **Cấu trúc mới:** `apps/commerce-service/src/modules/design/cart/`
  - `presentation/cart.grpc.controller.ts`: Chuyển từ `src/presentation/grpc/cart.grpc.controller.ts`.
  - `application/cart.service.ts` & `cart.service.spec.ts`: Chuyển từ `src/application/cart/`.
  - `infrastructure/cart.repository.ts`: Chuyển từ `src/repositories/cart.repository.ts`.
  - `cart.module.ts`: Đăng ký Controller, Service, Repository độc lập.
  - `design.module.ts`: Import `CartModule` và export `CartService`.
- **Dọn dẹp:** Xóa `src/presentation/grpc/cart.grpc.controller.ts`, `src/application/cart/`, `src/repositories/cart.repository.ts`.
- **Kiểm thử Đợt 1:** `npx jest apps/commerce-service/src/modules/design/` (11/11 tests PASS).

---

### 📌 Đợt 2: Domain `pricing` (Pricing & Rules)
- **Cấu trúc mới:** `apps/commerce-service/src/modules/pricing/pricing-core/`
  - `presentation/pricing.grpc.controller.ts`: Chuyển từ `src/presentation/grpc/pricing.grpc.controller.ts`.
  - `application/pricing.service.ts` & `pricing.service.spec.ts`: Chuyển từ `src/application/pricing/`.
  - `infrastructure/pricing.repository.ts`: Chuyển từ `src/repositories/pricing.repository.ts`.
  - `pricing-core.module.ts`: Đăng ký Controller, Service, Repository.
  - `pricing.module.ts`: Import `PricingCoreModule` và export `PricingService`.
- **Dọn dẹp:** Xóa `src/presentation/grpc/pricing.grpc.controller.ts`, `src/application/pricing/`, `src/repositories/pricing.repository.ts`.
- **Kiểm thử Đợt 2:** `npx jest apps/commerce-service/src/modules/pricing/` (20/20 tests PASS).

---

### 📌 Đợt 3: Domain `inventory` (Ring Blanks, Gemstones, Allocations)
- **Cấu trúc mới:** `apps/commerce-service/src/modules/inventory/inventory-core/`
  - `presentation/inventory.grpc.controller.ts`: Chuyển từ `src/presentation/grpc/inventory.grpc.controller.ts`.
  - `application/inventory.service.ts` & `inventory.service.spec.ts`: Chuyển từ `src/application/inventory/`.
  - `infrastructure/inventory.repository.ts`: Chuyển từ `src/repositories/inventory.repository.ts`.
  - `inventory-core.module.ts`: Đăng ký Controller, Service, Repository.
  - `inventory.module.ts`: Import `InventoryCoreModule` và export `InventoryService`.
- **Dọn dẹp:** Xóa `src/presentation/grpc/inventory.grpc.controller.ts`, `src/application/inventory/`, `src/repositories/inventory.repository.ts`.
- **Kiểm thử Đợt 3:** `npx jest apps/commerce-service/src/modules/inventory/` (19/19 tests PASS).

---

### 📌 Đợt 4: Domain `catalog` (Templates, Materials, Gemstones)
- **Cấu trúc mới:** `apps/commerce-service/src/modules/catalog/catalog-core/`
  - `presentation/catalog.grpc.controller.ts`: Chuyển từ `src/presentation/grpc/catalog.grpc.controller.ts`.
  - `application/catalog.service.ts` & `catalog.service.spec.ts`: Chuyển từ `src/application/catalog/`.
  - `infrastructure/catalog.repository.ts`: Chuyển từ `src/repositories/catalog.repository.ts`.
  - `catalog-core.module.ts`: Đăng ký Controller, Service, Repository.
  - `catalog.module.ts`: Import `CatalogCoreModule` và export `CatalogService`.
- **Dọn dẹp:** Xóa `src/presentation/grpc/catalog.grpc.controller.ts`, `src/application/catalog/`, `src/repositories/catalog.repository.ts`.
- **Kiểm thử Đợt 4:** `npx jest apps/commerce-service/src/modules/catalog/` (12/12 tests PASS).

---

### 📌 Đợt 5: Domain `ordering` (Orders, Quotes, Payments, Claims)
- **Cấu trúc mới:** `apps/commerce-service/src/modules/ordering/ordering-core/`
  - `presentation/ordering.grpc.controller.ts`: Chuyển từ `src/presentation/grpc/ordering.grpc.controller.ts`.
  - `application/ordering.service.ts` & `ordering.service.spec.ts`: Chuyển từ `src/application/ordering/`. Khắc phục triệt để các cảnh báo `any` trong PayOS webhook và mapper.
  - `infrastructure/ordering.repository.ts`: Chuyển từ `src/repositories/ordering.repository.ts`.
  - `infrastructure/payment/`: Di chuyển `payos.provider.ts` và `payos.interface.ts` từ `src/infrastructure/payment/` vào đây.
  - `ordering-core.module.ts`: Đăng ký Controller, Service, Repository, PayosProvider.
  - `ordering.module.ts`: Import `OrderingCoreModule` và export `OrderingService`.
- **Dọn dẹp hoàn tất:**
  - Xóa `src/presentation/grpc/ordering.grpc.controller.ts`, xóa thư mục `src/presentation/`.
  - Xóa `src/application/ordering/`, xóa thư mục `src/application/`.
  - Xóa `src/repositories/ordering.repository.ts`, `src/repositories/repositories.module.ts`, xóa thư mục `src/repositories/`.
  - Xóa `src/infrastructure/payment/`, xóa thư mục `src/infrastructure/`.
- **Kiểm thử Đợt 5:** `npx jest apps/commerce-service/src/modules/ordering/` (68/68 tests PASS).

---

## 4. Danh sách File Tạo mới / Di chuyển / Xóa

### File tạo mới / di chuyển:
- `apps/commerce-service/src/modules/design/cart/cart.module.ts`
- `apps/commerce-service/src/modules/design/cart/presentation/cart.grpc.controller.ts`
- `apps/commerce-service/src/modules/design/cart/application/cart.service.ts`
- `apps/commerce-service/src/modules/design/cart/application/cart.service.spec.ts`
- `apps/commerce-service/src/modules/design/cart/infrastructure/cart.repository.ts`
- `apps/commerce-service/src/modules/pricing/pricing-core/pricing-core.module.ts`
- `apps/commerce-service/src/modules/pricing/pricing-core/presentation/pricing.grpc.controller.ts`
- `apps/commerce-service/src/modules/pricing/pricing-core/application/pricing.service.ts`
- `apps/commerce-service/src/modules/pricing/pricing-core/application/pricing.service.spec.ts`
- `apps/commerce-service/src/modules/pricing/pricing-core/infrastructure/pricing.repository.ts`
- `apps/commerce-service/src/modules/inventory/inventory-core/inventory-core.module.ts`
- `apps/commerce-service/src/modules/inventory/inventory-core/presentation/inventory.grpc.controller.ts`
- `apps/commerce-service/src/modules/inventory/inventory-core/application/inventory.service.ts`
- `apps/commerce-service/src/modules/inventory/inventory-core/application/inventory.service.spec.ts`
- `apps/commerce-service/src/modules/inventory/inventory-core/infrastructure/inventory.repository.ts`
- `apps/commerce-service/src/modules/catalog/catalog-core/catalog-core.module.ts`
- `apps/commerce-service/src/modules/catalog/catalog-core/presentation/catalog.grpc.controller.ts`
- `apps/commerce-service/src/modules/catalog/catalog-core/application/catalog.service.ts`
- `apps/commerce-service/src/modules/catalog/catalog-core/application/catalog.service.spec.ts`
- `apps/commerce-service/src/modules/catalog/catalog-core/infrastructure/catalog.repository.ts`
- `apps/commerce-service/src/modules/ordering/ordering-core/ordering-core.module.ts`
- `apps/commerce-service/src/modules/ordering/ordering-core/presentation/ordering.grpc.controller.ts`
- `apps/commerce-service/src/modules/ordering/ordering-core/application/ordering.service.ts`
- `apps/commerce-service/src/modules/ordering/ordering-core/application/ordering.service.spec.ts`
- `apps/commerce-service/src/modules/ordering/ordering-core/infrastructure/ordering.repository.ts`
- `apps/commerce-service/src/modules/ordering/ordering-core/infrastructure/payment/payos.provider.ts`
- `apps/commerce-service/src/modules/ordering/ordering-core/infrastructure/payment/payos.interface.ts`

### File chỉnh sửa:
- `apps/commerce-service/src/modules/design/design.module.ts`
- `apps/commerce-service/src/modules/pricing/pricing.module.ts`
- `apps/commerce-service/src/modules/inventory/inventory.module.ts`
- `apps/commerce-service/src/modules/catalog/catalog.module.ts`
- `apps/commerce-service/src/modules/ordering/ordering.module.ts`
- `apps/commerce-service/src/commerce-service.module.ts`

### Thư mục phẳng cũ bị xóa sạch:
- `apps/commerce-service/src/presentation/`
- `apps/commerce-service/src/application/`
- `apps/commerce-service/src/repositories/`
- `apps/commerce-service/src/infrastructure/`

---

## 5. Tiêu chí Đánh giá & Verification Gate

Sau mỗi đợt và khi hoàn tất:
1. `npx tsc -p apps/commerce-service/tsconfig.app.json --noEmit` ➔ 0 lỗi compile TypeScript strict.
2. `npm run boundaries` ➔ 0 vi phạm ranh giới kiến trúc.
3. `npx nest build commerce-service` ➔ Build thành công không có warning/error.
4. `npx jest apps/commerce-service` ➔ Toàn bộ 137 unit tests PASS (5/5 suites).
5. Không commit code lên git (để user kiểm tra và tự commit).
