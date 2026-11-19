# MEMORA — Master Plan: Seed Master Data Chuẩn (Rule 23 & prisma-migration-seed)

> **Mục đích:** Nạp dữ liệu danh mục chuẩn (Master Data) của hệ thống MEMORA xuống database PostgreSQL local để phục vụ kiểm thử end-to-end từ Catalog (xem mẫu nhẫn 3D), Pricing (tính giá thời gian thực), Inventory (kiểm tra tồn kho phôi nhẫn/đá), tới IAM (tài khoản đăng nhập các vai trò).

---

## 1. Metadata & Plan Status

| Trường | Giá trị |
| --- | --- |
| Repository | `memora-backend` |
| Branch | `DuyPQ` |
| Scope | Master Data Seed (`apps/commerce-service/prisma/`, `apps/iam-service/prisma/`) |
| Target Domains | `catalog`, `pricing`, `inventory`, `iam` |
| Quy tắc tuân thủ | `.agents/rules/23-database-rbac.md`, `prisma-migration-seed`, `AGENTS.md` |
| File Plan | `docs/plans/active/seed-master-data.md` |
| Plan Status | `COMPLETED & VERIFIED` — Đã nạp thành công 100% Master Data & Test Users |
| Date Prepared | 2026-11-16 |

---

## 2. Danh mục Master Data Dự kiến Nạp

### A. Catalog Domain (`catalog`)
1. **`materials` (6 chất liệu nhẫn - bao gồm tuỳ chọn siêu rẻ để test payment):**
   - `SS925`: Bạc 925 Sterling Silver (Chất liệu thử nghiệm thanh toán, màu bạc sáng)
   - `WG14K`: Vàng trắng 14K (White Gold 14K, độ tinh khiết 58.5%, màu trắng)
   - `WG18K`: Vàng trắng 18K (White Gold 18K, độ tinh khiết 75.0%, màu trắng)
   - `YG18K`: Vàng vàng 18K (Yellow Gold 18K, độ tinh khiết 75.0%, màu vàng)
   - `RG18K`: Vàng hồng 18K (Rose Gold 18K, độ tinh khiết 75.0%, màu hồng)
   - `PT950`: Bạch kim Platinum 950 (Platinum 950, độ tinh khiết 95.0%, màu trắng xám)
2. **`gemstone_options` (5 loại đá quý):**
   - `CZ_ROUND_020`: Đá Cubic Zirconia test mini 2.0mm (Phục vụ test thanh toán giá rẻ)
   - `DIA_NAT_ROUND_050`: Kim cương tự nhiên tròn 0.5ct (Round Brilliant, 5.0mm, Nước F, Độ sạch VVS1, có chứng chỉ GIA)
   - `DIA_LAB_ROUND_050`: Kim cương nuôi cấy Lab-grown tròn 0.5ct (Round Brilliant, 5.0mm, Nước E, Độ sạch VS1)
   - `MOIS_ROUND_050`: Đá Moissanite tròn 0.5ct (5.0mm, Nước D, Độ sạch VVS1)
   - `SAPH_BLUE_OVAL_070`: Đá Sapphire xanh dương dáng Oval 0.7ct (6.0 x 4.0mm)
3. **`ring_templates` (4 mẫu nhẫn thiết kế 3D):**
   - `T_TEST_BAND`: "Memora Test Payment Band" (Mẫu nhẫn thử nghiệm giá rẻ ~10k để quét test QR PayOS, GLB: `models/minimal_01.glb`, hỗ trợ toàn bộ gói cá nhân hóa).
   - `T_SOLITAIRE_01`: "Classic Solitaire Ring" (Mẫu nhẫn đơn thanh lịch, GLB: `models/solitaire_01.glb`, hỗ trợ gói cá nhân hóa `FINGERPRINT`, `INITIALS`, `NONE`).
   - `T_ETERNITY_01`: "Eternity Pavé Band" (Mẫu nhẫn Pavé lấp lánh, GLB: `models/eternity_01.glb`, hỗ trợ `SOUNDWAVE`, `INITIALS`, `NONE`).
   - `T_MINIMAL_01`: "Minimalist Signature Band" (Mẫu nhẫn trơn hiện đại, GLB: `models/minimal_01.glb`, hỗ trợ toàn bộ các gói cá nhân hóa `FINGERPRINT`, `SOUNDWAVE`, `COORDINATES`, `INITIALS`, `NONE`).
4. **`template_variants`:**
   - Tạo các biến thể chuẩn cho từng mẫu nhẫn theo 5 chất liệu với kích cỡ tiêu chuẩn size 12 (standard size, cho phép resize delta từ -2.0 đến +2.0).
