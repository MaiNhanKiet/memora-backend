# Plan: Kế Hoạch Kiểm Thử Tự Động 80 API Commerce Service (Live End-to-End)

> **Mã tài liệu:** `PLAN-COMMERCE-TEST-80`  
> **Trạng thái:** `PENDING_APPROVAL` (Đang chờ duyệt trước khi thực thi)  
> **Tiêu chuẩn:** Tuân thủ [AGENTS.md](file:///d:/BTFPT\DoAn\Source\memora-backend\AGENTS.md), [00-memora-core.md](file:///d:/BTFPT\DoAn\Source\memora-backend\.agents\rules\00-memora-core.md), [MEMORA_API_MASTER_SPECIFICATION_v1.0_AGENT.md](file:///d:/BTFPT\DoAn\Source\memora-backend\docs\duypq\MEMORA_API_MASTER_SPECIFICATION_v1.0_AGENT.md).  
> **Nguyên tắc cốt lõi:** **100% Real Live Environment** — Không mock DB, không fake webhook PayOS, bắt buộc giao dịch và xác thực luồng thật với sự hỗ trợ của người dùng (quét mã QR PayOS thật).

---

## 1. Bối cảnh & Mục tiêu

Commerce Service sở hữu 5 domain nghiệp vụ trọng yếu: `catalog`, `pricing`, `inventory`, `design`, `ordering` với tổng cộng **80 API** (gồm 72 API REST qua API Gateway và 8 RPC nội bộ giữa các microservices).

Kế hoạch này thiết kế bộ kịch bản kiểm thử tự động hóa (E2E Automated Test Suite) theo đúng 4 Main Flows chuẩn (`MF01` -> `MF02` -> `MF03` -> `MF04`), kết hợp với bước thiết lập Master Data ban đầu (`Phase 0`).

### 1.1. Mục tiêu kiểm thử
1. **Bao phủ 80/80 API** thuộc phạm vi của Commerce Service.
2. **Xác thực toàn vẹn dữ liệu (Data Integrity):** Kiểm tra tính nhất quán giữa Gateway Response, gRPC payloads, và trạng thái lưu trữ thực tế trong PostgreSQL (thông qua Prisma models).
3. **Luồng thanh toán thực (Real PayOS Payment):**
   - API Gateway gọi PayOS tạo link thanh toán thật.
   - Hiển thị QR Code & Link thanh toán để User quét tiền thật (hoặc Sandbox).
   - PayOS bắn Webhook IPN thật về hệ thống (qua đường hầm ngrok/tunnel).
   - Hệ thống phát tín hiệu Server-Sent Events (SSE) `/orders/:id/payments/stream` và cập nhật đơn hàng tức thì.

---

## 2. Phân công vai trò (RACI Matrix)

| Bước thực hiện | 🤖 Automation Agent | 👤 User (Human-in-the-loop) |
|---|---|---|
| **Môi trường & Tunnel** | Kiểm tra kết nối Gateway, Commerce Service, IAM Service và Database. | Bật backend services và chạy lệnh ngrok/tunnel để PayOS gọi được webhook: `ngrok http 3000`. |
| **Thiết lập Master Data (Phase 0)** | Tự động tạo Catalog, Pricing Rules, Ring Blanks, Gemstones bằng token Admin. | Không cần can thiệp. |
| **Luồng MF01: Khám phá & Đặt hàng** | Tự động Browse catalog, estimate giá, thêm giỏ, tạo Order, nhận Provisional Quote. | Không cần can thiệp. |
| **Cổng thanh toán P1 (PayOS)** | Gọi API tạo link thanh toán, render mã QR & URL trong console, mở kết nối SSE chờ thanh toán. | **Mở App Ngân hàng hoặc Web PayOS Sandbox quét mã QR chuyển tiền.** |
| **Xác nhận Webhook P1** | Bắt sự kiện SSE thành công, kiểm tra DB order chuyển `DEPOSIT_PAID`. | Xác nhận trừ tiền trên App. |
| **Luồng MF02: Thẩm định & Khóa sản xuất** | Tự động gán version, Manager duyệt Final Quote, Customer xác nhận, giữ chỗ đá GIA. | Không cần can thiệp. |
| **Cổng thanh toán P2 (nếu có FP/SW)** | Gọi API tạo link thanh toán P2, render mã QR & URL, chờ SSE. | **Quét mã QR PayOS P2.** |
| **Luồng MF03: Bàn giao & Hóa đơn** | Thanh toán nốt P3 (PayOS hoặc Store Cash), tự động gọi xuất hóa đơn Final Invoice PDF. | **Quét mã QR PayOS P3 (nếu chọn PayOS).** |
| **Luồng MF04: Hậu mãi & Hoàn tiền** | Tạo Claim, duyệt Claim Quote, tạo link trả phí hậu mãi PayOS hoặc hoàn tiền Net Paid Credit. | Quét mã QR PayOS dịch vụ (nếu có). |

---

## 3. Danh mục Chi tiết 80 API Phân Theo 5 Giai Đoạn (Phases)

### 📦 Phase 0: Master Data & Admin Setup (24 APIs)
> Khởi tạo dữ liệu nền tảng phục vụ toàn bộ các kịch bản mua hàng phía sau.

| STT | Mã API | Domain | Method | Endpoint / Contract | Mục đích nghiệp vụ |
|:---:|---|---|:---:|---|---|
| 1 | `CATAL-005` | catalog | POST | `/api/v1/admin/catalog/templates` | Tạo mẫu nhẫn mới (Template) |
| 2 | `CATAL-006` | catalog | PATCH | `/api/v1/admin/catalog/templates/{templateId}` | Cập nhật thuộc tính mẫu nhẫn |
| 3 | `CATAL-007` | catalog | POST | `/api/v1/admin/catalog/templates/{templateId}/publish` | Công bố mở bán mẫu nhẫn (PUBLISHED) |
| 4 | `CATAL-008` | catalog | POST | `/api/v1/admin/catalog/templates/{templateId}/archive` | Lưu trữ / tạm ngưng mẫu nhẫn |
| 5 | `CATAL-010` | catalog | POST | `/api/v1/admin/catalog/materials` | Tạo chất liệu kim loại (Vàng 18K, Platinum...) |
| 6 | `CATAL-011` | catalog | PATCH | `/api/v1/admin/catalog/materials/{materialId}` | Cập nhật cấu hình chất liệu |
| 7 | `CATAL-013` | catalog | POST | `/api/v1/admin/catalog/variants` | Tạo biến thể sản phẩm (Variant) |
| 8 | `CATAL-014` | catalog | PATCH | `/api/v1/admin/catalog/variants/{variantId}` | Sửa thông tin biến thể |
| 9 | `CATAL-017` | catalog | POST | `/api/v1/admin/catalog/gemstone-options` | Thêm tùy chọn loại đá quý |
| 10 | `CATAL-018` | catalog | PUT | `/api/v1/admin/catalog/compatibilities` | Thiết lập ma trận tương thích đá - phôi |
| 11 | `CATAL-020` | catalog | PUT | `/api/v1/admin/catalog/resize-policies` | Cấu hình giới hạn kích cỡ nhẫn (Size policy) |
| 12 | `PRICI-002` | pricing | GET | `/api/v1/admin/pricing/items` | Danh sách danh mục cấu phần giá |
| 13 | `PRICI-003` | pricing | POST | `/api/v1/admin/pricing/items` | Tạo cấu phần giá mới (Price Item) |
| 14 | `PRICI-004` | pricing | GET | `/api/v1/admin/pricing/versions` | Tra cứu lịch sử phiên bản biểu giá |
| 15 | `PRICI-005` | pricing | POST | `/api/v1/admin/pricing/versions` | Tạo biểu giá mới ở trạng thái DRAFT |
| 16 | `PRICI-006` | pricing | POST | `/api/v1/admin/pricing/versions/{versionId}/approve` | Quản lý phê duyệt bảng giá ACTIVE |
| 17 | `PRICI-007` | pricing | POST | `/api/v1/admin/pricing/versions/{versionId}/reject` | Từ chối bảng giá |
| 18 | `PRICI-008` | pricing | GET | `/api/v1/admin/pricing/rules` | Tra cứu danh sách chính sách chiết khấu/giá |
| 19 | `PRICI-009` | pricing | POST | `/api/v1/admin/pricing/rules` | Tạo chính sách giá mới |
| 20 | `PRICI-010` | pricing | POST | `/api/v1/admin/pricing/rules/{ruleId}/activate` | Kích hoạt chính sách giá |
| 21 | `INVEN-001` | inventory | GET | `/api/v1/admin/inventory/ring-blanks` | Xem danh sách phôi nhẫn trong kho |
| 22 | `INVEN-002` | inventory | POST | `/api/v1/admin/inventory/ring-blanks/receipts` | Nhập kho phôi nhẫn mới |
| 23 | `INVEN-003` | inventory | GET | `/api/v1/admin/inventory/gemstone-batches` | Xem danh sách lô đá quý không chứng chỉ |
| 24 | `INVEN-004` | inventory | POST | `/api/v1/admin/inventory/gemstone-batches/receipts` | Nhập kho lô đá quý |

---

### 💍 Phase 1: MF01 — Khám Phá, Giỏ Hàng, Tạo Đơn & Cọc P1 PayOS (26 APIs)
> Khách hàng lựa chọn nhẫn, tính giá ước tính, lưu giỏ hàng, Checkout tạo đơn và quét QR cọc P1 thật.

| STT | Mã API | Domain | Method | Endpoint / Contract | Mục đích nghiệp vụ |
|:---:|---|---|:---:|---|---|
| 25 | `CATAL-001` | catalog | GET | `/api/v1/catalog/templates` | Khách xem danh mục mẫu nhẫn |
| 26 | `CATAL-002` | catalog | GET | `/api/v1/catalog/templates/{templateId}` | Xem chi tiết mẫu nhẫn |
| 27 | `CATAL-003` | catalog | GET | `/api/v1/catalog/templates/{templateId}/configuration-options` | Lấy các tùy chọn hợp lệ để render 3D |
| 28 | `CATAL-004` | catalog | GET | `/api/v1/catalog/templates/{templateId}/3d-assets` | Lấy metadata file 3D GLB & vị trí khắc |
| 29 | `CATAL-009` | catalog | GET | `/api/v1/catalog/materials` | Xem danh sách chất liệu được phép chọn |
| 30 | `CATAL-012` | catalog | GET | `/api/v1/catalog/templates/{templateId}/variants` | Xem các cấu hình có sẵn của mẫu nhẫn |
| 31 | `CATAL-015` | catalog | GET | `/api/v1/catalog/gemstone-options` | Danh sách đá quý khách được chọn gắn |
| 32 | `CATAL-016` | catalog | GET | `/api/v1/catalog/templates/{templateId}/gemstone-slots` | Lấy các vị trí gắn đá trên thân nhẫn |
| 33 | `CATAL-019` | catalog | GET | `/api/v1/catalog/resize-policies` | Xem chính sách hỗ trợ chỉnh size |
| 34 | `CATAL-021` | catalog | POST | `/api/v1/catalog/configurations/validate` | Thẩm định cấu hình nhẫn hợp lệ |
| 35 | `PRICI-001` | pricing | POST | `/api/v1/pricing/estimates` | Tính giá ước tính theo thời gian thực (Estimated Price) |
| 36 | `DESIG-001` | design | GET | `/api/v1/cart` | Lấy giỏ hàng của User/Guest |
| 37 | `DESIG-002` | design | POST | `/api/v1/cart/items` | Thêm bản thiết kế nhẫn (1–2 items) vào giỏ |
| 38 | `DESIG-003` | design | PATCH | `/api/v1/cart/items/{draftId}` | Cập nhật thông số nhẫn trong giỏ |
| 39 | `DESIG-004` | design | DELETE | `/api/v1/cart/items/{draftId}` | Xóa nhẫn khỏi giỏ hàng |
| 40 | `DESIG-005` | design | POST | `/api/v1/cart/validate-checkout` | Kiểm tra tính hợp lệ của giỏ hàng trước khi đặt |
| 41 | `DESIG-006` | design | POST | `/api/v1/cart/abandon` | Hủy / làm mới giỏ hàng |
| 42 | `DESIG-007` | design | GET | `/api/v1/design/drafts/{draftId}` | Xem chi tiết bản thiết kế nhẫn |
| 43 | `DESIG-008` | design | POST | `/api/v1/design/drafts/{draftId}/duplicate` | Nhân bản thiết kế để làm nhẫn đôi |
| 44 | `DESIG-009` | design | POST | `/api/v1/design/drafts/{draftId}/share-links` | Tạo link chia sẻ thiết kế ra ngoài |
| 45 | `DESIG-010` | design | DELETE | `/api/v1/design/drafts/{draftId}/share-links/{linkId}` | Hủy link chia sẻ thiết kế |
| 46 | `ORDER-001` | ordering | POST | `/api/v1/orders` | **Tạo Order từ giỏ hàng** (sinh Version V1) |
| 47 | `ORDER-003` | ordering | GET | `/api/v1/orders/{orderId}` | Lấy chi tiết đơn hàng |
| 48 | `ORDER-004` | ordering | GET | `/api/v1/orders/{orderId}/timeline` | Xem lịch sử các mốc sự kiện của đơn |
| 49 | `ORDER-011` | ordering | POST | *(internal gRPC)* `quotes/provisional` | Tính báo giá sơ bộ ban đầu (Provisional Quote) |
| 50 | `ORDER-016` | ordering | POST | `/api/v1/orders/{orderId}/payments` | **Tạo link thanh toán PayOS cọc P1 (30%)** |
| 51 | `ORDER-019` | ordering | POST | `/api/v1/payments/payos/webhook` | **PayOS Webhook callback thật khi User quét QR trả P1** |

---

### 🔨 Phase 2: MF02 — Báo Giá Cuối, Khách Duyệt & Cọc P2 / Khóa Sản Xuất (12 APIs)
> Hoàn thiện cá nhân hóa, cập nhật phiên bản, chốt Final Quote, giữ chỗ đá GIA và cọc P2 để khóa sản xuất.

| STT | Mã API | Domain | Method | Endpoint / Contract | Mục đích nghiệp vụ |
|:---:|---|---|:---:|---|---|
| 52 | `ORDER-007` | ordering | GET | `/api/v1/orders/{orderId}/items/{ringItemId}` | Xem chi tiết từng chiếc nhẫn trong đơn |
| 53 | `ORDER-008` | ordering | GET | `/api/v1/orders/{orderId}/items/{ringItemId}/versions` | Xem lịch sử các phiên bản thiết kế |
| 54 | `ORDER-009` | ordering | PATCH | `/api/v1/orders/{orderId}/items/{ringItemId}/versions/current` | Cập nhật thông số phiên bản hoàn thiện |
| 55 | `ORDER-010` | ordering | GET | `/api/v1/orders/{orderId}/quotes` | Xem danh sách các báo giá của đơn hàng |
| 56 | `ORDER-012` | ordering | POST | *(internal gRPC)* `quotes/final` | Tạo báo giá cuối cùng (Final Quote) |
| 57 | `ORDER-013` | ordering | GET | `/api/v1/orders/{orderId}/quotes/{quoteId}` | Xem chi tiết từng hạng mục chi phí Final Quote |
| 58 | `ORDER-014` | ordering | POST | `/api/v1/orders/{orderId}/final-confirmations` | **Khách hàng xác nhận đồng ý Final Quote** |
| 59 | `ORDER-015` | ordering | GET | `/api/v1/orders/{orderId}/final-confirmations` | Xem biên bản xác nhận giá cuối |
| 60 | `INVEN-005` | inventory | GET | `/api/v1/inventory/certified-gemstones/availability` | Kiểm tra tính sẵn sàng của viên kim cương GIA |
| 61 | `INVEN-007` | inventory | POST | *(internal gRPC)* `inventory/holds` | Tạm giữ viên đá trong 15 phút (Hold) |
| 62 | `INVEN-008` | inventory | POST | *(internal gRPC)* `inventory/reservations` | Khóa cứng viên đá vào đơn hàng (Reservation Gate) |
| 63 | `INVEN-009` | inventory | POST | *(internal gRPC)* `inventory/allocations` | Phân bổ phôi nhẫn và đá cho xưởng chế tác |

*(Lưu ý: Tại đây đối với đơn FP/SW, `ORDER-016` + `ORDER-019` sẽ được gọi lại một lần nữa để User quét QR thanh toán cọc P2 thật trước khi chuyển `MANUFACTURING`)*.

---

### 📦 Phase 3: MF03 — Thanh Toán Đủ P3, Xuất Hóa Đơn VAT & Hoàn Tất (11 APIs)
> Sản xuất xong, thanh toán nốt phần tiền còn lại, kiểm tra bắt buộc xuất hóa đơn trước khi bàn giao.

| STT | Mã API | Domain | Method | Endpoint / Contract | Mục đích nghiệp vụ |
|:---:|---|---|:---:|---|---|
| 64 | `ORDER-002` | ordering | GET | `/api/v1/orders` | Khách xem danh sách đơn hàng đã mua |
| 65 | `ORDER-005` | ordering | POST | `/api/v1/orders/{orderId}/cancel-requests` | Yêu cầu hủy đơn hàng (nếu vi phạm điều kiện) |
| 66 | `ORDER-006` | ordering | GET | `/api/v1/admin/orders` | Nhân viên/Quản trị lọc danh sách toàn bộ đơn hàng |
| 67 | `ORDER-017` | ordering | GET | `/api/v1/orders/{orderId}/payments` | Lịch sử các giao dịch thanh toán của đơn |
| 68 | `ORDER-018` | ordering | GET | `/api/v1/orders/{orderId}/payments/{transactionId}` | Chi tiết giao dịch thanh toán cụ thể |
| 69 | `ORDER-020` | ordering | POST | *(internal gRPC)* `payments/reconcile` | Đối soát tự động với PayOS nếu webhook trễ |
| 70 | `ORDER-021` | ordering | GET | `/api/v1/orders/{orderId}/payments/{transactionId}/receipt` | Lấy biên lai thu tiền điện tử |
| 71 | `ORDER-022` | ordering | GET | `/api/v1/orders/{orderId}/invoice` | **Xuất hóa đơn VAT điện tử (PDF) TRƯỚC bàn giao** |
| 72 | `INVEN-010` | inventory | POST | *(internal gRPC)* `inventory/consumptions` | Trừ xuất kho thực tế khi bàn giao nhẫn |
| 73 | `INVEN-011` | inventory | POST | *(internal gRPC)* `inventory/releases` | Giải phóng tài nguyên kho nếu đơn bị hủy |
| 74 | `INVEN-012` | inventory | GET | `/api/v1/admin/inventory/movements` | Lịch sử biến động xuất/nhập/điều chuyển kho |

---

### 🛡️ Phase 4: MF04 — Quản Lý Hậu Mãi, Báo Giá & Hoàn Tiền (7 APIs)
> Khách hàng đã nhận nhẫn, phát sinh nhu cầu bảo dưỡng vượt hạn mức hoặc yêu cầu đổi trả hoàn tiền.

| STT | Mã API | Domain | Method | Endpoint / Contract | Mục đích nghiệp vụ |
|:---:|---|---|:---:|---|---|
| 75 | `ORDER-024` | ordering | GET | `/api/v1/claims/{claimId}/quotes` | Xem báo giá chi phí xử lý khiếu nại/sửa chữa |
| 76 | `ORDER-025` | ordering | POST | `/api/v1/claims/{claimId}/quotes/{quoteId}/accept` | Khách duyệt báo giá dịch vụ hậu mãi |
| 77 | `ORDER-026` | ordering | POST | `/api/v1/claims/{claimId}/payments` | **Tạo link PayOS trả phí dịch vụ hậu mãi** |
| 78 | `ORDER-023` | ordering | POST | `/api/v1/admin/payments/{transactionId}/refund-requests` | **Hoàn tiền hoàn trả (Return Refund) theo Net Paid** |
| 79 | `INVEN-006` | inventory | POST | `/api/v1/admin/inventory/certified-gemstones` | Cập nhật trạng thái viên đá khi nhập lại kho |
| 80 | `INVEN-013` | inventory | POST | `/api/v1/admin/inventory/adjustments` | Điều chỉnh kiểm kê kho sau hậu mãi |

---

## 4. Thiết Kế Công Cụ & Thư Mục Kiểm Thử (Automation Test Suite)

Chúng ta sẽ xây dựng một bộ Automation Runner chuyên biệt đặt tại `test/automation/commerce/` để vừa có thể chạy tự động toàn bộ, vừa có cơ chế **tạm dừng tương tác (Interactive Pause)** để chờ User quét mã QR thanh toán:

```
test/automation/commerce/
├── config/
│   ├── env.config.ts             # Đọc BASE_URL, PayOS webhook URL, database connection
│   └── test-actors.ts            # Cấu hình tài khoản test (Admin, Staff, Customer)
├── core/
│   ├── http-client.ts            # Wrapper Axios tự động đính kèm Bearer JWT, logging request/response
│   ├── payos-helper.ts           # Trích xuất mã QR, in mã ASCII QR ra terminal, mở SSE stream
│   └── assertion.ts              # Các hàm kiểm tra schema, status code và DB state
├── flows/
│   ├── phase0-admin-setup.spec.ts          # Chạy tự động 24 APIs Master Data
│   ├── phase1-mf01-order-p1.spec.ts        # Chạy 26 APIs giỏ hàng & Cọc P1 thật
│   ├── phase2-mf02-final-quote-p2.spec.ts  # Chạy 12 APIs báo giá cuối & Cọc P2
│   ├── phase3-mf03-handover-invoice.spec.ts# Chạy 11 APIs thanh toán đủ & Hóa đơn
│   └── phase4-mf04-after-sales.spec.ts     # Chạy 7 APIs Claim & Hoàn tiền
└── run-all.ts                    # Kịch bản chính điều phối toàn bộ 5 Phase
```

---

## 5. Tiêu Chí Thành Công (Definition of Done)

1. ✅ 80/80 API đều được gọi thực tế, trả về HTTP Status Code hợp lệ (200, 201).
2. ✅ Tất cả dữ liệu đầu ra khớp với DTO / Swagger contract trong `api-gateway`.
3. ✅ Luồng PayOS thật hoạt động mượt mà:
   - Link thanh toán sinh đúng số tiền cọc (P1, P2, P3).
   - User quét QR thành công trên điện thoại.
   - PayOS webhook gửi về hợp lệ, chữ ký HMAC-SHA256 được xác thực đúng.
   - SSE bắn tín hiệu tức thì sang client.
   - Hóa đơn PDF `ORDER-022` được tải về với đầy đủ thông tin mã số thuế, chi tiết 2 chiếc nhẫn và số tiền đã thanh toán.
4. ✅ Database phản ánh chính xác các trạng thái: `AWAITING_P1` ➔ `DEPOSIT_PAID` ➔ `PENDING_FINAL_QUOTE` ➔ `MANUFACTURING` ➔ `READY_FOR_DELIVERY` ➔ `COMPLETED`.
