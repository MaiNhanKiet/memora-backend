# Kế hoạch Triển khai: Tính năng Chia sẻ Phối cảnh Nhẫn 3D (3D Ring Share Links) trong Platform

## 1. Metadata

- **Branch:** `DuyPQ`
- **Domain:** `platform`
- **Service:** `experience-service` (Gateway HTTP → Experience gRPC)
- **Feature:** Public 3D Ring Preview Share Links (`PLATF-010`, `PLATF-011`)
- **Plan status:** `COMPLETED`
- **Updated:** 2026-11-24
- **Source references:**
  - `docs/duypq/MEMORA_API_MASTER_SPECIFICATION_v1.0_AGENT.md` (Rows 229, 230: `PLATF-010`, `PLATF-011`)
  - `docs/architecture/memora-backend-4-service.md` (Section 3.4 Experience Service: `platform.share_links`)
  - `apps/experience-service/prisma/schema.prisma` (Model `share_links` trong schema `platform`)

---

## 2. Bối cảnh & Mục tiêu Nghiệp vụ

### 2.1 Bối cảnh
- Khi khách hàng tùy biến xong một chiếc nhẫn 3D trên Web (chọn chất liệu vàng, chọn kiểu gắn đá, đính đá kim cương, xem mô hình GLB xoay 360 độ), khách hàng muốn gửi đường link cho bạn bè, người yêu hoặc người thân xem cùng để lấy ý kiến trước khi đặt cọc.
- **Yêu cầu bảo mật & quyền riêng tư (Sanitized Snapshot):**
  - Người nhận link **KHÔNG CẦN đăng nhập tài khoản** (Public Preview).
  - Bản xem chung **chỉ chứa thông tin phối cảnh 3D trực quan** (tên mẫu nhẫn, chất liệu, đá quý, file mô hình 3D GLB để xoay 360 độ).
  - Tuyệt đối **KHÔNG chứa thông tin nhạy cảm** (không lộ giá tiền, không lộ danh tính/số điện thoại của người tạo).
  - Link có thời hạn truy cập (mặc định 7 ngày) và người tạo có thể chủ động **hủy/thu hồi link** bất kỳ lúc nào (`REVOKED`).

### 2.2 Mục tiêu kỹ thuật
1. Tận dụng bảng **`platform.share_links`** đã có sẵn trong cơ sở dữ liệu của `experience-service`.
2. Xây dựng dịch vụ **`SharingService`** trong `experience-service`:
   - Sinh token ngẫu nhiên bảo mật (NanoID / Cryptographic random token 16–32 ký tự URL-safe).
   - Băm SHA-256 lưu vào `token_hash` trong database để ngăn chặn lộ token nếu bị rò rỉ database.
   - Quản lý trạng thái vòng đời link: `ACTIVE` ➔ `REVOKED` / `EXPIRED`.
   - Ghi nhận thời điểm truy cập gần nhất (`last_accessed_at`).
3. Cung cấp API Public tại Gateway:
   - `GET /api/v1/shares/:shareToken`: Không cần đăng nhập, trả về snapshot 3D đã được sanitize.
   - `POST /api/v1/shares`: Tạo link chia sẻ mới (dành cho người dùng đã đăng nhập hoặc khách vãng lai `guest`).
   - `DELETE /api/v1/shares/:shareLinkId`: Thu hồi link chia sẻ.

---

## 3. Database Schema (`platform.share_links`)

Cấu trúc bảng thực tế từ `apps/experience-service/prisma/schema.prisma`:

```prisma
model share_links {
  id                      String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  created_by_user_id      String?   @db.Uuid
  guest_session_id        String?   @db.VarChar(120)
  ring_template_id        String?   @db.Uuid
  ring_design_draft_id    String?   @db.Uuid
  token_hash              String    @unique(map: "platform_share_links_token_hash_5ce3596_uq") @db.VarChar(128)
  status                  String    @default("ACTIVE") @db.VarChar(20) // ACTIVE | REVOKED | EXPIRED
  sanitized_snapshot_json Json      @default("{}")
  expires_at              DateTime? @db.Timestamptz(6)
  revoked_at              DateTime? @db.Timestamptz(6)
  last_accessed_at        DateTime? @db.Timestamptz(6)
  created_at              DateTime  @default(now()) @db.Timestamptz(6)

  @@schema("platform")
}
```

