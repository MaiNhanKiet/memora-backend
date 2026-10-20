# MEMORA — IAM Me & Guest Identity API Plan (APPROVED)

> **Mục đích:** Tài liệu duy nhất để phê duyệt và triển khai 7 API trên nhánh `feat/iam-me-guest-identity` theo `.cursor/skills/plan-api`, `implement-api`, `review-api`.
>
> **Phê duyệt:** Chủ dự án đã yêu cầu phê duyệt toàn bộ kế hoạch qua cuộc trò chuyện ngày **2026-10-20** sau khi xác nhận phạm vi Guest Order được chuyển sang feature Commerce sau. **D1–D10 và 7 API dưới đây được APPROVED**. Approval là quyền triển khai theo contract, **không đồng nghĩa đã code, test PASS, review PASS hoặc deploy**.

## 1. Metadata & Approval Record

| Trường | Giá trị |
| --- | --- |
| Repository | `MaiNhanKiet/memora-backend` |
| Branch | `feat/iam-me-guest-identity` (base `dev`) |
| Domain / feature | `iam` / `iam-me-guest-identity` |
| HTTP owner | `apps/api-gateway` |
| Business / DB owner | `apps/iam-service` |
| File path trong repo | `docs/plans/active/iam-me-guest-identity.md` |
| Plan status | `APPROVED` |
| Approval decision | `APPROVED` — D1–D10 và đủ 7 API |
| Approved API IDs | `IAM-009`, `IAM-010`, `IAM-023`, `IAM-011`, `IAM-012`, `IAM-013`, `IAM-014` |
| Excluded | `IAM-022` — `DEFERRED`, **không** thuộc nhánh này |
| Date prepared | 2026-10-20 |
| Approver / date | Chủ dự án MEMORA (xác nhận trực tiếp trong cuộc trò chuyện) / 2026-10-20 |

### Approval Record — Đã xác nhận

- **Quyết định:** **APPROVED** đối với **D1–D10** và **IAM-009, IAM-010, IAM-023, IAM-011, IAM-012, IAM-013, IAM-014**, theo đúng nội dung trong tài liệu này.
- **Bằng chứng chấp thuận:** Chủ dự án trong cuộc trò chuyện ngày **2026-10-20** đã chọn tách Guest Order/Commerce sang feature sau và yêu cầu: **“phê duyệt giúp tôi luôn”**. Đây là phê duyệt phạm vi, phương án và contract của plan, **không phải** bằng chứng đã chạy test hay đã triển khai.
- **Ranh giới quan trọng:** D4/D7/D10 chỉ tạo, xác minh và liên kết **guest identity mới**; không claim `CustomerIdentity` hay Guest Order đã có, không dùng email trùng khớp làm bằng chứng sở hữu. Tích hợp Commerce sẽ được lập kế hoạch, duyệt và implement riêng.
- **IAM-009:** `APPROVED` cho route canonical `GET /api/v1/me`. Ngày 2026-10-20 chủ dự án yêu cầu **xóa** `GET /api/v1/auth/me` ngay, không giữ alias.
- **IAM-022:** vẫn `DEFERRED`, không thuộc phạm vi đã duyệt.
- **Quy tắc thực thi:** Từng API bắt đầu ở trạng thái **NOT IMPLEMENTED** (ngoại trừ logic IAM-009 đã tồn tại), triển khai từng API một theo `implement-api`, chạy kiểm thử rồi `review-api`. Không tự commit/push/merge/deploy.

### Invariants được duyệt cùng contract (không được bỏ qua)

- Gateway xử lý HTTP, validation, Swagger, gRPC mapping; IAM Service xử lý chính sách, Redis và dữ liệu `iam`. Không dùng Prisma trực tiếp trong Gateway.
- Dùng một `IamGrpcClient` hiện có; proto thay đổi **additive**, cập nhật thủ công `libs/contracts/src/iam/iam.grpc.ts` và export cần thiết.
- Không tạo permission `PROFILE_READ`/`PROFILE_UPDATE` vì chúng **không có trong RBAC v1**; các API `/me` dùng verified JWT + kiểm tra *self* trong IAM.
- Không suy ra ownership từ email/phone trùng khớp, identity UUID không có proof, hoặc `userId` do frontend gửi; không tự gán role CUSTOMER hay tạo User từ guest OTP.
- Không đổi các endpoint password, Google OAuth, register, hoặc 14 IAM Admin APIs. Không tạo thêm service, không commit/merge/deploy hay chạy migration production khi chưa được yêu cầu.
- Giữ success envelope hiện tại `{statusCode, message, data, meta?}` và chuẩn lỗi/observability hiện có; không log password, OTP, bearer/guestProof, email đầy đủ hoặc secret.

