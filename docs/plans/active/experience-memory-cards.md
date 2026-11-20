# Experience Service — Memory Cards & Digital Memories API Plan

## 1. Metadata

- Branch: `DuyPQ`
- Domain: `memory`
- Service: `experience-service` (Gateway HTTP → Experience gRPC)
- Feature: Memory Cards, PIN Protection, Memory Contents (Media/Text), Access Grants & Shared Access Sessions
- Plan status: `COMPLETED`
- Updated: 2026-11-18
- Source references:
  - `docs/duypq/MEMORA_API_MASTER_SPECIFICATION_v1.0_AGENT.md` (Rows 206–219, `MEMOR-001` .. `MEMOR-014`)
  - `db/MEMORA_BM04_PostgreSQL_74_tables.sql` (schema `memory`, tables `memory_cards`, `memory_contents`, `access_grants`)
  - `apps/experience-service/prisma/schema.prisma`

---

## 2. Scope and References

### 2.1 In Scope
- Toàn bộ 14 API thuộc domain `memory` (`MEMOR-001` đến `MEMOR-014`):
  1. **Thẻ Ký ức (Memory Cards):**
     - `MEMOR-001`: Xem danh sách Memory Cards mà người dùng sở hữu (`GET /api/v1/memory/cards`).
     - `MEMOR-002`: Xem thông tin chi tiết một Memory Card (`GET /api/v1/memory/cards/:cardId`).
     - `MEMOR-003`: Kích hoạt thẻ sau khi khách nhận nhẫn (`POST /api/v1/memory/cards/:cardId/activate`).
  2. **Bảo mật thẻ bằng mã PIN (PIN Protection):**
     - `MEMOR-004`: Thiết lập mã PIN lần đầu cho thẻ (`POST /api/v1/memory/cards/:cardId/pin`).
     - `MEMOR-005`: Đổi mã PIN (`PUT /api/v1/memory/cards/:cardId/pin`).
     - `MEMOR-006`: Reset mã PIN bằng chữ ký xác thực (`POST /api/v1/memory/cards/:cardId/pin/reset`).
  3. **Nội dung Ký ức số (Memory Contents):**
     - `MEMOR-007`: Xem danh sách nội dung kỷ niệm (ảnh, video, văn bản, layout) (`GET /api/v1/memory/cards/:cardId/contents`).
     - `MEMOR-008`: Thêm mới hoặc cập nhật nội dung kỷ niệm (`PUT /api/v1/memory/cards/:cardId/contents`).
     - `MEMOR-009`: Khởi tạo presigned URL upload media lên Object Storage (`POST /api/v1/memory/cards/:cardId/media/initiate`).
  4. **Chia sẻ quyền truy cập cho người thân (Access Grants & Web Sessions):**
     - `MEMOR-010`: Mời người thân/bạn bè cùng truy cập thẻ (`POST /api/v1/memory/cards/:cardId/grants`).
     - `MEMOR-011`: Xem danh sách các lời mời và quyền đã cấp (`GET /api/v1/memory/cards/:cardId/grants`).
     - `MEMOR-012`: Thu hồi quyền truy cập (`DELETE /api/v1/memory/cards/:cardId/grants/:grantId`).
     - `MEMOR-013`: Người được mời đổi invitation token lấy phiên truy cập (`POST /api/v1/memory/invitations/redeem`).
     - `MEMOR-014`: Xem nội dung Memory qua Web Session (không cần tạo tài khoản) (`GET /api/v1/memory/access/:accessSessionId`).

### 2.2 Out of Scope
- Domain `platform` (Notifications, AI conversations, LightRAG, Evidence assets, Audit logs, System configurations) sẽ được lập kế hoạch trong giai đoạn sau.
- Vật lý NFC chip trên nhẫn hoặc phần cứng đọc thẻ (Mobile App WebAR / NFC reader thuộc về frontend client).

---

## 3. Database Constraints & Schema Rules

