# Kế hoạch Triển khai: Quản trị Nhật ký Kiểm toán (Audit Logs) trong Platform

## 1. Metadata

- **Branch:** `DuyPQ`
- **Domain:** `platform`
- **Feature:** `audit`
- **Service:** `experience-service` (Gateway HTTP → Experience gRPC)
- **API Spec References:**
  - `PLATF-017`: `GET /api/v1/admin/audit-logs` (Tra cứu nhật ký kiểm toán hệ thống)
  - `PLATF-018`: `RecordAuditEvent` (Internal gRPC Contract nhận audit event từ các service)
- **Database Table:** `platform.audit_logs` (schema `platform` trong `apps/experience-service/prisma/schema.prisma`)
- **Plan Status:** `COMPLETED`
- **Date:** 2026-11-24

---

## 2. Bối cảnh & Mục tiêu Nghiệp vụ

### 2.1 Bối cảnh
- Hệ thống MEMORA yêu cầu một kho lưu trữ tập trung bất biến (append-only audit log) để theo dõi các hành động nhạy cảm trong hệ thống:
  - Phân quyền, gán/thu hồi role trong IAM.
  - Tạo đơn, thanh toán cọc P1/P2 trong Commerce.
  - Ký nhận thu nguồn sinh trắc học vân tay / âm thanh trong Personalization.
  - Phân công sản xuất, kiểm tra chất lượng, xuất xưởng trong Operations.
  - Giao hàng và thay đổi người giữ hàng (chain of custody) trong Fulfillment.
- Bảng **`platform.audit_logs`** đã được định nghĩa sẵn trong cơ sở dữ liệu của `experience-service`.
- Người quản trị (`ADMIN`, `MANAGER`) cần tra cứu danh sách audit logs với đầy đủ bộ lọc để kiểm toán và truy vết lỗi/hành vi bất thường.

### 2.2 Mục tiêu kỹ thuật
1. **[PLATF-018] Internal gRPC Service (`PlatformAuditService`):**
   - Cung cấp RPC `RecordAuditEvent(RecordAuditEventRequest)` để tất cả các microservice nội bộ gửi bản ghi kiểm toán về `experience-service`.
   - Lưu trữ an toàn vào bảng `platform.audit_logs`.
2. **[PLATF-017] Gateway HTTP API (`GET /api/v1/admin/audit-logs`):**
   - Đảm bảo an ninh nghiêm ngặt: yêu cầu xác thực JWT + quyền hạn quản trị (`ADMIN` / `MANAGER` hoặc permission `IAM_SECURITY_AUDIT_READ`).
   - Cung cấp bộ lọc đa chiều:
     - `actorUserId`: Lọc theo người thực hiện.
     - `entityType`: Lọc theo loại đối tượng (`ORDER`, `USER`, `PAYMENT`, `DELIVERY`...).
     - `action`: Lọc theo hành vi cụ thể (`USER_ROLE_ASSIGNED`, `ORDER_PAID`...).
     - `resultStatus`: `SUCCESS`, `FAILED`, `REJECTED`.
     - `fromDate` / `toDate`: Lọc theo khoảng thời gian tạo (`created_at`).
     - Phân trang chuẩn (`page`, `limit`).
   - Trả về danh sách log kèm metadata và phân trang `meta`.

---

## 3. Database Schema Reference (`platform.audit_logs`)

Cấu trúc từ `apps/experience-service/prisma/schema.prisma`:

```prisma
model audit_logs {
  id                         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  actor_user_id              String?  @db.Uuid
  action                     String   @db.VarChar(100)
  entity_type                String   @db.VarChar(50)
  entity_id                  String?  @db.Uuid
  request_id                 String?  @db.VarChar(120)
  trace_id                   String?  @db.VarChar(120)
  result_status              String?  @db.VarChar(20)
  change_summary_json        Json?    @default("{}")
  metadata_json              Json?    @default("{}")
  created_at                 DateTime @default(now()) @db.Timestamptz(6)

  @@schema("platform")
}
```

---

## 4. Đặc tả Hợp đồng & API

### 4.1 Hợp đồng Proto & gRPC (`proto/experience/v1/platform.proto`)
Mở rộng `platform.proto` đã tạo trước đó để bổ sung `PlatformAuditService`:

