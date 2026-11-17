# Plan: Commerce Service Design Share Links (DESIG-009, DESIG-010)

## 1. Context & Business Scope
Theo tài liệu chuẩn [MEMORA_API_MASTER_SPECIFICATION_v1.0_AGENT.md](file:///d:/BTFPT/DoAn/Source/memora-backend/docs/duypq/MEMORA_API_MASTER_SPECIFICATION_v1.0_AGENT.md):
- **DESIG-009 (`POST /api/v1/design/drafts/:draftId/share-links`)**: Khách hàng tạo đường link / mã chia sẻ (share link) cho bản thiết kế nhẫn 3D (`ring_design_drafts`):
  - Kiểm tra quyền sở hữu bản draft (`owner_user_id` hoặc `guest_session_id`).
  - Sinh mã bảo mật (unique code), băm lưu vào bảng `design.design_codes` (`code_hash`, `status = 'ACTIVE'`, `expires_at = now() + 7 days`).
  - Trả về: `linkId`, `code`, `shareUrl`, `expiresAt`, `status`.
- **DESIG-010 (`DELETE /api/v1/design/drafts/:draftId/share-links/:linkId`)**: Khách hàng hủy / thu hồi link chia sẻ:
  - Kiểm tra quyền sở hữu bản draft tương ứng.
  - Cập nhật bản ghi `design_codes`: `status = 'REVOKED'`, `revoked_at = new Date()`.
  - Trả về: `success: true`.

---

## 2. Technical Architecture & Component Design

```
[ Client ]
    │ HTTP
    ▼
[ API Gateway ]
  └── DesignDraftController
        ├── POST /api/v1/design/drafts/:draftId/share-links (DESIG-009)
        └── DELETE /api/v1/design/drafts/:draftId/share-links/:linkId (DESIG-010)
        │ gRPC (CartService)
        ▼
[ Commerce Service ]
  ├── presentation/grpc/cart.grpc.controller.ts
  ├── application/cart/cart.service.ts
  │     ├── createDesignShareLink(req)
  │     └── revokeDesignShareLink(req)
  └── repositories/cart.repository.ts
        ├── createDesignCode(draftId, codeHash, expiresAt)
        └── revokeDesignCode(draftId, linkId)
```

---

## 3. Detailed Data & Protocol Specification

### 3.1. Protobuf (`proto/commerce/v1/cart.proto`)
Bổ sung 2 RPCs vào `service CartService`:
```protobuf
rpc CreateDesignShareLink (CreateDesignShareLinkRequest) returns (CreateDesignShareLinkResponse);
rpc RevokeDesignShareLink (RevokeDesignShareLinkRequest) returns (RevokeDesignShareLinkResponse);
```

Messages:
- `CreateDesignShareLinkRequest`: `draft_id`, `actor` (VerifiedActor), `expires_in_days` (optional, default 7).
- `CreateDesignShareLinkResponse`: `link_id`, `code`, `share_url`, `status`, `expires_at`.
- `RevokeDesignShareLinkRequest`: `draft_id`, `link_id`, `actor` (VerifiedActor).
- `RevokeDesignShareLinkResponse`: `success`, `message`.

### 3.2. Cart Repository & Domain Invariants
- `createDesignCode`: Tạo record trong `design.design_codes`. Sinh random alphanumeric token 12 ký tự (vd: `MMR-A8X9-2K1Z`), lưu `code_hash = sha256(raw_code)` hoặc lưu raw code vào `code_hash`.
- `revokeDesignCode`: Tìm `design_codes` có `id = linkId` và `ring_design_draft_id = draftId`. Update `status = 'REVOKED'`, `revoked_at = now()`.

---

## 4. Planned Files to Create & Modify

1. **Protobuf & Contracts**:
   - `proto/commerce/v1/cart.proto` (thêm 2 RPCs và 4 messages)
   - `libs/contracts/src/commerce/cart.grpc.ts` (thêm types & client/handler methods)
2. **Commerce Service**:
   - `apps/commerce-service/src/repositories/cart.repository.ts` (thêm `findDraftById`, `createDesignShareCode`, `revokeDesignShareCode`)
   - `apps/commerce-service/src/application/cart/cart.service.ts` (thêm logic nghiệp vụ `createDesignShareLink`, `revokeDesignShareLink`)
   - `apps/commerce-service/src/presentation/grpc/cart.grpc.controller.ts` (gRPC delegation)
   - `apps/commerce-service/src/application/cart/cart.service.spec.ts` (bổ sung unit tests)
3. **API Gateway**:
   - `apps/api-gateway/src/modules/design/clients/cart-grpc.client.ts` (thêm 2 client methods)
   - `apps/api-gateway/src/modules/design/controllers/design-draft.controller.ts` (thêm 2 REST endpoints)
   - `apps/api-gateway/src/modules/design/dto/design-share.dto.ts` (DTOs & swagger)

---

## 5. Verification Gate
1. `npm run proto:check`: Verify protobuf syntax.
2. `npm run typecheck`: 0 lỗi strict TypeScript.
3. `npm run boundaries`: 0 vi phạm kiến trúc.
4. Unit tests: Chạy toàn bộ tests trong `cart.service.spec.ts`.
5. Build test: `nest build commerce-service` và `nest build api-gateway`.