Dựa trên baseline PostgreSQL schema `memory`:

```sql
-- 1. memory.memory_cards
ALTER TABLE memory.memory_cards ADD CONSTRAINT memory_memory_cards_a875f08b_ck 
  CHECK (status IN ('PENDING', 'ACTIVE', 'DISABLED', 'DELETED'));
ALTER TABLE memory.memory_cards ADD CONSTRAINT memory_memory_cards_e5c0cf0c_ck 
  CHECK (pin_failed_attempts >= 0);
CREATE UNIQUE INDEX memory_memory_cards_ring_item_id_13e03f7_uq 
  ON memory.memory_cards (ring_item_id);

-- 2. memory.memory_contents
ALTER TABLE memory.memory_contents ADD CONSTRAINT memory_memory_contents_e7c67353_ck 
  CHECK (content_type IN ('TEXT', 'IMAGE', 'AUDIO', 'VIDEO'));
ALTER TABLE memory.memory_contents ADD CONSTRAINT memory_memory_contents_cfdbf519_ck 
  CHECK ((content_type='TEXT' AND text_content IS NOT NULL AND btrim(text_content)<>'') 
      OR (content_type<>'TEXT' AND asset_key IS NOT NULL));
ALTER TABLE memory.memory_contents ADD CONSTRAINT memory_memory_contents_82de98d3_ck 
  CHECK (sort_order >= 0);
ALTER TABLE memory.memory_contents ADD CONSTRAINT memory_memory_contents_fa8d4372_ck 
  CHECK (status IN ('ACTIVE', 'HIDDEN', 'DELETED'));

-- 3. memory.access_grants
ALTER TABLE memory.access_grants ADD CONSTRAINT memory_access_grants_b06aab3c_ck 
  CHECK (status IN ('PENDING', 'ACTIVE', 'REVOKED', 'EXPIRED'));
```

---

## 4. Danh sách API chi tiết (14 APIs)

### [MEMOR-001] GET /api/v1/memory/cards
- **Chức năng:** Khách hàng xem danh sách Memory Cards mà mình sở hữu.
- **Actor:** `Customer` (JWT qua Gateway, lấy `customerIdentityId` từ `toVerifiedActor`).
- **Input:** Query pagination (page, limit).
- **Output:** Danh sách thẻ kèm trạng thái (`PENDING`, `ACTIVE`, `DISABLED`), cờ `hasPin` (boolean), số lần thử PIN sai, ngày kích hoạt.
- **gRPC Method:** `MemoryService.ListMyCards(ListMyCardsRequest)`
- **Trạng thái:** `PROPOSED`

### [MEMOR-002] GET /api/v1/memory/cards/:cardId
- **Chức năng:** Xem thông tin chi tiết một thẻ ký ức.
- **Actor:** `Customer` (Chủ sở hữu hoặc người được cấp quyền `access_grants`).
- **Input:** `cardId` (UUID v4).
- **Output:** Chi tiết card, `ringItemId`, trạng thái, `isOwner`, `isLocked`, ngày tạo.
- **gRPC Method:** `MemoryService.GetCardDetail(GetCardDetailRequest)`
- **Trạng thái:** `PROPOSED`

### [MEMOR-003] POST /api/v1/memory/cards/:cardId/activate
- **Chức năng:** Kích hoạt thẻ sau khi khách hàng đã nhận bàn giao nhẫn thành công (Order `DELIVERED`).
- **Actor:** `Customer` (Chủ sở hữu).
- **Input:** `cardId` (UUID v4), body tuỳ chọn `{ initialPin?: string }`.
- **Quy tắc:** Thẻ chuyển từ `PENDING` sang `ACTIVE`. Gán `activated_at = NOW()`.
- **gRPC Method:** `MemoryService.ActivateCard(ActivateCardRequest)`
- **Trạng thái:** `PROPOSED`