## 2. API Inventory & Approval Status

| API ID | Method | Canonical endpoint | Purpose | Permission / auth | Approval status |
| --- | --- | --- | --- | --- | --- |
| IAM-009 | GET | `/api/v1/me` | Xem profile hiện tại; route cũ đã xóa | JWT, self | `APPROVED` — hard cut of EXISTING `/auth/me` |
| IAM-010 | PATCH | `/api/v1/me` | Cập nhật tên và số điện thoại | JWT, self | `APPROVED` |
| IAM-023 | GET | `/api/v1/me/permissions` | Xem role & permission hiệu lực | JWT, self | `APPROVED` |
| IAM-011 | POST | `/api/v1/identities/guest/verify/request` | Yêu cầu OTP cho danh tính khách mới | Public + abuse protection | `APPROVED` |
| IAM-012 | POST | `/api/v1/identities/guest/verify/confirm` | Xác minh OTP và cấp guest proof | Public + challenge | `APPROVED` |
| IAM-013 | GET | `/api/v1/identities/me` | Xem primary identity đã liên kết | JWT, self | `APPROVED` |
| IAM-014 | POST | `/api/v1/identities/link-account` | Liên kết guest identity với User hiện tại | JWT + proof | `APPROVED` |

**Đã duyệt:** cả bảy API ở bảng trên đã `APPROVED`; IAM-009 là thay đổi route của API đã tồn tại, không phải endpoint nghiệp vụ mới. Tình trạng code/kiểm thử vẫn theo mục 8.

**Ngoài phạm vi:** IAM-022 `PUT /api/v1/admin/roles/{roleCode}/permissions` giữ `DEFERRED`, không implement cùng nhánh vì đã có API POST/DELETE cho từng grant.

## 3. Approval Decisions — D1 đến D10

Các quyết định D1–D10 dưới đây đã được chủ dự án **APPROVED** ngày 2026-10-20. Nội dung từng quyết định là contract đã duyệt; các bước kỹ thuật chưa triển khai không được đánh dấu hoàn thành.

| ID | Affects | Approved decision | Status |
| --- | --- | --- | --- |
| D1 | IAM-009 | Canonical `GET /api/v1/me`. Chủ dự án sửa quyết định ngày 2026-10-20: **xóa ngay** `GET /api/v1/auth/me`, không giữ alias. Không đổi Auth route khác. | `APPROVED` — revised |
| D2 | IAM-010 | Chỉ cho PATCH `fullName` (trim, 1–150 ký tự) và `phone` (chuỗi hợp lệ tối đa 30 hoặc `null` để xóa); omit field nghĩa là không sửa; từ chối body rỗng, field khác và giá trị không hợp lệ. | `APPROVED` |
| D3 | IAM-023 | Trả HTTP 200 `data: { userId, status, roleCodes, permissionCodes }`; arrays unique, sort ổn định; dữ liệu quyền hiệu lực lấy từ `AuthorizationService.getEffectiveAuthorization` tại thời điểm gọi, không lấy từ client. | `APPROVED` |
| D4 | IAM-011,012,014 | **Phase này chỉ xử lý guest identity mới tạo bởi IAM từ OTP email**, không claim hay xác minh identity có sẵn qua email. Request chỉ nhận `contactEmail`, tạo challenge gắn email chuẩn hóa; `CustomerIdentity` được tạo sau OTP thành công. Identity có sẵn/Guest Order tạo từ Commerce cần tích hợp/proof server-issued riêng về sau. | `APPROVED` |
| D5 | IAM-011,012 | OTP 6 số, TTL 300 giây, tối đa 5 lần sai, resend cooldown 60 giây, rate limit theo IP + hash email, mẫu email guest riêng, Redis namespace riêng và hash OTP; trả 202 với challengeId, không tiết lộ tài khoản tồn tại. Các thông số trên **đã được phê duyệt cho feature này**; chưa phải cấu hình đã triển khai. | `APPROVED` |
| D6 | IAM-012,014 | Sau OTP tạo `guestProof` ngẫu nhiên opaque (không phải JWT), TTL 900 giây, ràng buộc **chính xác `customerIdentityId`**, scope `link-account`, một lần sử dụng cho liên kết; chỉ lưu hash, không log; **không tự cấp quyền truy cập Guest Order**. | `APPROVED` |
| D7 | IAM-011,012 | IAM-011 chưa tạo DB identity. IAM-012 hoàn tất xác minh và tạo một `CustomerIdentity` mới (`emailVerifiedAt` khác null, `userId` null), rồi cấp proof. Dùng challenge claim/idempotency để hai confirm đồng thời không tạo hai identity; xử lý retry khi DB/Redis lỗi; không merge cùng email. | `APPROVED` |
| D8 | IAM-013 | HTTP 200 `data: { primary: CustomerIdentityProjection \| null }`, chỉ cho người có JWT hợp lệ. Trả `primary: null` nếu chưa có linked primary; không trả tất cả identity, không có public guest `/identities/me`. | `APPROVED` |
| D9 | IAM-014 | Chỉ link identity đã email-verified, đang `userId=null`, với User lấy từ JWT; nếu User đã có primary identity thì trả 409 (không đổi primary trong nhánh này). Transaction/conditional update + kiểm soát replay/concurrency, dùng proof một lần; audit user thực `guest_identity_linked`, metadata redacted. Không merge Order/role/email. | `APPROVED` |
| D10 | IAM-011..014 | Phase này chỉ tạo/xác minh/link guest identity trong IAM. Không cấp Guest Order access, không sửa Commerce DB. Commerce về sau dùng `customerIdentityId` với cơ chế xác minh ownership/proof được phê duyệt ở plan riêng; **không coi có email giống nhau là sở hữu**. | `APPROVED` |

