import { Pool } from 'pg';
import axios from 'axios';
import { TestHttpClient, ApiResponse } from '../commerce/core/http-client';
import { TestReporter } from '../commerce/core/assertions';
import { TEST_ACTORS } from '../commerce/config/test-actors';
import { testConfig } from '../commerce/config/env.config';

interface DbSetupContext {
  customerIdentityId: string;
  cardId: string;
  ringItemId: string;
}

async function prepareDatabaseSeed(): Promise<DbSetupContext> {
  const connectionString =
    process.env.EXPERIENCE_DATABASE_URL ||
    'postgresql://memora:Memora123!@100.78.222.34:5432/memora';
  const pool = new Pool({ connectionString });

  try {
    // 1. Tìm hoặc tạo customer_identities cho customer@memora.vn
    const userRes = await pool.query(
      "SELECT id, email FROM iam.users WHERE email = 'customer@memora.vn'",
    );
    if (userRes.rows.length === 0) {
      throw new Error('User customer@memora.vn does not exist in iam.users');
    }
    const userId = userRes.rows[0].id;

    let customerIdentityId: string;
    const ciRes = await pool.query(
      'SELECT id FROM iam.customer_identities WHERE user_id = $1 LIMIT 1',
      [userId],
    );

    if (ciRes.rows.length > 0) {
      customerIdentityId = ciRes.rows[0].id;
    } else {
      const insertedCi = await pool.query(
        `INSERT INTO iam.customer_identities (id, user_id, contact_email, display_name, status, is_primary_for_user, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 'customer@memora.vn', 'MEMORA Customer', 'ACTIVE', true, NOW(), NOW())
         RETURNING id`,
        [userId],
      );
      customerIdentityId = insertedCi.rows[0].id;
    }

    // 2. Tạo một Thẻ Ký Ức mẫu ở trạng thái PENDING sẵn sàng kiểm thử
    const cardRes = await pool.query(
      `INSERT INTO memory.memory_cards (id, ring_item_id, owner_customer_identity_id, owner_email, status, pin_hash, pin_failed_attempts, created_at, updated_at)
       VALUES (gen_random_uuid(), gen_random_uuid(), $1, 'customer@memora.vn', 'PENDING', NULL, 0, NOW(), NOW())
       RETURNING id, ring_item_id`,
      [customerIdentityId],
    );

    const cardId = cardRes.rows[0].id;
    const ringItemId = cardRes.rows[0].ring_item_id;

    return { customerIdentityId, cardId, ringItemId };
  } finally {
    await pool.end();
  }
}

async function loginCustomer(client: TestHttpClient): Promise<string> {
  const loginRes = await client.post<{
    data?: { accessToken?: string };
    accessToken?: string;
  }>('/api/v1/auth/login', {
    email: TEST_ACTORS.customer.email,
    password: TEST_ACTORS.customer.password,
  });

  if (loginRes.status !== 200) {
    throw new Error(
      `Login failed for ${TEST_ACTORS.customer.email}: HTTP ${loginRes.status}`,
    );
  }

  const token =
    loginRes.data.data?.accessToken || loginRes.data.accessToken || '';
  if (!token) {
    throw new Error('Login response did not return an access token');
  }
  return token;
}