### [MEMOR-004] POST /api/v1/memory/cards/:cardId/pin
- **Chức năng:** Thiết lập mã PIN lần đầu (4-6 chữ số) cho thẻ ký ức.
- **Actor:** `Customer` (Chủ sở hữu).
- **Input:** `{ pin: string }` (4–6 ký tự số).
- **Quy tắc:** Băm bằng `hash-wasm` (Argon2id hoặc PBKDF2/bcrypt) lưu vào `pin_hash`. Chỉ áp dụng khi `pin_hash IS NULL`.
- **gRPC Method:** `MemoryService.SetupPin(SetupPinRequest)`
- **Trạng thái:** `PROPOSED`

### [MEMOR-005] PUT /api/v1/memory/cards/:cardId/pin
- **Chức năng:** Đổi mã PIN thẻ.
- **Actor:** `Customer` (Chủ sở hữu).
- **Input:** `{ currentPin: string, newPin: string }`.
- **Quy tắc:** Xác minh `currentPin` khớp `pin_hash`. Cập nhật `pin_updated_at = NOW()`, reset `pin_failed_attempts = 0`.
- **gRPC Method:** `MemoryService.ChangePin(ChangePinRequest)`
- **Trạng thái:** `PROPOSED`

### [MEMOR-006] POST /api/v1/memory/cards/:cardId/pin/reset
- **Chức năng:** Mở khóa hoặc Reset PIN khi quên mã (dành cho chủ sở hữu).
- **Actor:** `Customer` (Chủ sở hữu).
- **Input:** `{ newPin: string, verificationCode: string }`.
- **Quy tắc:** Xác minh danh tính chủ sở hữu (OTP qua email chủ sở hữu), reset số lần nhập sai `pin_failed_attempts = 0`, gỡ `pin_locked_until = NULL`.
- **gRPC Method:** `MemoryService.ResetPin(ResetPinRequest)`
- **Trạng thái:** `PROPOSED`

### [MEMOR-007] GET /api/v1/memory/cards/:cardId/contents
- **Chức năng:** Xem nội dung Ký ức số (hình ảnh, video, văn bản kỷ niệm).
- **Actor:** Chủ sở hữu hoặc người được cấp quyền (yêu cầu gửi kèm `pin` hoặc `accessSessionToken` hợp lệ).
- **Input:** Header/Body/Query `{ pin?: string }`.
- **Quy tắc:** Nếu thẻ có PIN, phải xác thực PIN đúng; nếu sai tăng `pin_failed_attempts` (khóa 15 phút nếu sai quá 5 lần). Trả về danh sách `memory_contents` sắp xếp theo `sort_order`.
- **gRPC Method:** `MemoryService.ListCardContents(ListCardContentsRequest)`
- **Trạng thái:** `PROPOSED`

### [MEMOR-008] PUT /api/v1/memory/cards/:cardId/contents
- **Chức năng:** Tạo mới hoặc cập nhật một mục kỷ niệm (Text, Image, Video, Audio).
- **Actor:** `Customer` (Chủ sở hữu).
- **Input:** `{ items: Array<{ id?: string, contentType: 'TEXT'|'IMAGE'|'VIDEO'|'AUDIO', title?: string, textContent?: string, assetKey?: string, sortOrder?: number }> }`.
- **Quy tắc:** Đảm bảo toàn vẹn check constraint (`TEXT` phải có `text_content`, loại khác phải có `asset_key`).
- **gRPC Method:** `MemoryService.UpdateCardContents(UpdateCardContentsRequest)`
- **Trạng thái:** `PROPOSED`

### [MEMOR-009] POST /api/v1/memory/cards/:cardId/media/initiate
- **Chức năng:** Khởi tạo presigned URL để client tải trực tiếp hình ảnh/video kỷ niệm lên Object Storage (S3/MinIO).
- **Actor:** `Customer` (Chủ sở hữu).
- **Input:** `{ fileName: string, contentType: string, fileSize: number }`.
- **Output:** `{ uploadUrl: string, assetKey: string, expiresAt: string }`.
- **gRPC Method:** `MemoryService.InitiateMediaUpload(InitiateMediaUploadRequest)`
- **Trạng thái:** `PROPOSED`