### Điều kiện để duyệt Guest Identity

D4–D10 đã được chốt **APPROVED** cho đúng phạm vi guest identity **mới**, không bao gồm việc nhận quyền Guest Order/identity cũ. Kết quả cụ thể này ưu tiên một luồng guest **tạo identity mới** để không cần giả định Commerce đã có trusted guest context. **Giới hạn quan trọng:** nó **không** cho phép nhận quyền trên một Guest Order hoặc `CustomerIdentity` đã tồn tại từ trước. Nếu sản phẩm cần thêm use case Guest Order cũ về sau, phải tạo plan/approval riêng trước khi mở rộng hợp đồng API.

## 4. Approved API contracts

### IAM-009 — GET `/api/v1/me`

- **Status:** `APPROVED` — route migration of existing IAM-009. `GET /api/v1/auth/me` đã bị xóa theo yêu cầu ngày 2026-10-20. Implementation: `PARTIAL`.
- **Review:** `PASS_WITH_NOTES`
- **Domain/owner/flow:** IAM / api-gateway HTTP → iam-service / N/A.
- **Actor/auth:** verified JWT, `@CurrentUser()`; chỉ chính User từ access credential. Không cần permission riêng.
- **Request:** không path params, query, body.
- **Response:** HTTP 200; `PublicUserResponseDto`: `id,email,fullName,phone?,authProvider,status,emailVerifiedAt?,lastLoginAt?,createdAt,updatedAt`. Không trả secret/role/grant.
- **Errors:** 401 invalid JWT; lỗi gRPC theo mapping có sẵn.
- **Existing RPC:** `GetCurrentUser` qua `IamGrpcClient.getCurrentUser()`; **không tạo RPC mới**.
- **Code:** `me/controllers/me.controller.ts` dùng `@Controller('me')`, `@Get()`, reuse `auth-http.mapper`; đăng ký một lần trong `iam.module.ts`. Không còn handler `auth/me`.
- **DB:** read `iam.users`; không migration.
- [x] D1 đã sửa: chỉ còn `GET /api/v1/me`, route `/auth/me` đã xóa
- [x] Thiếu token: HTTP `GET /api/v1/me` trả 401 và có `x-request-id`. Unit `getMe` bỏ `passwordHash`/`googleSub`. `GET /api/v1/auth/me` trả 404
- [x] JWT hợp lệ: HTTP `GET /api/v1/me` trả 200, `data.id` đúng user trong token
- [x] Swagger `/api/docs-json` có `/api/v1/me` và không có path kết thúc bằng `/auth/me`
- [ ] Frontend — NOT RUN; repo này không có frontend
- [x] Test / typecheck / review evidence ghi vào mục 8

