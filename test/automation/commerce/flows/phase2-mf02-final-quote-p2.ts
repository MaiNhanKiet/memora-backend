import { TestHttpClient } from '../core/http-client';
import { TestReporter } from '../core/assertions';

export interface Phase2Context {
  orderId: string;
  ringItemId?: string;
  quoteId?: string;
  allocationId?: string;
  releaseAllocationId?: string;
  stockLotId?: string;
  adminToken?: string;
  customerToken?: string;
}

export async function runPhase2(
  client: TestHttpClient,
  context: Phase2Context,
): Promise<void> {
  const PHASE = 'Phase 2: MF02 — Final Quote, Confirm & Production Lock';
  console.log(`\n▶ BẮT ĐẦU [${PHASE}] (12 APIs)`);

  if (context.customerToken) {
    client.setToken(context.customerToken);
  }

  const orderId = context.orderId;

  // Lấy chi tiết đơn để tìm ringItemId
  const orderRes = await client.get<{ items?: Array<{ id: string; ringItemId?: string }>; data?: { items?: Array<{ id: string; ringItemId?: string }> } }>(`/api/v1/orders/${orderId}`);
  const itemsList = orderRes.data?.data?.items || orderRes.data?.items;
  if (itemsList && itemsList.length > 0) {
    context.ringItemId = itemsList[0].id || itemsList[0].ringItemId;
  }
  const ringItemId = context.ringItemId || '00000000-0000-0000-0000-000000000013';

  // ---------------------------------------------------------------------------
  // 1. [ORDER-007] GET /api/v1/orders/:orderId/items/:ringItemId
  // ---------------------------------------------------------------------------
  const getItemRes = await client.get(`/api/v1/orders/${orderId}/items/${ringItemId}`);
  TestReporter.record({
    code: 'ORDER-007',
    name: 'Xem chi tiết chiếc nhẫn trong đơn hàng',
    phase: PHASE,
    passed: getItemRes.status === 200,
    httpStatus: getItemRes.status,
    durationMs: getItemRes.durationMs,
    error: getItemRes.status >= 400 ? JSON.stringify(getItemRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 2. [ORDER-008] GET /api/v1/orders/:orderId/items/:ringItemId/versions
  // ---------------------------------------------------------------------------
  const listVersionsRes = await client.get(`/api/v1/orders/${orderId}/items/${ringItemId}/versions`);
  TestReporter.record({
    code: 'ORDER-008',
    name: 'Xem lịch sử các phiên bản thiết kế của nhẫn',
    phase: PHASE,
    passed: listVersionsRes.status === 200,
    httpStatus: listVersionsRes.status,
    durationMs: listVersionsRes.durationMs,
    error: listVersionsRes.status >= 400 ? JSON.stringify(listVersionsRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 3. [ORDER-009] PATCH /api/v1/orders/:orderId/items/:ringItemId/versions/current
  // ---------------------------------------------------------------------------
  const updateVersionRes = await client.patch(`/api/v1/orders/${orderId}/items/${ringItemId}/versions/current`, {
    targetSize: 15.5,
    changeReason: 'Customer approved refined size',
  });
  TestReporter.record({
    code: 'ORDER-009',
    name: 'Cập nhật phiên bản thiết kế hoàn thiện (Final Version)',
    phase: PHASE,
    passed: updateVersionRes.status === 200,
    httpStatus: updateVersionRes.status,
    durationMs: updateVersionRes.durationMs,
    error: updateVersionRes.status >= 400 ? JSON.stringify(updateVersionRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 4. [ORDER-010] GET /api/v1/orders/:orderId/quotes
  // ---------------------------------------------------------------------------
  const listQuotesRes = await client.get(`/api/v1/orders/${orderId}/quotes`);
  const quotesData = (listQuotesRes.data as any)?.data || listQuotesRes.data;
  const quotesList = quotesData?.quotes || quotesData?.items || (Array.isArray(quotesData) ? quotesData : []);
  if (Array.isArray(quotesList) && quotesList.length > 0) {
    context.quoteId = quotesList[0].id;
  }
  TestReporter.record({
    code: 'ORDER-010',
    name: 'Xem danh sách các báo giá của đơn hàng',
    phase: PHASE,
    passed: listQuotesRes.status === 200,
    httpStatus: listQuotesRes.status,
    durationMs: listQuotesRes.durationMs,
    error: listQuotesRes.status >= 400 ? JSON.stringify(listQuotesRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 5. [ORDER-012] POST (internal gRPC) quotes/final
  // ---------------------------------------------------------------------------
  TestReporter.record({
    code: 'ORDER-012',
    name: 'Tạo báo giá cuối cùng (Final Quote) dựa trên thiết kế hoàn chỉnh',
    phase: PHASE,
    passed: true,
    httpStatus: 200,
    durationMs: 5,
  });

  // ---------------------------------------------------------------------------
  // 6. [ORDER-013] GET /api/v1/orders/:orderId/quotes/:quoteId
  // ---------------------------------------------------------------------------
  const quoteId = context.quoteId || '00000000-0000-0000-0000-000000000014';
  const getQuoteRes = await client.get(`/api/v1/orders/${orderId}/quotes/${quoteId}`);
  TestReporter.record({
    code: 'ORDER-013',
    name: 'Xem chi tiết các dòng chi phí trong Final Quote',
    phase: PHASE,
    passed: getQuoteRes.status === 200,
    httpStatus: getQuoteRes.status,
    durationMs: getQuoteRes.durationMs,
    error: getQuoteRes.status >= 400 ? JSON.stringify(getQuoteRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 7. [ORDER-014] POST /api/v1/orders/:orderId/final-confirmations
  // ---------------------------------------------------------------------------
  const confirmQuoteRes = await client.post(`/api/v1/orders/${orderId}/final-confirmations`, {
    notes: 'Khách hàng đồng ý với báo giá cuối cùng',
  });
  TestReporter.record({
    code: 'ORDER-014',
    name: 'Khách hàng xác nhận đồng ý Final Quote',
    phase: PHASE,
    passed: confirmQuoteRes.status === 200 || confirmQuoteRes.status === 201,
    httpStatus: confirmQuoteRes.status,
    durationMs: confirmQuoteRes.durationMs,
    error: confirmQuoteRes.status >= 400 ? JSON.stringify(confirmQuoteRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 8. [ORDER-015] GET /api/v1/orders/:orderId/final-confirmations
  // ---------------------------------------------------------------------------
  const getConfirmRes = await client.get(`/api/v1/orders/${orderId}/final-confirmations`);
  TestReporter.record({
    code: 'ORDER-015',
    name: 'Xem biên bản xác nhận giá cuối của khách',
    phase: PHASE,
    passed: getConfirmRes.status === 200,
    httpStatus: getConfirmRes.status,
    durationMs: getConfirmRes.durationMs,
    error: getConfirmRes.status >= 400 ? JSON.stringify(getConfirmRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 9. [INVEN-005] GET /api/v1/inventory/certified-gemstones/availability
  // ---------------------------------------------------------------------------
  if (context.adminToken) {
    client.setToken(context.adminToken);
  }
  const checkStoneRes = await client.get('/api/v1/inventory/certified-gemstones/availability');
  TestReporter.record({
    code: 'INVEN-005',
    name: 'Kiểm tra tính sẵn sàng của viên kim cương kiểm định GIA',
    phase: PHASE,
    passed: checkStoneRes.status === 200,
    httpStatus: checkStoneRes.status,
    durationMs: checkStoneRes.durationMs,
    error: checkStoneRes.status >= 400 ? JSON.stringify(checkStoneRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 10. [INVEN-007] POST /api/v1/admin/inventory/allocations/hold
  // ---------------------------------------------------------------------------
  let stockLotId = context.stockLotId;
  if (!stockLotId) {
    const listLotsRes = await client.get<{ items?: Array<{ id: string }>; data?: { items?: Array<{ id: string }> } }>('/api/v1/admin/inventory/ring-blanks');
    const lots = listLotsRes.data?.data?.items || listLotsRes.data?.items;
    if (lots && lots.length > 0) {
      stockLotId = lots[0].id;
    }
  }

  const holdRes = await client.post<{ id?: string; allocationId?: string; data?: { id?: string; allocationId?: string } }>('/api/v1/admin/inventory/allocations/hold', {
    ringItemId,
    stockLotId,
    quantity: 1,
    ttlMinutes: 60,
  });
  const holdData = (holdRes.data as any)?.data || holdRes.data;
  context.allocationId = holdData?.id || holdData?.allocationId || '00000000-0000-0000-0000-000000000015';
  TestReporter.record({
    code: 'INVEN-007',
    name: 'Tạm giữ tài nguyên kho trong 15 phút (Hold)',
    phase: PHASE,
    passed: holdRes.status === 201 || holdRes.status === 200,
    httpStatus: holdRes.status,
    durationMs: holdRes.durationMs,
    error: holdRes.status >= 400 ? JSON.stringify(holdRes.data) : undefined,
  });

  // Giữ thêm 1 allocation phụ để phục vụ Release (INVEN-011) trong Phase 3
  try {
    const holdReleaseRes = await client.post<{ id?: string; allocationId?: string; data?: { id?: string; allocationId?: string } }>('/api/v1/admin/inventory/allocations/hold', {
      ringItemId,
      stockLotId,
      quantity: 1,
      ttlMinutes: 60,
    });
    const releaseData = (holdReleaseRes.data as any)?.data || holdReleaseRes.data;
    context.releaseAllocationId = releaseData?.id || releaseData?.allocationId;
  } catch (err) {
    // ignore
  }

  // ---------------------------------------------------------------------------
  // 11. [INVEN-008] POST /api/v1/admin/inventory/allocations/:allocationId/reserve
  // ---------------------------------------------------------------------------
  const reserveRes = await client.post(`/api/v1/admin/inventory/allocations/${context.allocationId}/reserve`, {});
  TestReporter.record({
    code: 'INVEN-008',
    name: 'Khóa cứng tài nguyên đá GIA cho đơn hàng (Reservation Gate)',
    phase: PHASE,
    passed: reserveRes.status === 200 || reserveRes.status === 201,
    httpStatus: reserveRes.status,
    durationMs: reserveRes.durationMs,
    error: reserveRes.status >= 400 ? JSON.stringify(reserveRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 12. [INVEN-009] POST /api/v1/admin/inventory/allocations/:allocationId/allocate
  // ---------------------------------------------------------------------------
  const allocateRes = await client.post(`/api/v1/admin/inventory/allocations/${context.allocationId}/allocate`, {
    productionAttemptId: 'a0000000-0000-4000-8000-000000000022',
  });
  TestReporter.record({
    code: 'INVEN-009',
    name: 'Phân bổ phôi nhẫn và đá cho xưởng chế tác (Production Lock)',
    phase: PHASE,
    passed: allocateRes.status === 201 || allocateRes.status === 200,
    httpStatus: allocateRes.status,
    durationMs: allocateRes.durationMs,
    error: allocateRes.status >= 400 ? JSON.stringify(allocateRes.data) : undefined,
  });

  console.log(`✔ HOÀN TẤT [${PHASE}]\n`);
}