async function main(): Promise<void> {
  console.log('================================================================================');
  console.log('🚀 MEMORA EXPERIENCE SERVICE — MEMORY DOMAIN AUTOMATION TEST SUITE (14 APIS)');
  console.log('================================================================================');
  console.log(`- Base Gateway URL : ${testConfig.baseUrl}`);
  console.log(`- Target Service   : experience-service (Domain: memory)`);
  console.log(`- Storage Backend  : Garage S3 (http://100.78.222.34:3900)`);
  console.log('================================================================================\n');

  console.log('🌱 Đang chuẩn bị dữ liệu kiểm thử (Database Seed Check)...');
  const dbContext = await prepareDatabaseSeed();
  console.log(`\x1b[32m✔ Khởi tạo dữ liệu thành công:\x1b[0m`);
  console.log(`  • Customer Identity ID: ${dbContext.customerIdentityId}`);
  console.log(`  • Test Memory Card ID : ${dbContext.cardId}`);
  console.log(`  • Test Ring Item ID   : ${dbContext.ringItemId}\n`);

  const client = new TestHttpClient();

  console.log('🔑 Đang đăng nhập tài khoản Khách hàng (customer@memora.vn)...');
  const customerToken = await loginCustomer(client);
  client.setToken(customerToken);
  console.log('\x1b[32m✔ Đăng nhập thành công, đã cấp Bearer Token.\x1b[0m\n');

  // ===========================================================================
  // PHASE 1: Quản lý Thẻ Ký Ức (Memory Cards) — MEMOR-001..003
  // ===========================================================================
  console.log('--- [PHASE 1: Quản lý Thẻ Ký Ức & Kích hoạt thẻ] ---');

  // [MEMOR-001] GET /api/v1/memory/cards
  const listCardsRes = await client.get<{ data?: Array<{ id: string; status: string }> }>('/api/v1/memory/cards');
  const cards = listCardsRes.data.data || (listCardsRes.data as unknown as Array<{ id: string; status: string }>) || [];
  const foundCard = Array.isArray(cards) && cards.some((c) => c.id === dbContext.cardId);
  TestReporter.record({
    code: 'MEMOR-001',
    name: 'Danh sách Thẻ Ký Ức sở hữu (ListMyCards)',
    phase: 'Phase 1: Memory Cards',
    passed: listCardsRes.status === 200 && foundCard,
    httpStatus: listCardsRes.status,
    durationMs: listCardsRes.durationMs,
  });

  // [MEMOR-002] GET /api/v1/memory/cards/:cardId
  const getCardRes = await client.get<{ data?: { id: string; isOwner: boolean; status: string } }>(
    `/api/v1/memory/cards/${dbContext.cardId}`,
  );
  const cardData = getCardRes.data.data || (getCardRes.data as unknown as { id: string; isOwner: boolean; status: string });
  TestReporter.record({
    code: 'MEMOR-002',
    name: 'Xem chi tiết Thẻ Ký Ức (GetCardDetail)',
    phase: 'Phase 1: Memory Cards',
    passed: getCardRes.status === 200 && cardData.id === dbContext.cardId && cardData.isOwner === true,
    httpStatus: getCardRes.status,
    durationMs: getCardRes.durationMs,
  });

  // [MEMOR-003] POST /api/v1/memory/cards/:cardId/activate
  const activateRes = await client.post<{ data?: { status: string; hasPin: boolean } }>(
    `/api/v1/memory/cards/${dbContext.cardId}/activate`,
    { initialPin: '1234' },
  );
  const activatedData = activateRes.data.data || (activateRes.data as unknown as { status: string; hasPin: boolean });
  TestReporter.record({
    code: 'MEMOR-003',
    name: 'Kích hoạt Thẻ Ký Ức kèm mã PIN ban đầu (ActivateCard)',
    phase: 'Phase 1: Memory Cards',
    passed: activateRes.status === 200 && activatedData.status === 'ACTIVE' && activatedData.hasPin === true,
    httpStatus: activateRes.status,
    durationMs: activateRes.durationMs,
  });

  // ===========================================================================
  // PHASE 2: Bảo mật mã PIN & Đổi PIN — MEMOR-004..006
  // ===========================================================================
  console.log('\n--- [PHASE 2: Cơ chế Bảo mật mã PIN & Chống Brute-force] ---');

  // [MEMOR-004] POST /api/v1/memory/cards/:cardId/pin (Kiểm tra chặn cài đè khi đã có PIN)
  const setupPinAgainRes = await client.post(
    `/api/v1/memory/cards/${dbContext.cardId}/pin`,
    { pin: '9999' },
  );
  TestReporter.record({
    code: 'MEMOR-004',
    name: 'Chặn cài đặt PIN lần đầu khi thẻ đã có PIN (SetupPin Guard)',
    phase: 'Phase 2: PIN Security',
    passed: setupPinAgainRes.status === 400,
    httpStatus: setupPinAgainRes.status,
    durationMs: setupPinAgainRes.durationMs,
  });

  // [MEMOR-005] PUT /api/v1/memory/cards/:cardId/pin (Đổi mã PIN hợp lệ: 1234 -> 5678)
  const changePinRes = await client.put<{ data?: { success: boolean } }>(
    `/api/v1/memory/cards/${dbContext.cardId}/pin`,
    { currentPin: '1234', newPin: '5678' },
  );
  const changePinData = changePinRes.data.data || (changePinRes.data as unknown as { success: boolean });
  TestReporter.record({
    code: 'MEMOR-005',
    name: 'Đổi mã PIN thẻ thành công với mã PIN hiện tại (ChangePin)',
    phase: 'Phase 2: PIN Security',
    passed: changePinRes.status === 200 && changePinData.success === true,
    httpStatus: changePinRes.status,
    durationMs: changePinRes.durationMs,
  });

  // [MEMOR-006] POST /api/v1/memory/cards/:cardId/pin/reset (Reset PIN qua mã OTP: -> 9999)
  const resetPinRes = await client.post<{ data?: { success: boolean } }>(
    `/api/v1/memory/cards/${dbContext.cardId}/pin/reset`,
    { verificationCode: '123456', newPin: '9999' },
  );
  const resetPinData = resetPinRes.data.data || (resetPinRes.data as unknown as { success: boolean });
  TestReporter.record({
    code: 'MEMOR-006',
    name: 'Đặt lại mã PIN qua mã xác thực OTP (ResetPin)',
    phase: 'Phase 2: PIN Security',
    passed: resetPinRes.status === 200 && resetPinData.success === true,
    httpStatus: resetPinRes.status,
    durationMs: resetPinRes.durationMs,
  });

  // ===========================================================================
  // PHASE 3: Quản lý Nội dung Ký Ức & Upload S3 — MEMOR-007..009
  // ===========================================================================
  console.log('\n--- [PHASE 3: Nội dung Ký Ức Số & Upload Garage S3] ---');

  // [MEMOR-009] POST /api/v1/memory/cards/:cardId/media/initiate
  const initiateUploadRes = await client.post<{
    data?: { uploadUrl: string; assetKey: string; expiresAt: string };
  }>(`/api/v1/memory/cards/${dbContext.cardId}/media/initiate`, {
    fileName: 'wedding_memory.jpg',
    contentType: 'image/jpeg',
    fileSize: 1024 * 50, // 50KB
  });
  const uploadInfo =
    initiateUploadRes.data.data ||
    (initiateUploadRes.data as unknown as {
      uploadUrl: string;
      assetKey: string;
      expiresAt: string;
    });

  let liveUploadPassed = false;
  if (initiateUploadRes.status === 200 && uploadInfo.uploadUrl) {
    try {
      // Test tải file giả lập trực tiếp lên Garage S3 qua Presigned PUT URL
      const dummyBuffer = Buffer.from('MEMORA_SAMPLE_DIGITAL_MEMORY_IMAGE_BINARY');
      const s3PutRes = await axios.put(uploadInfo.uploadUrl, dummyBuffer, {
        headers: { 'Content-Type': 'image/jpeg' },
        timeout: 10000,
      });
      liveUploadPassed = s3PutRes.status === 200;
    } catch {
      liveUploadPassed = false;
    }
  }

  TestReporter.record({
    code: 'MEMOR-009',
    name: 'Khởi tạo Presigned URL & Upload file lên Garage S3 thật (InitiateMediaUpload)',
    phase: 'Phase 3: Memory Contents',
    passed: initiateUploadRes.status === 200 && Boolean(uploadInfo.assetKey) && liveUploadPassed,
    httpStatus: initiateUploadRes.status,
    durationMs: initiateUploadRes.durationMs,
  });

  // [MEMOR-008] PUT /api/v1/memory/cards/:cardId/contents (Cập nhật kỷ niệm: 1 Text, 1 Ảnh S3)
  const updateContentsRes = await client.put<{ data?: { success: boolean; items: Array<{ id: string }> } }>(
    `/api/v1/memory/cards/${dbContext.cardId}/contents`,
    {
      items: [
        {
          contentType: 'TEXT',
          title: 'Lời Thề Nguyện',
          textContent: 'Cùng em đi đến cuối con đường hạnh phúc.',
          sortOrder: 0,
        },
        {
          contentType: 'IMAGE',
          title: 'Khoảnh Khắc Đeo Nhẫn',
          assetKey: uploadInfo.assetKey || 'memories/fallback/image.jpg',
          sortOrder: 1,
        },
      ],
    },
  );
  const updateData = updateContentsRes.data.data || (updateContentsRes.data as unknown as { success: boolean; items: unknown[] });
  TestReporter.record({
    code: 'MEMOR-008',
    name: 'Cập nhật danh sách nội dung Ký Ức Số (UpdateCardContents)',
    phase: 'Phase 3: Memory Contents',
    passed: updateContentsRes.status === 200 && updateData.success === true,
    httpStatus: updateContentsRes.status,
    durationMs: updateContentsRes.durationMs,
  });

  // [MEMOR-007] GET /api/v1/memory/cards/:cardId/contents (Xem kỷ niệm kèm xác thực PIN: 9999)
  const listContentsRes = await client.get<{ data?: { items: Array<{ id: string; assetUrl?: string }> } }>(
    `/api/v1/memory/cards/${dbContext.cardId}/contents?pin=9999`,
  );
  const contentsData = listContentsRes.data.data || (listContentsRes.data as unknown as { items: Array<{ id: string; assetUrl?: string }> });
  const hasItems = Array.isArray(contentsData.items) && contentsData.items.length === 2;
  const imageItemHasPresignedUrl = Boolean(contentsData.items?.[1]?.assetUrl);

  TestReporter.record({
    code: 'MEMOR-007',
    name: 'Đọc nội dung Ký Ức Số kèm xác thực mã PIN (ListCardContents)',
    phase: 'Phase 3: Memory Contents',
    passed: listContentsRes.status === 200 && hasItems && imageItemHasPresignedUrl,
    httpStatus: listContentsRes.status,
    durationMs: listContentsRes.durationMs,
  });

  // ===========================================================================
  // PHASE 4: Chia sẻ quyền & Xem qua Web Session — MEMOR-010..014
  // ===========================================================================
  console.log('\n--- [PHASE 4: Chia sẻ quyền & Khách vãng lai xem qua Web] ---');

  // [MEMOR-010] POST /api/v1/memory/cards/:cardId/grants (Mời người thân)
  const createGrantRes = await client.post<{
    data?: { grantId: string; invitationToken: string; inviteUrl: string };
  }>(`/api/v1/memory/cards/${dbContext.cardId}/grants`, {
    granteeEmail: 'triky@memora.vn',
    ttlDays: 7,
  });
  const grantData =
    createGrantRes.data.data ||
    (createGrantRes.data as unknown as {
      grantId: string;
      invitationToken: string;
      inviteUrl: string;
    });

  TestReporter.record({
    code: 'MEMOR-010',
    name: 'Mời người thân qua Email & sinh token bí mật (CreateAccessGrant)',
    phase: 'Phase 4: Sharing & Access',
    passed: createGrantRes.status === 201 && Boolean(grantData.invitationToken),
    httpStatus: createGrantRes.status,
    durationMs: createGrantRes.durationMs,
  });

  // [MEMOR-011] GET /api/v1/memory/cards/:cardId/grants (Danh sách quyền đã cấp)
  const listGrantsRes = await client.get<{ data?: { items: Array<{ id: string; granteeEmail: string }> } }>(
    `/api/v1/memory/cards/${dbContext.cardId}/grants`,
  );
  const grantsList = listGrantsRes.data.data || (listGrantsRes.data as unknown as { items: Array<{ id: string; granteeEmail: string }> });
  const foundGrant = Array.isArray(grantsList.items) && grantsList.items.some((g) => g.id === grantData.grantId);

  TestReporter.record({
    code: 'MEMOR-011',
    name: 'Xem danh sách người được cấp quyền truy cập (ListAccessGrants)',
    phase: 'Phase 4: Sharing & Access',
    passed: listGrantsRes.status === 200 && foundGrant,
    httpStatus: listGrantsRes.status,
    durationMs: listGrantsRes.durationMs,
  });

  // [MEMOR-013] POST /api/v1/memory/invitations/redeem (Khách đổi token lấy session - Không cần đăng nhập)
  const guestClient = new TestHttpClient(); // Client vãng lai không có token Bearer
  const redeemRes = await guestClient.post<{
    data?: { accessSessionId: string; requiresPin: boolean };
  }>('/api/v1/memory/invitations/redeem', {
    invitationToken: grantData.invitationToken,
  });
  const redeemData =
    redeemRes.data.data ||
    (redeemRes.data as unknown as {
      accessSessionId: string;
      requiresPin: boolean;
    });

  TestReporter.record({
    code: 'MEMOR-013',
    name: 'Đổi token lời mời lấy Web Session không cần tài khoản (RedeemInvitation)',
    phase: 'Phase 4: Sharing & Access',
    passed: redeemRes.status === 200 && Boolean(redeemData.accessSessionId) && redeemData.requiresPin === true,
    httpStatus: redeemRes.status,
    durationMs: redeemRes.durationMs,
  });

  // [MEMOR-014] GET /api/v1/memory/access/:accessSessionId (Khách xem kỷ vật qua Web Session với PIN)
  const sessionAccessRes = await guestClient.get<{
    data?: { items: Array<{ id: string }> };
  }>(`/api/v1/memory/access/${redeemData.accessSessionId}?pin=9999`);
  const sessionAccessData =
    sessionAccessRes.data.data ||
    (sessionAccessRes.data as unknown as { items: Array<{ id: string }> });
  const sessionHasItems = Array.isArray(sessionAccessData.items) && sessionAccessData.items.length === 2;

  TestReporter.record({
    code: 'MEMOR-014',
    name: 'Khách vãng lai xem kỷ niệm qua Web Session và mã PIN (GetMemoryBySession)',
    phase: 'Phase 4: Sharing & Access',
    passed: sessionAccessRes.status === 200 && sessionHasItems,
    httpStatus: sessionAccessRes.status,
    durationMs: sessionAccessRes.durationMs,
  });

  // [MEMOR-012] DELETE /api/v1/memory/cards/:cardId/grants/:grantId (Chủ sở hữu thu hồi quyền)
  const revokeRes = await client.delete<{ data?: { success: boolean } }>(
    `/api/v1/memory/cards/${dbContext.cardId}/grants/${grantData.grantId}`,
  );
  const revokeData = revokeRes.data.data || (revokeRes.data as unknown as { success: boolean });

  // Kiểm tra ngay sau khi thu hồi: Khách vãng lai truy cập lại bằng session cũ phải bị chặn 403 Forbidden!
  const revokedAccessRes = await guestClient.get(
    `/api/v1/memory/access/${redeemData.accessSessionId}?pin=9999`,
  );
  const correctlyBlocked = revokedAccessRes.status === 403;

  TestReporter.record({
    code: 'MEMOR-012',
    name: 'Thu hồi quyền chia sẻ & Chặn truy cập phiên cũ (RevokeAccessGrant)',
    phase: 'Phase 4: Sharing & Access',
    passed: revokeRes.status === 200 && revokeData.success === true && correctlyBlocked,
    httpStatus: revokeRes.status,
    durationMs: revokeRes.durationMs,
  });

  // ===========================================================================
  // TỔNG KẾT
  // ===========================================================================
  TestReporter.printSummaryTable('EXPERIENCE MEMORY DOMAIN (14 APIS)');
}

void main();