### IAM-010 — PATCH `/api/v1/me`

- **Status:** `APPROVED`. Implementation: `PARTIAL`.
- **Review:** `PASS_WITH_NOTES`
- **Domain/owner/flow:** IAM / Gateway → IAM / N/A.
- **Actor/auth:** verified JWT; self only; không dùng `PROFILE_UPDATE` hoặc target `userId` từ body.
- **Request:** JSON `{ "fullName"?: string, "phone"?: string | null }`; ít nhất một field. `fullName` trim, 1–150 ký tự; `phone` theo validation hiện có, `null` để xóa (D2), omit = giữ nguyên. Loại bỏ/reject `email`, `role`, `status`, `authProvider`, `userId`, `googleSub`, `emailVerifiedAt` và unknown fields.
- **Response:** 200 `data: PublicUserResponseDto` sau update; error 400 invalid, 401 invalid JWT hoặc user không còn active (`verifyAccessToken` hiện trả `UnauthorizedException`), 404 user không tồn tại. Không đổi policy authentication toàn hệ thống để biến inactive thành 403.
- **gRPC:** new additive `UpdateMyProfile({access_credential, ...allowlisted profile fields})` → `UserResponse`; proto dùng explicit presence / clear-phone flag để phân biệt omit và null.
- **IAM app/repo:** xác minh token tại IAM, chỉ update `iam.users`; reuse `UserRepository.updateById()`. Không sửa role/permission, không migration.
- **Gateway files:** `me.controller.ts`, DTO request/Swagger, `IamGrpcClient`; IAM RPC/contracts và tests.
- [x] D2 được duyệt; DTO rejects empty/unknown và excessive inputs
- [x] `updateOwnProfile` giữ phone khi omit và ghi `null` khi xóa; body rỗng bị từ chối. Unit test đã chạy rồi xóa
- [x] Unit bỏ `passwordHash`/`googleSub`; body `userId`/`email`/`role` bị validation từ chối
- [x] HTTP JWT hợp lệ `PATCH /api/v1/me` trả 200; `phone: null` làm response bỏ `phone`; user `DISABLED` trả 401
- [ ] HTTP 404 khi user không còn trong DB — NOT RUN
- [x] Test / typecheck / review evidence ghi vào mục 8

### IAM-023 — GET `/api/v1/me/permissions`

- **Status:** `APPROVED`. Implementation: `PARTIAL`.
- **Review:** `PASS_WITH_NOTES`
- **Domain/owner/flow:** IAM / Gateway → IAM / N/A.
- **Actor/auth:** verified JWT; self only, không dùng `PROFILE_READ` và không cho phép query `userId`.
- **Request:** không body/params/query.
- **Response:** 200 `data: { userId, status, roleCodes, permissionCodes }`; distinct/sorted arrays như D3; 401 invalid JWT, lỗi gRPC tiêu chuẩn.
- **gRPC:** additive `GetMyAuthorization({access_credential})` → reuse `GetUserAuthorizationResponse`; IAM tự xác minh credential, lấy `userId` đúng chủ thể.
- **IAM reuse:** `AuthorizationService.getEffectiveAuthorization(userId)` chỉ lấy active role/permission và non-revoked grants. Trạng thái inactive đã bị JWT validation từ chối, không trả quyền trên HTTP.
- **DB:** chỉ đọc `iam.users`, `user_roles`, `roles`, `role_permissions`, `permissions`; không migration hoặc grant mới.
- [x] D3 được duyệt, response khớp contract
- [x] Credential sai thì 401; user LOCKED nhận quyền rỗng; grant active biến mất khi repository active-set trống. HTTP không token trả 401. HTTP JWT hợp lệ `GET /api/v1/me/permissions` trả 200 và `data.userId` đúng chủ token
- [x] Route không gắn permission metadata; 401 vẫn do guard giữ
- [x] Test / typecheck / review evidence ghi vào mục 8

### IAM-011 — POST `/api/v1/identities/guest/verify/request`