### [MEMOR-010] POST /api/v1/memory/cards/:cardId/grants
- **Chức năng:** Mời người thân/bạn bè truy cập Memory Card qua Email.
- **Actor:** `Customer` (Chủ sở hữu).
- **Input:** `{ granteeEmail: string, ttlDays?: number }`.
- **Output:** Tạo bản ghi `access_grants` trạng thái `PENDING`, sinh mã `invitationToken` ngẫu nhiên bảo mật (HMAC/SHA256).
- **gRPC Method:** `MemoryService.CreateAccessGrant(CreateAccessGrantRequest)`
- **Trạng thái:** `PROPOSED`

### [MEMOR-011] GET /api/v1/memory/cards/:cardId/grants
- **Chức năng:** Xem danh sách người đã được chia sẻ quyền truy cập.
- **Actor:** `Customer` (Chủ sở hữu).
- **Output:** Danh sách các email, trạng thái (`PENDING`, `ACTIVE`, `REVOKED`), ngày mời, ngày hết hạn.
- **gRPC Method:** `MemoryService.ListAccessGrants(ListAccessGrantsRequest)`
- **Trạng thái:** `PROPOSED`

### [MEMOR-012] DELETE /api/v1/memory/cards/:cardId/grants/:grantId
- **Chức năng:** Thu hồi quyền truy cập của một người.
- **Actor:** `Customer` (Chủ sở hữu).
- **Quy tắc:** Cập nhật trạng thái `REVOKED`, gán `revoked_at = NOW()`, `revoked_by_user_id`.
- **gRPC Method:** `MemoryService.RevokeAccessGrant(RevokeAccessGrantRequest)`
- **Trạng thái:** `PROPOSED`

### [MEMOR-013] POST /api/v1/memory/invitations/redeem
- **Chức năng:** Người nhận thư mời đổi `invitationToken` lấy phiên truy cập Web (`accessSessionId`).
- **Actor:** Khách vãng lai / Người nhận thư mời (Public hoặc Verified Guest).
- **Input:** `{ invitationToken: string }`.
- **Quy tắc:** Kiểm tra token hợp lệ, chưa hết hạn, cập nhật `access_grants` sang `ACTIVE`. Trả về `accessSessionId` kèm TTL.
- **gRPC Method:** `MemoryService.RedeemInvitation(RedeemInvitationRequest)`
- **Trạng thái:** `PROPOSED`

### [MEMOR-014] GET /api/v1/memory/access/:accessSessionId
- **Chức năng:** Xem nội dung Ký ức số thông qua phiên Web Session (không bắt buộc có tài khoản MEMORA).
- **Actor:** Khách có phiên web session hợp lệ (Public / Guest).
- **Input:** Header/Param `{ accessSessionId: string, pin?: string }`.
- **Quy tắc:** Nếu thẻ có PIN thì phải cung cấp PIN đúng; trả về nội dung `memory_contents` đã được làm sạch (sanitized).
- **gRPC Method:** `MemoryService.GetMemoryBySession(GetMemoryBySessionRequest)`
- **Trạng thái:** `PROPOSED`

---

## 5. Danh mục File dự kiến tạo và chỉnh sửa

### 5.1 Protobuf & Contracts
- Tạo mới: `proto/experience/v1/memory.proto`
- Tạo mới: `libs/contracts/src/experience/memory.grpc.ts`
- Cập nhật: `libs/contracts/src/index.ts` (export experience contracts)