---

## 4. Danh sách Endpoint & Hợp đồng API

### 4.1 [PLATF-010] `GET /api/v1/shares/:shareToken` (Public 3D Ring View)
- **Method:** `GET`
- **URL:** `/api/v1/shares/:shareToken`
- **Authentication:** **Public (Không yêu cầu đăng nhập, `@Public()`)**
- **Logic xử lý:**
  1. Gateway nhận `shareToken` từ param URL.
  2. Gọi sang Experience Service gRPC: `ResolveShareLink(shareToken)`.
  3. Service băm SHA-256 của `shareToken` để đối chiếu với `token_hash`.
  4. Kiểm tra điều kiện:
     - Record tồn tại.
     - `status == 'ACTIVE'`.
     - `expires_at IS NULL` hoặc `expires_at > now()`.
  5. Cập nhật bất đồng bộ `last_accessed_at = now()`.
  6. Trả về thông số phối cảnh nhẫn 3D đã sanitize.
  7. Nếu không hợp lệ hoặc đã hết hạn: trả về `404 Not Found` với thông báo *"Liên kết chia sẻ không tồn tại hoặc đã hết hạn"*.
- **Response Format (200 OK):**
  ```json
  {
    "statusCode": 200,
    "success": true,
    "data": {
      "shareToken": "memora-3d-a8x9k2",
      "status": "ACTIVE",
      "expiresAt": "2026-12-01T12:00:00.000Z",
      "ringDesign": {
        "templateCode": "T_TEST_BAND",
        "templateName": "Classic Comfort Band",
        "materialCode": "GOLD_18K_YELLOW",
        "materialName": "Vàng 18K Vàng",
        "glbAssetKey": "models/T_TEST_BAND.glb",
        "glbUrl": "http://100.78.222.34:3900/memora-catalog/models/T_TEST_BAND.glb?...",
        "gemstones": [
          {
            "slot": "GEM_SLOT_CENTER",
            "gemstoneName": "Kim Cương Tự Nhiên 4.5mm"
          }
        ],
        "engraving": {
          "text": "Forever Love",
          "font": "Serif"
        }
      }
    }
  }
  ```

### 4.2 [PLATF-011] `POST /api/v1/shares` (Tạo link chia sẻ mới)
- **Method:** `POST`
- **URL:** `/api/v1/shares`
- **Authentication:** `@AllowGuest({ session: true })` (Hỗ trợ cả User đăng nhập và Guest)
- **Body:**
  ```json
  {
    "ringTemplateId": "uuid-optional",
    "ringDesignDraftId": "uuid-optional",
    "designSnapshot": {
      "templateCode": "T_TEST_BAND",
      "templateName": "Classic Comfort Band",
      "materialCode": "GOLD_18K_YELLOW",
      "glbAssetKey": "models/T_TEST_BAND.glb",
      "gemstones": [],
      "engravingText": "Forever Love"
    },
    "ttlDays": 7
  }
  ```
- **Response Format (201 Created):**
  ```json
  {
    "statusCode": 201,
    "success": true,
    "data": {
      "shareLinkId": "link-uuid",
      "shareToken": "memora-3d-a8x9k2",
      "shareUrl": "https://memora.style/shares/memora-3d-a8x9k2",
      "expiresAt": "2026-12-01T12:00:00.000Z",
      "status": "ACTIVE"
    }
  }
  ```

### 4.3 `DELETE /api/v1/shares/:shareLinkId` (Thu hồi link chia sẻ)
- **Method:** `DELETE`
- **URL:** `/api/v1/shares/:shareLinkId`
- **Authentication:** Người tạo (User hoặc Guest)
- **Logic:** Cập nhật `status = 'REVOKED'`, `revoked_at = now()`.