- **Status:** `APPROVED`. Implementation: `PARTIAL`.
- **Review:** `PASS_WITH_NOTES`
- **Domain/owner/flow:** IAM / Gateway → IAM / MF02 foundation; chưa tích hợp Commerce.
- **Actor/auth:** public (`@Public()`), áp dụng D4–D7 đã được phê duyệt; có throttling, không có guest JWT giả.
- **Request:** `{ "contactEmail": "guest@example.com" }`, normalize email trong IAM. Không nhận naked `customerIdentityId`, `userId`, role, hoặc tự tìm record hiện có theo email.
- **Response:** 202 `data: { challengeId: string, expiresInSeconds: 300 }`; generic/anti-enumeration; error 400 invalid, 429 rate limit, 503 Redis/email unavailable.
- **gRPC:** additive `RequestGuestIdentityVerification`; IAM gửi qua `EMAIL_SENDER`, Redis guest namespace riêng hash OTP/attempt count/cooldown + scoped challenge. Không ghi `CustomerIdentity` ở bước này.
- **Security:** OTP/PII/credential không xuất hiện trong logs/audit; không dùng lại registration OTP keyspace.
- [x] D4/D5/D7/D10 được duyệt
- [x] Rate, cooldown, rollback khi email lỗi, TTL 300 đã có unit. HTTP email sai và field lạ trả 400
- [x] OTP lưu hash, key `iam:guest:*`, không tạo identity, không nhận `customerIdentityId`
- [ ] Gửi email thật và Redis down trên HTTP — NOT RUN
- [x] Test / typecheck / review evidence ghi vào mục 8

### IAM-012 — POST `/api/v1/identities/guest/verify/confirm`

- **Status:** `APPROVED`. Implementation: `PARTIAL`.
- **Review:** `PASS_WITH_NOTES`
- **Domain/owner/flow:** IAM / Gateway → IAM / MF02 foundation.
- **Actor/auth:** public with verified challenge; no JWT login created.
- **Request:** `{ "challengeId": "<opaque>", "otp": "123456" }`.
- **Response:** 200 `data: { customerIdentityId: string, guestProof: string, expiresInSeconds: 900 }`; errors 400 invalid/expired/used challenge, 429 too many attempts, 503 IAM/Redis failure.
- **gRPC:** additive `ConfirmGuestIdentityVerification`; create `CustomerIdentity` **new** after successful OTP (`userId=null`, `isPrimaryForUser=false`, `emailVerifiedAt=now()`), grant proof scoped to this specific ID; no User or role auto-created.
- **Security:** atomic OTP claim, single success; durable DB create and Redis proof issue coordinated with safe retry/compensation; hash guestProof, TTL 900, prevent duplicate identity on concurrent confirms. No cross-identity lookup by email.
- **DB:** `iam.customer_identities` + dedicated guest Redis records.
- [x] D4/D5/D6/D7/D10 được duyệt
- [x] Wrong/used/missing/locked, resume không tạo identity thứ hai, hai confirm đồng thời chỉ một create
- [x] Không tạo User/JWT; identity `userId` null
- [x] Redis thật: replay OTP trả 400 và một identity; bốn OTP sai trả 400, lần thứ năm trả 429 và xóa challenge; hai confirm đồng thời chỉ một identity
- [x] Test / typecheck / review evidence ghi vào mục 8

### IAM-013 — GET `/api/v1/identities/me`

- **Status:** `APPROVED`. Implementation: `PARTIAL`.
- **Review:** `PASS_WITH_NOTES`
- **Domain/owner/flow:** IAM / Gateway → IAM / MF02/MF05 lookup.
- **Actor/auth:** verified JWT; only linked primary CustomerIdentity belonging to this User.
- **Request:** không params, body, query.
- **Response:** 200 `data: { primary: { id, displayName?, contactEmail, emailVerifiedAt?, isPrimaryForUser, accountLinkedAt? } | null }`; error 401 invalid JWT. Không trả guestProof hoặc danh sách identity người khác.
- **gRPC:** additive `GetMyCustomerIdentity({access_credential})`, reuse `CustomerIdentitiesService.findPrimaryByUserId()` after verifying token.
- **DB:** read `iam.customer_identities`; not a public endpoint for guest with proof only.
- [x] D8 được duyệt; `primary:null` khi không liên kết
- [x] Chỉ đọc primary theo user trong token. HTTP không token trả 401. Không có primary thì `null`
- [x] Swagger `/api/docs-json` có `/api/v1/identities/me`. HTTP JWT hợp lệ trả 200 với `primary.id` đúng identity vừa link
- [x] Test / typecheck / review evidence ghi vào mục 8

