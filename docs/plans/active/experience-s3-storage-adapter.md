# Kế hoạch Triển khai: S3 / Garage Storage Adapter cho Experience Service & Memory Media

## 1. Metadata

- **Branch:** `DuyPQ`
- **Domain:** `memory`
- **Service:** `experience-service` & `libs/config`
- **Feature:** Object Storage (S3-compatible / Garage) integration for Memory Card digital media & presigned URLs
- **Plan status:** `COMPLETED`
- **Updated:** 2026-11-24

---

## 2. Bối cảnh & Mục tiêu

- **Bối cảnh hiện tại:**
  - `MemoryStorageAdapter` trong `apps/experience-service/src/modules/memory/contents/infrastructure/memory-storage.adapter.ts` đang đọc trực tiếp `process.env.OPERATIONS_OBJECT_STORAGE_*` và dùng hardcoded fallback IP `100.78.222.34:3900`.
  - Thiếu biến cấu hình môi trường định kiểu mạnh (`libs/config/src/env/experience.env.ts`).
  - Chưa hỗ trợ phân tách **Internal Endpoint** (gọi nội bộ từ container/backend) và **Public Endpoint** (domain/URL công khai để ký presigned URL cho Web/Mobile App truy cập mà không qua VPN/Tailscale).
  - Vừa khởi tạo thành công bucket chuyên dụng `memora-memory` trên Garage S3 server.
- **Mục tiêu kỹ thuật:**
  1. Mở rộng `ExperienceEnvironment` trong `libs/config/src/env/experience.env.ts` với đầy đủ validation theo chuẩn Class-Validator:
     - `EXPERIENCE_OBJECT_STORAGE_ENDPOINT` (URL kết nối S3)
     - `EXPERIENCE_OBJECT_STORAGE_PUBLIC_ENDPOINT` (URL công khai trả về cho client)
     - `EXPERIENCE_OBJECT_STORAGE_REGION` (Mặc định `garage`)
     - `EXPERIENCE_OBJECT_STORAGE_BUCKET` (Mặc định `memora-memory`)
     - `EXPERIENCE_OBJECT_STORAGE_ACCESS_KEY_ID`
     - `EXPERIENCE_OBJECT_STORAGE_SECRET_ACCESS_KEY`
  2. Nâng cấp `MemoryStorageAdapter`:
     - Inject `ConfigService` hoặc `experienceConfig` thay vì đọc `process.env` trần.
     - Ký presigned PUT URL với ContentType, Key chuẩn hóa: `cards/{cardId}/{contentId}_{timestamp}.{ext}`.
     - Ký presigned GET URL với TTL cấu hình (mặc định 1 giờ / 3600s).
     - Bổ sung hàm kiểm tra tệp đã upload thực tế: `checkObjectExists(assetKey): Promise<boolean>` sử dụng `HeadObjectCommand`.
     - Bổ sung hàm xóa tệp: `deleteObject(assetKey): Promise<void>` sử dụng `DeleteObjectCommand`.
  3. Cập nhật file `.env` với các biến `EXPERIENCE_OBJECT_STORAGE_*`.
  4. Viết kịch bản test thực tế (live integration test) kiểm tra luồng: Ký Upload URL -> Upload tệp nhị phân -> Kiểm tra tồn tại qua S3 -> Ký Download URL -> Tải về và đối chiếu checksum.

---

## 3. Danh sách Endpoint & Hợp đồng API liên quan

Tính năng này là tầng Hạ tầng (Infrastructure Layer) phục vụ trực tiếp cho các API đã triển khai:
1. `MEMOR-009` (`POST /api/v1/memory/cards/:cardId/media/initiate`): Khởi tạo presigned URL tải lên ảnh/video/audio kỷ niệm.
2. `MEMOR-007` (`GET /api/v1/memory/cards/:cardId/contents`): Xem danh sách nội dung kỷ niệm (tự động đính kèm presigned GET URL xem ảnh/video).
3. `MEMOR-014` (`GET /api/v1/memory/access/:accessSessionId`): Khách xem nội dung kỷ niệm qua link chia sẻ Web Session (tự động đính kèm presigned GET URL).

---

## 4. Danh sách các file dự kiến tạo / sửa đổi

| Thao tác | Đường dẫn file | Mục đích |
|---|---|---|
| **Modify** | `libs/config/src/env/experience.env.ts` | Thêm các thuộc tính và validation cho `EXPERIENCE_OBJECT_STORAGE_*` |
| **Modify** | `.env` | Thêm các biến môi trường cấu hình kết nối `EXPERIENCE_OBJECT_STORAGE_*` trỏ vào bucket `memora-memory` |
| **Modify** | `apps/experience-service/src/modules/memory/contents/infrastructure/memory-storage.adapter.ts` | Cập nhật client S3 sử dụng ConfigService, hỗ trợ public endpoint, headObject, deleteObject |
| **Modify** | `apps/experience-service/src/modules/memory/contents/application/memory-content.service.ts` | Gọi adapter đã nâng cấp khi người dùng initiate media và load contents |
| **Create** | `test/automation/experience/garage-storage.live.spec.ts` | Test tương tác thực tế với Garage S3 để kiểm chứng tính toàn vẹn của upload/download presigned URL |

---

## 5. Kế hoạch Kiểm thử & Tiêu chí nghiệm thu (Checklist)

- [x] `libs/config`: `validateExperienceEnv` pass kiểm tra kiểu dữ liệu cho toàn bộ biến Object Storage mới.
- [x] `experience-service`: Khởi tạo thành công S3Client kết nối vào Garage server `100.78.222.34:3900` với bucket `memora-memory`.
- [x] `presignUploadUrl`: Sinh đúng URL hợp lệ có thể tải file lên bằng HTTP PUT.
- [x] `checkObjectExists`: Trả về `true` khi file đã lên S3 và `false` khi file không tồn tại.
- [x] `presignGetUrl`: Sinh đúng URL đọc file với TTL hợp lệ.
- [x] CI Gate: `npm run lint:check`, `npx tsc --noEmit`, và `npm test` đều pass 100% không có lỗi.