### 5.2 API Gateway (`apps/api-gateway/src/modules/memory/`)
- Cấu trúc phân lớp:
  - `clients/`: `memory-grpc.client.ts`
  - `cards/`:
    - `controllers/memory-cards.controller.ts`
    - `dto/memory-card.dto.ts`
    - `docs/memory-cards.swagger.ts`
    - `mappers/memory-cards.mapper.ts`
  - `contents/`:
    - `controllers/memory-contents.controller.ts`
    - `dto/memory-content.dto.ts`
    - `docs/memory-contents.swagger.ts`
    - `mappers/memory-contents.mapper.ts`
  - `grants/`:
    - `controllers/memory-grants.controller.ts`
    - `dto/memory-grant.dto.ts`
    - `docs/memory-grants.swagger.ts`
    - `mappers/memory-grants.mapper.ts`
  - `memory.module.ts`: Khai báo và import vào `app.module.ts`.

### 5.3 Experience Service (`apps/experience-service/src/modules/memory/`)
- Tuân thủ nghiêm ngặt `Domain -> Feature -> Layer`:
  - `cards/`:
    - `presentation/memory-card.grpc.controller.ts` (kèm `ExperienceInternalGrpcAuthGuard`)
    - `application/memory-card.service.ts`
    - `infrastructure/memory-card.repository.ts`
  - `contents/`:
    - `presentation/memory-content.grpc.controller.ts`
    - `application/memory-content.service.ts`
    - `infrastructure/memory-content.repository.ts`
  - `grants/`:
    - `presentation/memory-grant.grpc.controller.ts`
    - `application/memory-grant.service.ts`
    - `infrastructure/memory-grant.repository.ts`
- Cập nhật:
  - `apps/experience-service/src/modules/memory/memory.module.ts`
  - `apps/experience-service/src/grpc/experience-grpc.registry.ts` (đăng ký `proto/experience/v1/memory.proto`)

---

## 6. Quyết định Kỹ thuật (Technical Decisions)

1. **Thuật toán Băm mã PIN (`pin_hash`):**
   - Sử dụng thư viện `hash-wasm` (đã có sẵn trong `package.json` của repo) với thuật toán **Argon2id** (hoặc `bcrypt` salt rounds 10), đảm bảo mã PIN 4-6 số không thể bị brute-force ngay cả khi database bị dump.
2. **Cơ chế chống Brute-force mã PIN:**
   - Mỗi lần xác thực sai: `pin_failed_attempts += 1`.
   - Nếu `pin_failed_attempts >= 5`: gán `pin_locked_until = NOW() + INTERVAL '15 minutes'`.
   - Nếu nhập đúng: reset `pin_failed_attempts = 0`.
3. **Mã Invitation Token (`invitation_token_hash`):**
   - Client nhận link mời có token ngẫu nhiên dạng `hex` 64 ký tự (tạo bằng `crypto.randomBytes(32)`).
   - Trong database chỉ lưu hash SHA-256 của token (`invitation_token_hash`), chống lộ token khi đọc trộm database.
4. **Presigned Upload Media:**
   - Hỗ trợ định dạng ảnh/video/audio (JPEG, PNG, MP4, MP3). Key lưu trữ chuẩn: `memories/${cardId}/${contentId}/${timestamp}.${ext}`.

---

## 7. Kế hoạch triển khai tuần tự theo từng Slice (Implementation Checklist)

- [x] **Slice 1:** Proto & Contracts definition (`proto/experience/v1/memory.proto` & `libs/contracts/src/experience/memory.grpc.ts`).
- [x] **Slice 2:** Memory Cards Management (`MEMOR-001`, `MEMOR-002`, `MEMOR-003`).
- [x] **Slice 3:** PIN Protection & Security (`MEMOR-004`, `MEMOR-005`, `MEMOR-006`).
- [x] **Slice 4:** Memory Contents & Media Upload (`MEMOR-007`, `MEMOR-008`, `MEMOR-009`).
- [x] **Slice 5:** Sharing, Access Grants & Web Session Access (`MEMOR-010`, `MEMOR-011`, `MEMOR-012`, `MEMOR-013`, `MEMOR-014`).
- [x] **Slice 6:** Verification & End-to-End manual testing report.