### IAM-014 — POST `/api/v1/identities/link-account`

- **Status:** `APPROVED`. Implementation: `PARTIAL`.
- **Review:** `PASS_WITH_NOTES`
- **Domain/owner/flow:** IAM / Gateway → IAM / MF02/MF05 lookup.
- **Actor/auth:** verified JWT plus short-lived `guestProof` from IAM-012; actor `userId` only from JWT.
- **Request:** `{ "guestProof": "<opaque>" }`; no request `userId`, role, contact email, or guessed identity ID as authorization.
- **Response:** 200 `data: { customerIdentityId, userId, isPrimaryForUser: true, accountLinkedAt }`; errors 400 bad proof, 401 unauthenticated, 403 not verified, 404 missing identity (non-enumerating), 409 already linked/primary conflict.
- **gRPC:** additive `LinkGuestIdentityToMyAccount({access_credential, guest_proof})`; reverify both JWT and proof at IAM; transaction/conditional update on `CustomerIdentity` and primary uniqueness; reject if User already has primary under D9. Consume proof exactly once after successful durable linking; define safe rollback/retry and 409 replay behavior.
- **Audit:** authorized User `guest_identity_linked` action with redacted nonsecret metadata; no fabricated user ID for pre-account guest operations.
- **DB:** `iam.customer_identities` and optional existing `iam.security_audit_events` with real User (when approved); no Commerce writes.
- [x] D4/D6/D7/D9/D10 được duyệt
- [x] Proof used/missing trả 400; already linked và primary conflict trả 409; unverified trả 403; proof không bị consume khi link thất bại
- [x] Hai link đồng thời trong transaction giả: một linked, một already_linked, audit một lần và không chứa proof. P2002 map thành primary conflict
- [x] Postgres thật: hai link đồng thời một proof chỉ một primary và một audit; replay proof trả 400; primary thứ hai trả 409; insert primary trùng trả `P2002`
- [ ] Redis proof hết hạn sau TTL 900 giây — NOT RUN
- [x] Test / typecheck / review evidence ghi vào mục 8

## 5. Dependencies and implementation order

1. **APPROVED:** D1–D10 và 7 API contracts đã được duyệt ngày 2026-10-20 tại mục 1–4; kiểm tra nhánh và working tree trước khi bắt đầu. Approval không phải implementation evidence.
2. IAM-009: canonical `GET /api/v1/me`; `GET /api/v1/auth/me` đã xóa theo chỉ thị ngày 2026-10-20.
3. IAM-010: PATCH own profile using existing user infrastructure.
4. IAM-023: GET own effective authorization using existing authorization service.
5. IAM-011: issue namespaced guest OTP email challenge.
6. IAM-012: confirm OTP, create verified identity, issue one-purpose proof.
7. IAM-013: GET own linked primary identity (can implement before IAM-014).
8. IAM-014: transactional proof-based guest identity link.
9. Run review for each API, then `review-api FEATURE_RELEASE` for all seven. Fix findings before a PR; no automatic commit/merge/deploy.

## 6. Expected file touchpoints (no duplicate modules)

```text
apps/api-gateway/src/modules/iam/
  me/controllers/me.controller.ts
  me/dto/request/update-my-profile.request.dto.ts
  me/dto/response/my-permissions.response.dto.ts
  me/docs/me.swagger.ts
  guest-identity/controllers/guest-identity.controller.ts
  guest-identity/dto/request/*.request.dto.ts
  guest-identity/dto/response/*.response.dto.ts
  guest-identity/docs/guest-identity.swagger.ts
  auth/controllers/auth.controller.ts      # no /auth/me handler
  clients/iam-grpc.client.ts                # reuse existing IAM client
  iam.module.ts                             # one-time controller registration
apps/iam-service/src/
  application/users/{users,customer-identities}.service.ts
  application/authorization/authorization.service.ts  # reuse evaluator
  application/auth/                         # reuse email sender/verified auth
  presentation/grpc/                        # extend existing controller as fits
  repositories/{user,customer-identity}.repository.ts
  persistence/redis/                        # dedicated guest challenge/proof store
  application/application.module.ts         # only if new providers are needed
  iam-service.module.ts                     # only if new gRPC controller needed
proto/iam/v1/iam.proto                      # additive RPC/messages after approval
libs/contracts/src/iam/iam.grpc.ts          # manually kept in sync
apps/iam-service/prisma/schema.prisma       # inspect only, avoid migration by default
docs/api/iam/me-guest-identity.md           # write approved field-level spec
```