```protobuf
service PlatformAuditService {
  rpc ListAuditLogs (ListAuditLogsRequest) returns (ListAuditLogsResponse);
  rpc RecordAuditEvent (RecordAuditEventRequest) returns (RecordAuditEventResponse);
}

message AuditLogItem {
  string id = 1;
  string actor_user_id = 2;
  string action = 3;
  string entity_type = 4;
  string entity_id = 5;
  string request_id = 6;
  string trace_id = 7;
  string result_status = 8;
  string change_summary_json = 9;
  string metadata_json = 10;
  string created_at = 11;
}

message ListAuditLogsRequest {
  common.v1.Actor actor = 1;
  string actor_user_id = 2;
  string entity_type = 3;
  string action = 4;
  string result_status = 5;
  string from_date = 6;
  string to_date = 7;
  int32 page = 8;
  int32 limit = 9;
}

message ListAuditLogsResponse {
  repeated AuditLogItem items = 1;
  int32 total = 2;
  int32 page = 3;
  int32 limit = 4;
  int32 total_pages = 5;
}

message RecordAuditEventRequest {
  string actor_user_id = 1;
  string action = 2;
  string entity_type = 3;
  string entity_id = 4;
  string request_id = 5;
  string trace_id = 6;
  string result_status = 7;
  string change_summary_json = 8;
  string metadata_json = 9;
}

message RecordAuditEventResponse {
  string id = 1;
  string created_at = 2;
}
```

### 4.2 [PLATF-017] REST API tại Gateway
- **Endpoint:** `GET /api/v1/admin/audit-logs`
- **Bảo mật:**
  - `@RequirePermissions('IAM_SECURITY_AUDIT_READ')` hoặc `@RequireRoles('ADMIN', 'MANAGER')`
  - `@CurrentUser()` xác thực định danh Admin.
- **Query DTO:**
  - `actorUserId?: string` (UUID)
  - `entityType?: string`
  - `action?: string`
  - `resultStatus?: string`
  - `fromDate?: string` (ISO Date string)
  - `toDate?: string` (ISO Date string)
  - `page?: number` (default: 1, min: 1)
  - `limit?: number` (default: 20, min: 1, max: 100)
- **Response Format:**
  ```json
  {
    "statusCode": 200,
    "success": true,
    "data": {
      "items": [
        {
          "id": "11111111-1111-4111-8111-111111111111",
          "actorUserId": "22222222-2222-4222-8222-222222222222",
          "action": "USER_ROLE_ASSIGNED",
          "entityType": "USER",
          "entityId": "33333333-3333-4333-8333-333333333333",
          "requestId": "req-xyz-123",
          "traceId": "trace-abc-456",
          "resultStatus": "SUCCESS",
          "changeSummary": {
            "assignedRole": "STAFF"
          },
          "metadata": {
            "ip": "127.0.0.1"
          },
          "createdAt": "2026-11-24T14:00:00.000Z"
        }
      ],
      "meta": {
        "page": 1,
        "limit": 20,
        "total": 1,
        "totalPages": 1
      }
    }
  }
  ```

---

## 5. Cấu trúc File Dự kiến Tạo & Sửa

### 5.1 Proto & Contracts
- `proto/experience/v1/platform.proto`: Bổ sung service `PlatformAuditService`.
- `libs/contracts/src/experience/platform.grpc.ts`: Thêm interfaces cho Audit (Request/Response, Client, Controller).

### 5.2 Microservice: `experience-service`
Đúng chuẩn layer theo Rule 13:
- `apps/experience-service/src/modules/platform/audit/`:
  - `infrastructure/audit.repository.ts`: Query Prisma với dynamic where filter và phân trang, insert append-only.
  - `application/audit.service.ts`: Xử lý business logic, validate actor & date ranges, mapping JSON.
  - `presentation/audit.grpc.controller.ts`: gRPC controller với `ExperienceInternalGrpcAuthGuard`.
  - `audit.module.ts`: Đăng ký providers & controllers.
- `apps/experience-service/src/modules/platform/platform.module.ts`: Import `AuditModule`.

### 5.3 API Gateway: `api-gateway`
- `apps/api-gateway/src/modules/platform/audit/`:
  - `clients/platform-audit-grpc.client.ts`: gRPC client gọi sang `experience-service`.
  - `controllers/admin-audit.controller.ts`: Controller REST `GET /api/v1/admin/audit-logs`.
  - `dto/list-audit-logs.query.dto.ts`: Validation query parameters.
  - `dto/audit-log.response.dto.ts`: Response types.
  - `docs/admin-audit.swagger.ts`: Swagger API documentation.
  - `audit.module.ts`: Đăng ký module.
- `apps/api-gateway/src/modules/platform/platform.module.ts`: Import `AuditModule`.

---

## 6. Kế hoạch Kiểm thử & Verification Gates

1. **Unit Test Service:** `audit.service.spec.ts` trong `experience-service`:
   - Lọc theo từng điều kiện (actorUserId, entityType, action, resultStatus, date range).
   - Phân trang tính đúng `totalPages`.
   - Ghi nhận `RecordAuditEvent` thành công.
2. **Unit Test Controller:** `admin-audit.controller.spec.ts` trong `api-gateway`:
   - Xác thực truyền đúng params từ HTTP request sang gRPC client.
3. **Repo Verification Gates:**
   - `npm run lint:check`: 0 lỗi.
   - `npx tsc --noEmit`: 0 lỗi.
   - `npm test`: Tất cả test suites pass.