5. **`gemstone_slots` & `template_compatibilities`:**
   - Gắn slot đá chủ (Center Stone Slot) cho mẫu Solitaire và liên kết tương thích giữa mẫu nhẫn, slot và danh mục đá.

---

### B. Pricing Domain (`pricing`)
Thiết lập bảng giá thời gian thực gồm Price Items và Price Versions (Active, version 1):
1. **Giá kim loại (theo phôi/gram):**
   - Phôi Bạc SS925 (Test Payment): `5,000 VND` (phục vụ test cọc thanh toán cực nhỏ)
   - Phôi WG14K: `5,500,000 VND`
   - Phôi WG18K: `7,200,000 VND`
   - Phôi YG18K: `7,200,000 VND`
   - Phôi RG18K: `7,500,000 VND`
   - Phôi PT950: `11,000,000 VND`
2. **Giá đá quý:**
   - Đá CZ test mini: `2,000 VND`
   - Kim cương tự nhiên 0.5ct: `25,000,000 VND`
   - Kim cương Lab-grown 0.5ct: `8,500,000 VND`
   - Đá Moissanite 0.5ct: `2,200,000 VND`
   - Đá Sapphire xanh 0.7ct: `6,800,000 VND`
3. **Phí dịch vụ cá nhân hóa:**
   - Khắc laser test / Initials: `2,000 VND`
   - Gói khắc vân tay (`FINGERPRINT`): `800,000 VND` (và có option test `5,000 VND`)
   - Gói khắc sóng âm (`SOUNDWAVE`): `950,000 VND`
   - Phí resize nhẫn ngoài chuẩn (mỗi đơn vị size delta): `150,000 VND` (hoặc `1,000 VND` cho dòng test)

---

### C. Inventory Domain (`inventory`)
1. **`stock_lots` (Lô phôi và đá tồn kho sẵn sàng):**
   - 1 lô phôi nhẫn Solitaire WG18K size 12: `quantity_on_hand: 10`, `quantity_reserved: 0`.
   - 1 lô phôi nhẫn Minimalist PT950 size 12: `quantity_on_hand: 5`, `quantity_reserved: 0`.
   - 1 lô đá Moissanite tròn 0.5ct: `quantity_on_hand: 50`, `quantity_reserved: 0`.
2. **`certified_gemstones` (Kim cương có chứng chỉ GIA sẵn sàng trong kho):**
   - 2 viên kim cương tự nhiên 0.5ct với mã chứng chỉ GIA: `GIA-2487654321` và `GIA-2487654322`, trạng thái `AVAILABLE`.

---

### D. IAM Domain (`iam`)
Tạo 4 tài khoản người dùng mẫu kèm Customer Identity tương ứng, mật khẩu mã hóa bcrypt chuẩn `Memora123!`:
1. `admin@memora.vn` ➔ Gán vai trò **`ADMIN`**
2. `staff@memora.vn` ➔ Gán vai trò **`STORE_STAFF`**
3. `jeweler@memora.vn` ➔ Gán vai trò **`JEWELER`**
4. `customer@memora.vn` ➔ Gán vai trò **`CUSTOMER`** (tự động tạo `customer_identities` liên kết)

---

## 3. Danh sách File Dự kiến Tạo & Chỉnh sửa

1. **Tạo mới:** `apps/commerce-service/prisma/seed.ts` (Script nạp Catalog, Pricing, Inventory).
2. **Tạo mới:** `apps/iam-service/prisma/seed-users.ts` (Script nạp tài khoản test và gán quyền).
3. **Chỉnh sửa:** `apps/commerce-service/prisma.config.ts` (Bổ sung cấu hình `seed` command cho commerce-service).
4. **Chỉnh sửa:** `package.json` (Thêm script `npm run prisma:commerce:seed` và `npm run seed:master-data`).

---

## 4. Nguyên tắc Kỹ thuật & An toàn (Safety & Idempotency)
- **Tuyệt đối Idempotent:** Dùng `upsert` theo unique code (ví dụ `materials.code`, `gemstone_options.code`, `stock_lots.stock_code`, `users.email`). Khi chạy lại nhiều lần sẽ không bao giờ phát sinh lỗi duplicate key hoặc tạo thêm dữ liệu rác.
- **Không tự ý commit:** Toàn bộ file tạo/sửa sẽ được giữ nguyên trên working tree để người dùng kiểm tra và commit.
- **Bảo toàn 100% tests:** Chạy lại toàn bộ 137 unit tests sau khi hoàn thành.