Read first: `docs/architecture/memora-backend-4-service.md`, `docs/architecture/api-gateway-structure.md`, `docs/architecture/iam-permission-matrix.md`, `docs/api/iam/admin.md`, existing `auth.controller.ts`, `AccountGrpcController`, `AuthorizationService`, `CustomerIdentityRepository`, `schema.prisma`, `proto/iam/v1/iam.proto`, `.cursor/skills/{plan-api,implement-api,review-api}/SKILL.md`.

## 7. Verification & acceptance gate

**Không tick trước khi có kết quả test.** Từng API cần ghi PASS/FAIL/NOT RUN, output bằng chứng và review verdict. Các ca tối thiểu:

| API | Acceptance tests bắt buộc |
| --- | --- |
| IAM-009 | JWT 200, không JWT 401, public-user projection, không còn `GET /auth/me` |
| IAM-010 | allowlisted patch 200, phone null/omit, empty/unknown payload 400, self-only, invalid JWT 401 |
| IAM-023 | own role/permission 200, revoked grant biến mất, không target user ID, 401 unauthorized |
| IAM-011 | 202 email challenge, invalid email 400, rate/cooldown 429, Redis/email 503, no enumeration |
| IAM-012 | OTP correct single success; wrong/expired/replay/5 failures/races; durable new identity, no User/JWT |
| IAM-013 | JWT 200 linked primary or null, no unauthorized lookup, secrets omitted |
| IAM-014 | self JWT + valid proof, expiry/replay 400/409, already-linked/primary conflict 409, DB atomicity & audit |

```bash
npm run prisma:iam:validate
npm run prisma:iam:generate
npm run proto:check
npm run typecheck
npm run lint:check
npm run boundaries
npm run kit:validate
npm test -- --runInBand
npm run build
npm run build:iam
```

*Run focused tests first; build/CI outputs, rate limits, HTTP statuses, error mapping, request ID and sensitive-data redaction must be verified, not assumed. Do not run production migrations, deployment, commit, push or merge without request.*

## 8. Implementation progress log

