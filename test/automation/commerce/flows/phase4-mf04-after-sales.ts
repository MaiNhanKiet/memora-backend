import { TestHttpClient } from '../core/http-client';
import { TestReporter } from '../core/assertions';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../../../../apps/commerce-service/generated/prisma/client';

export interface Phase4Context {
  claimId?: string;
  claimQuoteId?: string;
  transactionId?: string;
  gemstoneOptionId?: string;
  stockLotId?: string;
  adminToken?: string;
  customerToken?: string;
}

export async function runPhase4(
  client: TestHttpClient,
  context: Phase4Context,
): Promise<void> {
  const PHASE = 'Phase 4: MF04 — After-sales Claims, Warranty & Refund';
  console.log(`\n▶ BẮT ĐẦU [${PHASE}] (7 APIs)`);

  const uniqueSuffix = Date.now().toString().slice(-4);
  const claimId = context.claimId || '00000000-0000-0000-0000-000000000019';
  const claimQuoteId = context.claimQuoteId || '00000000-0000-0000-0000-000000000020';
  const transactionId = context.transactionId || '00000000-0000-0000-0000-000000000012';
  const gemstoneOptionId = context.gemstoneOptionId || '00000000-0000-0000-0000-000000000004';
  const stockLotId = context.stockLotId || '00000000-0000-0000-0000-000000000023';

  // Khởi tạo/seed Service Quote trong database để phục vụ kiểm thử luồng hậu mãi thật
  try {
    const connectionString = process.env.COMMERCE_DATABASE_URL || 'postgresql://memora:Memora123!@100.78.222.34:5432/memora';
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    await prisma.quotes.upsert({
      where: { id: claimQuoteId },
      create: {
        id: claimQuoteId,
        quote_no: `SQ-AUTO-${uniqueSuffix}`,
        claim_id: claimId,
        quote_type: 'SERVICE',
        version_no: 1,
        status: 'ISSUED',
        subtotal_amount: 50000,
        total_amount: 50000,
        currency: 'VND',
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      update: {
        status: 'ISSUED',
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.$disconnect();
    await pool.end();
  } catch (seedErr) {
    console.error('⚠ Lỗi khi seed Service Quote:', seedErr);
  }

  // Khách hàng duyệt báo giá dịch vụ & thanh toán phí dịch vụ
  if (context.customerToken) {
    client.setToken(context.customerToken);
  }

  // ---------------------------------------------------------------------------
  // 1. [ORDER-024] GET /api/v1/claims/:claimId/quotes
  // ---------------------------------------------------------------------------
  const listClaimQuotesRes = await client.get(`/api/v1/claims/${claimId}/quotes`);
  TestReporter.record({
    code: 'ORDER-024',
    name: 'Xem báo giá chi phí xử lý khiếu nại / sửa chữa hậu mãi',
    phase: PHASE,
    passed: listClaimQuotesRes.status === 200,
    httpStatus: listClaimQuotesRes.status,
    durationMs: listClaimQuotesRes.durationMs,
    error: listClaimQuotesRes.status >= 400 ? JSON.stringify(listClaimQuotesRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 2. [ORDER-025] POST /api/v1/claims/:claimId/quotes/:quoteId/accept
  // ---------------------------------------------------------------------------
  const acceptClaimQuoteRes = await client.post(`/api/v1/claims/${claimId}/quotes/${claimQuoteId}/accept`, {
    notes: 'Khách hàng chấp nhận báo giá dịch vụ đánh bóng',
  });
  TestReporter.record({
    code: 'ORDER-025',
    name: 'Khách hàng duyệt báo giá dịch vụ hậu mãi (Service Quote)',
    phase: PHASE,
    passed: acceptClaimQuoteRes.status === 200 || acceptClaimQuoteRes.status === 201,
    httpStatus: acceptClaimQuoteRes.status,
    durationMs: acceptClaimQuoteRes.durationMs,
    error: acceptClaimQuoteRes.status >= 400 ? JSON.stringify(acceptClaimQuoteRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 3. [ORDER-026] POST /api/v1/claims/:claimId/payments
  // ---------------------------------------------------------------------------
  const createClaimPaymentRes = await client.post(`/api/v1/claims/${claimId}/payments`, {
    returnUrl: 'https://memora.vn/claims/success',
    cancelUrl: 'https://memora.vn/claims/cancel',
  });
  TestReporter.record({
    code: 'ORDER-026',
    name: 'Tạo link thanh toán PayOS trả phí dịch vụ hậu mãi',
    phase: PHASE,
    passed: createClaimPaymentRes.status === 200 || createClaimPaymentRes.status === 201,
    httpStatus: createClaimPaymentRes.status,
    durationMs: createClaimPaymentRes.durationMs,
    error: createClaimPaymentRes.status >= 400 ? JSON.stringify(createClaimPaymentRes.data) : undefined,
  });

  // Chuyển sang quyền Quản trị / Nhân viên kho để thực hiện hoàn tiền và điều chỉnh kho
  if (context.adminToken) {
    client.setToken(context.adminToken);
  }

  // ---------------------------------------------------------------------------
  // 4. [ORDER-023] POST /api/v1/admin/payments/:transactionId/refund-requests
  // ---------------------------------------------------------------------------
  const refundRes = await client.post(`/api/v1/admin/payments/${transactionId}/refund-requests`, {
    refundAmount: 1000000,
    reason: 'Hoàn tiền trả hàng Return theo hạn mức Net Paid Credit',
  });
  TestReporter.record({
    code: 'ORDER-023',
    name: 'Tạo yêu cầu hoàn tiền đổi trả (Return Refund)',
    phase: PHASE,
    passed: refundRes.status === 201 || refundRes.status === 200,
    httpStatus: refundRes.status,
    durationMs: refundRes.durationMs,
    error: refundRes.status >= 400 ? JSON.stringify(refundRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 5. [INVEN-006] POST /api/v1/admin/inventory/certified-gemstones
  // ---------------------------------------------------------------------------
  const addCertifiedStoneRes = await client.post('/api/v1/admin/inventory/certified-gemstones', {
    internalCode: `CERT-DIA-GIA-${uniqueSuffix}`,
    gemstoneOptionId,
    certificateProvider: 'GIA',
    certificateNumber: `GIA-TEST-${uniqueSuffix}`,
  });
  TestReporter.record({
    code: 'INVEN-006',
    name: 'Cập nhật trạng thái viên đá kiểm định khi nhập lại kho',
    phase: PHASE,
    passed: addCertifiedStoneRes.status === 201 || addCertifiedStoneRes.status === 200,
    httpStatus: addCertifiedStoneRes.status,
    durationMs: addCertifiedStoneRes.durationMs,
    error: addCertifiedStoneRes.status >= 400 ? JSON.stringify(addCertifiedStoneRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 6. [INVEN-013] POST /api/v1/admin/inventory/adjustments
  // ---------------------------------------------------------------------------
  const adjustmentRes = await client.post('/api/v1/admin/inventory/adjustments', {
    stockLotId,
    adjustedQuantity: 1,
    reason: 'Nhập lại phôi nhẫn sau khi xử lý đổi trả bảo hành',
  });
  TestReporter.record({
    code: 'INVEN-013',
    name: 'Điều chỉnh kiểm kê kho sau hậu mãi (Adjustment)',
    phase: PHASE,
    passed: adjustmentRes.status === 201 || adjustmentRes.status === 200,
    httpStatus: adjustmentRes.status,
    durationMs: adjustmentRes.durationMs,
    error: adjustmentRes.status >= 400 ? JSON.stringify(adjustmentRes.data) : undefined,
  });

  console.log(`✔ HOÀN TẤT [${PHASE}]\n`);
}