---

## 5. Danh sách các file dự kiến tạo / sửa đổi

| Thao tác | Đường dẫn file | Mục đích |
|---|---|---|
| **Create** | `proto/experience/v1/platform.proto` | Khai báo gRPC service `PlatformService` và các RPC `ResolveShareLink`, `CreateShareLink`, `RevokeShareLink` |
| **Create** | `libs/contracts/src/experience/platform.grpc.ts` | Handwritten TypeScript contracts định kiểu mạnh cho Platform domain |
| **Modify** | `libs/contracts/src/index.ts` | Export `platform.grpc` |
| **Modify** | `apps/experience-service/src/grpc/experience-grpc.registry.ts` | Đăng ký proto `experience/v1/platform.proto` |
| **Create** | `apps/experience-service/src/modules/platform/sharing/infrastructure/sharing.repository.ts` | Thao tác Prisma với bảng `platform.share_links` |
| **Create** | `apps/experience-service/src/modules/platform/sharing/application/sharing.service.ts` | Nghiệp vụ tạo token, băm SHA-256, sanitize snapshot, resolve link |
| **Create** | `apps/experience-service/src/modules/platform/sharing/application/sharing.service.spec.ts` | Unit tests cho SharingService |
| **Create** | `apps/experience-service/src/modules/platform/sharing/presentation/sharing.grpc.controller.ts` | gRPC controller nhận request từ Gateway |
| **Create** | `apps/experience-service/src/modules/platform/sharing/sharing.module.ts` | Feature module kết nối Repository, Service, Controller |
| **Modify** | `apps/experience-service/src/modules/platform/platform.module.ts` | Import `SharingModule` |
| **Create** | `apps/api-gateway/src/modules/platform/clients/platform-grpc.client.ts` | Client gRPC gọi sang Experience Platform |
| **Create** | `apps/api-gateway/src/modules/platform/sharing/controllers/sharing.controller.ts` | HTTP REST Controller expose `/api/v1/shares` |
| **Create** | `apps/api-gateway/src/modules/platform/sharing/dto/share-link.dto.ts` | DTO validation Class-Validator |
| **Create** | `apps/api-gateway/src/modules/platform/sharing/docs/sharing.swagger.ts` | Swagger documentation chuẩn OpenAPI |
| **Create** | `apps/api-gateway/src/modules/platform/sharing/sharing.module.ts` | Gateway feature module |
| **Create** | `apps/api-gateway/src/modules/platform/platform.module.ts` | Gateway domain module |
| **Modify** | `apps/api-gateway/src/app.module.ts` | Import `PlatformModule` vào Gateway |

---

## 6. Kế hoạch Kiểm thử & Tiêu chí nghiệm thu (Checklist)

- [ ] Unit Test `sharing.service.spec.ts`:
  - [ ] Tạo link chia sẻ với token ngẫu nhiên, lưu đúng `token_hash`.
  - [ ] Resolve đúng snapshot 3D khi token hợp lệ và cập nhật `last_accessed_at`.
  - [ ] Ném lỗi `NotFoundException` khi token không tồn tại, đã bị revoke hoặc đã hết hạn.
  - [ ] Thu hồi link chia sẻ thành công (`REVOKED`).
- [ ] Gateway & Public Access:
  - [ ] `GET /api/v1/shares/:shareToken` truy cập được công khai mà không cần Bearer token.
  - [ ] Dữ liệu trả về đúng snapshot 3D, không lộ giá tiền hay thông tin cá nhân.
- [ ] CI Gate:
  - [ ] `node scripts/ci/npm-audit-gate.cjs` pass 100%.
  - [ ] `npm run lint:check` pass 0 errors, 0 warnings.
  - [ ] `npx tsc --noEmit` pass 0 errors.
  - [ ] `npm test` pass toàn bộ test suite.