| Date | API ID | Implementation | Tests | Review | Evidence |
| --- | --- | --- | --- | --- | --- |
| 2026-10-20 | IAM-009 | `EXISTING` at `/auth/me`; migration not implemented | NOT RUN | NOT RUN | Inspected `auth.controller.ts` in GitHub branch |
| 2026-10-20 | IAM-009 | PARTIAL — `GET /api/v1/me` added; `GET /api/v1/auth/me` kept as deprecated alias. No new RPC. | PASS (unit, then deleted) | `PASS_WITH_NOTES` | `npx jest apps/api-gateway/src/modules/iam/me/controllers/me.controller.spec.ts --runInBand --no-coverage` → 2 passed. `npx eslint` on touched Gateway files → PASS. `npx tsc --noEmit -p tsconfig.json` → PASS. `prisma:*`, `proto:check`, `lint:check`, `boundaries`, `kit:validate`, full `npm test`, `build`, `build:iam`, live HTTP/Swagger JSON → NOT RUN. Review: no CRITICAL/HIGH. Notes: spec file removed after the run; invalid/inactive JWT and `/api/docs-json` not exercised; no frontend in this repo. |
| 2026-10-20 | IAM-009 | D1 revised — removed `GET /api/v1/auth/me` and `ApiMeDocs`. Canonical route remains `GET /api/v1/me`. | NOT RUN | NOT RUN | Owner asked to delete the old route. Prior unit test covered the alias and no longer matches. |
| 2026-10-20 | IAM-010, IAM-023, IAM-011..014 | NOT IMPLEMENTED in inspected branch snapshot | NOT RUN | NOT RUN | No route in current Gateway Swagger/controller snapshot |
| 2026-10-20 | IAM-010, IAM-023, IAM-011, IAM-012, IAM-013, IAM-014 | PARTIAL — Gateway routes and additive IAM RPCs implemented. No migration. | PASS (unit, then deleted) | NOT RUN | `npx tsc --noEmit -p tsconfig.json` PASS. `npx eslint` on touched files PASS. `npx jest apps/iam-service/src/application/users/guest-identity.service.spec.ts --runInBand --no-coverage` → 6 passed, then the spec was deleted. `node scripts/ci/check-protos.cjs` PASS. `lint:check`, `boundaries`, `kit:validate`, full `npm test`, `build`, `build:iam`, live HTTP → NOT RUN. Covered: phone null/omit, empty patch, guest request does not create an identity, cooldown skips mail, confirm creates one identity, wrong OTP does not create, primary-link conflict does not consume proof. Not covered: live JWT 401, revoked grants, SMTP 503, OTP replay/race, proof expiry, concurrent link. |
| 2026-10-20 | IAM-009..014 | PARTIAL — automated tests kept. Live unauthenticated HTTP checked. Authenticated 200 and real Redis/Postgres race not run. | PASS | `PASS_WITH_NOTES` | `npm run lint:check` PASS. `npm run boundaries` PASS (177 files, 0 findings). `npm run kit:validate` PASS. `npm run typecheck` PASS. `npm run proto:check` PASS. `npm test -- --runInBand` PASS (12 suites, 66 passed, 4 skipped). `npm run build` PASS. `npm run build:iam` PASS. HTTP on `127.0.0.1:3000`: `GET /api/v1/me` 401, `GET /api/v1/me/permissions` 401, `GET /api/v1/auth/me` 404, `GET /api/v1/identities/me` 401, `POST /api/v1/identities/link-account` 401, guest request invalid email 400, extra `customerIdentityId` 400. All responses included `x-request-id`. JWT 200, SMTP delivery, Redis down, and Postgres unique-index race NOT RUN. Review FEATURE_RELEASE `PASS_WITH_NOTES`: 0 critical, 0 high, 2 medium, 1 low. |
| 2026-10-20 | IAM-009..014 | PARTIAL — plan IAM-010 ghi inactive là 401; không đổi `verifyAccessToken`. Live Redis/Postgres và HTTP JWT đã chạy. SMTP thật, Redis down trên HTTP, proof TTL 900s và frontend vẫn NOT RUN. | PASS | `PASS_WITH_NOTES` | `MEMORA_IAM_LIVE=1 NODE_OPTIONS=--experimental-vm-modules npx jest apps/iam-service/src/application/users/guest-identity.live.spec.ts --runInBand --no-coverage --forceExit` → 5 passed. Cùng lệnh không có `MEMORA_IAM_LIVE=1` thì suite skip. `npx eslint` file live spec PASS. Live: OTP replay 400; 4 OTP sai 400 rồi lần 5 trả 429; hai confirm một identity; hai link một proof một primary và một audit; replay proof 400; primary thứ hai 409; insert primary trùng `P2002`. HTTP `127.0.0.1:3000` với JWT ký bằng secret hiện tại: `GET /api/v1/me` 200, `PATCH` fullName/phone 200, `phone: null` bỏ field, `GET /api/v1/me/permissions` 200, `GET /api/v1/identities/me` 200, user `DISABLED` 401, `GET /api/v1/auth/me` 404, `/api/docs-json` 200 và không có `/auth/me`. Review FEATURE_RELEASE `PASS_WITH_NOTES`: 0/0/0/0. Không đánh dấu DONE. |

For each approved API, append one line with commit/PR ref (if available), actual command results, HTTP/gRPC tests and `review-api` verdict. Checked boxes remain blank unless verified. Update API Master/Swagger only when evidence supports the state; IAM-022 remains `DEFERRED`.

## 9. Cursor handoff

```text
Read docs/plans/active/iam-me-guest-identity.md,
.cursor/skills/plan-api/SKILL.md,
.cursor/skills/implement-api/SKILL.md,
.cursor/skills/review-api/SKILL.md.
Confirm feat/iam-me-guest-identity and git status --short.

Approval decision is APPROVED for D1–D10 and all seven named API contracts
(approved by MEMORA project owner on 2026-10-20).
Do not re-ask for plan approval unless new contract/scope issues emerge.
Check existing work; do not conflate APPROVED with IMPLEMENTED.
Implement ONE API per iteration in this order:
IAM-009 -> IAM-010 -> IAM-023 -> IAM-011 -> IAM-012 -> IAM-013 -> IAM-014.
Keep IAM-022 DEFERRED; never add new permissions or bypass verified ownership.
Run relevant tests, append actual evidence, then review-api.
Do not auto-commit, push, merge, migrate production, or deploy.
```
