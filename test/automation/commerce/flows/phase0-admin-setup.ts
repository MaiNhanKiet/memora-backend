import { TestHttpClient } from '../core/http-client';
import { TestReporter } from '../core/assertions';

export interface Phase0Context {
  templateId?: string;
  materialId?: string;
  variantId?: string;
  gemstoneOptionId?: string;
  priceItemId?: string;
  priceVersionId?: string;
  pricingRuleId?: string;
  stockLotId?: string;
  ringBlankSku?: string;
  gemstoneBatchCode?: string;
  certifiedStoneId?: string;
}

export async function runPhase0(
  client: TestHttpClient,
  context: Phase0Context,
): Promise<void> {
  const PHASE = 'Phase 0: Master Data & Admin Setup';
  console.log(`\n▶ BẮT ĐẦU [${PHASE}] (24 APIs)`);

  const uniqueSuffix = Date.now().toString().slice(-4);

  // ---------------------------------------------------------------------------
  // 1. [CATAL-005] POST /api/v1/admin/catalog/templates
  // ---------------------------------------------------------------------------
  const createTemplateRes = await client.post<{ id?: string; data?: { id?: string } }>('/api/v1/admin/catalog/templates', {
    code: `T-AUTO-${uniqueSuffix}`,
    name: `Nhẫn Solitaire AutoTest ${uniqueSuffix}`,
    description: 'Mẫu nhẫn tự động kiểm thử hệ thống',
    glbAssetKey: 'models/rings/solitaire-autotest.glb',
    stoneLayout: 'SOLITAIRE',
    designSupportedPersonalizationPackages: ['NONE', 'FINGERPRINT', 'SOUNDWAVE'],
    gender: 'WOMEN',
  });

  context.templateId = createTemplateRes.data?.data?.id || createTemplateRes.data?.id || '00000000-0000-0000-0000-000000000001';
  TestReporter.record({
    code: 'CATAL-005',
    name: 'Tạo Template nhẫn mới',
    phase: PHASE,
    passed: createTemplateRes.status === 201 || createTemplateRes.status === 200,
    httpStatus: createTemplateRes.status,
    durationMs: createTemplateRes.durationMs,
    error: createTemplateRes.status >= 400 ? JSON.stringify(createTemplateRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 2. [CATAL-006] PATCH /api/v1/admin/catalog/templates/:templateId
  // ---------------------------------------------------------------------------
  const updateTemplateRes = await client.patch(`/api/v1/admin/catalog/templates/${context.templateId}`, {
    name: `Nhẫn Solitaire AutoTest Updated ${uniqueSuffix}`,
  });
  TestReporter.record({
    code: 'CATAL-006',
    name: 'Cập nhật Template nhẫn',
    phase: PHASE,
    passed: updateTemplateRes.status === 200,
    httpStatus: updateTemplateRes.status,
    durationMs: updateTemplateRes.durationMs,
    error: updateTemplateRes.status >= 400 ? JSON.stringify(updateTemplateRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 3. [CATAL-008] POST /api/v1/admin/catalog/templates/:templateId/archive
  // ---------------------------------------------------------------------------
  const tempArchiveTemplate = await client.post<{ id?: string; data?: { id?: string } }>('/api/v1/admin/catalog/templates', {
    code: `T-ARC-${uniqueSuffix}`,
    name: `Nhẫn Archive Test ${uniqueSuffix}`,
    glbAssetKey: 'models/rings/archive-test.glb',
  });
  const archiveId = tempArchiveTemplate.data?.data?.id || tempArchiveTemplate.data?.id || context.templateId;
  const archiveRes = await client.post(`/api/v1/admin/catalog/templates/${archiveId}/archive`, {});
  TestReporter.record({
    code: 'CATAL-008',
    name: 'Lưu trữ mẫu nhẫn (ARCHIVED)',
    phase: PHASE,
    passed: archiveRes.status === 200 || archiveRes.status === 201,
    httpStatus: archiveRes.status,
    durationMs: archiveRes.durationMs,
    error: archiveRes.status >= 400 ? JSON.stringify(archiveRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 4. [CATAL-010] POST /api/v1/admin/catalog/materials
  // ---------------------------------------------------------------------------
  const createMaterialRes = await client.post<{ id?: string; data?: { id?: string } }>('/api/v1/admin/catalog/materials', {
    code: `M-AU-${uniqueSuffix}`,
    name: `Vàng Vàng 18K AutoTest ${uniqueSuffix}`,
    materialFamily: 'GOLD',
    purityPercent: 75.0,
    color: 'YELLOW_GOLD',
  });
  context.materialId = createMaterialRes.data?.data?.id || createMaterialRes.data?.id || '00000000-0000-0000-0000-000000000002';
  TestReporter.record({
    code: 'CATAL-010',
    name: 'Tạo chất liệu mới (Material)',
    phase: PHASE,
    passed: createMaterialRes.status === 201 || createMaterialRes.status === 200,
    httpStatus: createMaterialRes.status,
    durationMs: createMaterialRes.durationMs,
    error: createMaterialRes.status >= 400 ? JSON.stringify(createMaterialRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 5. [CATAL-011] PATCH /api/v1/admin/catalog/materials/:materialId
  // ---------------------------------------------------------------------------
  const updateMaterialRes = await client.patch(`/api/v1/admin/catalog/materials/${context.materialId}`, {
    name: `Vàng Vàng 18K Cao Cấp ${uniqueSuffix}`,
  });
  TestReporter.record({
    code: 'CATAL-011',
    name: 'Cập nhật thông số chất liệu',
    phase: PHASE,
    passed: updateMaterialRes.status === 200,
    httpStatus: updateMaterialRes.status,
    durationMs: updateMaterialRes.durationMs,
    error: updateMaterialRes.status >= 400 ? JSON.stringify(updateMaterialRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 6. [CATAL-013] POST /api/v1/admin/catalog/variants
  // ---------------------------------------------------------------------------
  const createVariantRes = await client.post<{ id?: string; data?: { id?: string } }>('/api/v1/admin/catalog/variants', {
    ringTemplateId: context.templateId,
    materialId: context.materialId,
    standardSize: 14.0,
    localWallThicknessMm: 1.8,
    minRemainingWallThicknessMm: 1.2,
    maxSafeEngravingDepthMm: 0.3,
  });
  context.variantId = createVariantRes.data?.data?.id || createVariantRes.data?.id || '00000000-0000-0000-0000-000000000003';
  TestReporter.record({
    code: 'CATAL-013',
    name: 'Tạo biến thể sản phẩm (Variant)',
    phase: PHASE,
    passed: createVariantRes.status === 201 || createVariantRes.status === 200,
    httpStatus: createVariantRes.status,
    durationMs: createVariantRes.durationMs,
    error: createVariantRes.status >= 400 ? JSON.stringify(createVariantRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 7. [CATAL-014] PATCH /api/v1/admin/catalog/variants/:variantId
  // ---------------------------------------------------------------------------
  const updateVariantRes = await client.patch(`/api/v1/admin/catalog/variants/${context.variantId}`, {
    maxUpDelta: 2.0,
    maxDownDelta: 2.0,
  });
  TestReporter.record({
    code: 'CATAL-014',
    name: 'Cập nhật trạng thái biến thể',
    phase: PHASE,
    passed: updateVariantRes.status === 200,
    httpStatus: updateVariantRes.status,
    durationMs: updateVariantRes.durationMs,
    error: updateVariantRes.status >= 400 ? JSON.stringify(updateVariantRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 8. [CATAL-007] POST /api/v1/admin/catalog/templates/:templateId/publish (Sau khi đã có variant)
  // ---------------------------------------------------------------------------
  const publishTemplateRes = await client.post(`/api/v1/admin/catalog/templates/${context.templateId}/publish`, {});
  TestReporter.record({
    code: 'CATAL-007',
    name: 'Công bố mở bán Template nhẫn (PUBLISHED)',
    phase: PHASE,
    passed: publishTemplateRes.status === 200 || publishTemplateRes.status === 201,
    httpStatus: publishTemplateRes.status,
    durationMs: publishTemplateRes.durationMs,
    error: publishTemplateRes.status >= 400 ? JSON.stringify(publishTemplateRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 9. [CATAL-017] POST /api/v1/admin/catalog/gemstone-options
  // ---------------------------------------------------------------------------
  const createGemRes = await client.post<{ id?: string; data?: { id?: string } }>('/api/v1/admin/catalog/gemstone-options', {
    code: `GEM-DIA-${uniqueSuffix}`,
    name: `Kim cương tròn 0.5ct AutoTest ${uniqueSuffix}`,
    stoneType: 'DIAMOND',
    shape: 'ROUND',
    lengthMm: 5.1,
    widthMm: 5.1,
  });
  context.gemstoneOptionId = createGemRes.data?.data?.id || createGemRes.data?.id || '00000000-0000-0000-0000-000000000004';
  TestReporter.record({
    code: 'CATAL-017',
    name: 'Thêm tùy chọn đá quý (Gemstone Option)',
    phase: PHASE,
    passed: createGemRes.status === 201 || createGemRes.status === 200,
    httpStatus: createGemRes.status,
    durationMs: createGemRes.durationMs,
    error: createGemRes.status >= 400 ? JSON.stringify(createGemRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 10. [CATAL-018] PUT /api/v1/admin/catalog/compatibilities
  // ---------------------------------------------------------------------------
  const updateCompatRes = await client.put('/api/v1/admin/catalog/compatibilities', {
    templateVariantId: context.variantId,
    gemstoneGroupId: 'ac331a1b-0060-4795-b36d-1e48f6b40fd5',
    gemstoneOptionIds: [context.gemstoneOptionId],
  });
  TestReporter.record({
    code: 'CATAL-018',
    name: 'Thiết lập ma trận tương thích sản phẩm',
    phase: PHASE,
    passed: updateCompatRes.status === 200 || updateCompatRes.status === 201,
    httpStatus: updateCompatRes.status,
    durationMs: updateCompatRes.durationMs,
    error: updateCompatRes.status >= 400 ? JSON.stringify(updateCompatRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 11. [CATAL-020] PUT /api/v1/admin/catalog/resize-policies
  // ---------------------------------------------------------------------------
  const updateResizeRes = await client.put(`/api/v1/admin/catalog/resize-policies?templateVariantId=${context.variantId}`, {
    templateVariantId: context.variantId,
    maxUpDelta: 2.0,
    maxDownDelta: 2.0,
    resizeMethod: 'STRETCH_COMPRESS',
    minRemainingWallThicknessMm: 1.2,
  });
  TestReporter.record({
    code: 'CATAL-020',
    name: 'Cấu hình chính sách chỉnh kích thước nhẫn (Resize)',
    phase: PHASE,
    passed: updateResizeRes.status === 200 || updateResizeRes.status === 201,
    httpStatus: updateResizeRes.status,
    durationMs: updateResizeRes.durationMs,
    error: updateResizeRes.status >= 400 ? JSON.stringify(updateResizeRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 12. [PRICI-002] GET /api/v1/admin/pricing/items
  // ---------------------------------------------------------------------------
  const listPriceItemsRes = await client.get('/api/v1/admin/pricing/items');
  TestReporter.record({
    code: 'PRICI-002',
    name: 'Danh sách cấu phần giá (Price Items)',
    phase: PHASE,
    passed: listPriceItemsRes.status === 200,
    httpStatus: listPriceItemsRes.status,
    durationMs: listPriceItemsRes.durationMs,
    error: listPriceItemsRes.status >= 400 ? JSON.stringify(listPriceItemsRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 13. [PRICI-003] POST /api/v1/admin/pricing/items
  // ---------------------------------------------------------------------------
  const createPriceItemRes = await client.post<{ id?: string; data?: { id?: string } }>('/api/v1/admin/pricing/items', {
    priceType: 'RING_BLANK',
    code: `PI-RB-AUTO-${uniqueSuffix}`,
    templateVariantId: context.variantId,
  });
  context.priceItemId = createPriceItemRes.data?.data?.id || createPriceItemRes.data?.id || '00000000-0000-0000-0000-000000000005';
  TestReporter.record({
    code: 'PRICI-003',
    name: 'Tạo cấu phần giá mới',
    phase: PHASE,
    passed: createPriceItemRes.status === 201 || createPriceItemRes.status === 200,
    httpStatus: createPriceItemRes.status,
    durationMs: createPriceItemRes.durationMs,
    error: createPriceItemRes.status >= 400 ? JSON.stringify(createPriceItemRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 14. [PRICI-004] GET /api/v1/admin/pricing/versions
  // ---------------------------------------------------------------------------
  const listPriceVersionsRes = await client.get('/api/v1/admin/pricing/versions');
  TestReporter.record({
    code: 'PRICI-004',
    name: 'Lịch sử các phiên bản bảng giá',
    phase: PHASE,
    passed: listPriceVersionsRes.status === 200,
    httpStatus: listPriceVersionsRes.status,
    durationMs: listPriceVersionsRes.durationMs,
    error: listPriceVersionsRes.status >= 400 ? JSON.stringify(listPriceVersionsRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 15. [PRICI-005] POST /api/v1/admin/pricing/versions
  // ---------------------------------------------------------------------------
  const createPriceVersionRes = await client.post<{ id?: string; data?: { id?: string } }>('/api/v1/admin/pricing/versions', {
    priceItemId: context.priceItemId,
    amount: 1500000,
    currency: 'VND',
  });
  context.priceVersionId = createPriceVersionRes.data?.data?.id || createPriceVersionRes.data?.id || '00000000-0000-0000-0000-000000000006';
  TestReporter.record({
    code: 'PRICI-005',
    name: 'Tạo phiên bản giá DRAFT',
    phase: PHASE,
    passed: createPriceVersionRes.status === 201 || createPriceVersionRes.status === 200,
    httpStatus: createPriceVersionRes.status,
    durationMs: createPriceVersionRes.durationMs,
    error: createPriceVersionRes.status >= 400 ? JSON.stringify(createPriceVersionRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 16. [PRICI-006] POST /api/v1/admin/pricing/versions/:versionId/approve
  // ---------------------------------------------------------------------------
  const approvePriceVersionRes = await client.post(`/api/v1/admin/pricing/versions/${context.priceVersionId}/approve`, {
    reviewNote: 'Duyệt bảng giá vàng chuẩn',
  });
  TestReporter.record({
    code: 'PRICI-006',
    name: 'Quản lý duyệt phiên bản giá ACTIVE',
    phase: PHASE,
    passed: approvePriceVersionRes.status === 200 || approvePriceVersionRes.status === 201,
    httpStatus: approvePriceVersionRes.status,
    durationMs: approvePriceVersionRes.durationMs,
    error: approvePriceVersionRes.status >= 400 ? JSON.stringify(approvePriceVersionRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 17. [PRICI-007] POST /api/v1/admin/pricing/versions/:versionId/reject
  // ---------------------------------------------------------------------------
  const tempRejectVersion = await client.post<{ id?: string; data?: { id?: string } }>('/api/v1/admin/pricing/versions', {
    priceItemId: context.priceItemId,
    amount: 9999999,
    currency: 'VND',
  });
  const rejectVersionId = tempRejectVersion.data?.data?.id || tempRejectVersion.data?.id || context.priceVersionId;
  const rejectPriceVersionRes = await client.post(`/api/v1/admin/pricing/versions/${rejectVersionId}/reject`, {
    reviewNote: 'Giá quá cao so với quy định',
  });
  TestReporter.record({
    code: 'PRICI-007',
    name: 'Từ chối phiên bản giá đề xuất',
    phase: PHASE,
    passed: rejectPriceVersionRes.status === 200 || rejectPriceVersionRes.status === 201,
    httpStatus: rejectPriceVersionRes.status,
    durationMs: rejectPriceVersionRes.durationMs,
    error: rejectPriceVersionRes.status >= 400 ? JSON.stringify(rejectPriceVersionRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 18. [PRICI-008] GET /api/v1/admin/pricing/rules
  // ---------------------------------------------------------------------------
  const listRulesRes = await client.get('/api/v1/admin/pricing/rules');
  TestReporter.record({
    code: 'PRICI-008',
    name: 'Tra cứu danh sách chính sách chiết khấu/giá',
    phase: PHASE,
    passed: listRulesRes.status === 200,
    httpStatus: listRulesRes.status,
    durationMs: listRulesRes.durationMs,
    error: listRulesRes.status >= 400 ? JSON.stringify(listRulesRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 19. [PRICI-009] POST /api/v1/admin/pricing/rules
  // ---------------------------------------------------------------------------
  const createRuleRes = await client.post<{ id?: string; data?: { id?: string } }>('/api/v1/admin/pricing/rules', {
    code: `RULE-REDELIVERY-${uniqueSuffix}`,
    name: `Phí giao lại khi vắng mặt ${uniqueSuffix}`,
    ruleType: 'REDELIVERY_FEE',
    redeliveryReason: 'CUSTOMER_ABSENT',
  });
  context.pricingRuleId = createRuleRes.data?.data?.id || createRuleRes.data?.id || '00000000-0000-0000-0000-000000000007';
  TestReporter.record({
    code: 'PRICI-009',
    name: 'Tạo chính sách giá DRAFT',
    phase: PHASE,
    passed: createRuleRes.status === 201 || createRuleRes.status === 200,
    httpStatus: createRuleRes.status,
    durationMs: createRuleRes.durationMs,
    error: createRuleRes.status >= 400 ? JSON.stringify(createRuleRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 20. [PRICI-010] POST /api/v1/admin/pricing/rules/:ruleId/activate
  // ---------------------------------------------------------------------------
  const activateRuleRes = await client.post(`/api/v1/admin/pricing/rules/${context.pricingRuleId}/activate`, {});
  TestReporter.record({
    code: 'PRICI-010',
    name: 'Kích hoạt chính sách giá (ACTIVE)',
    phase: PHASE,
    passed: activateRuleRes.status === 200 || activateRuleRes.status === 201,
    httpStatus: activateRuleRes.status,
    durationMs: activateRuleRes.durationMs,
    error: activateRuleRes.status >= 400 ? JSON.stringify(activateRuleRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 21. [INVEN-001] GET /api/v1/admin/inventory/ring-blanks
  // ---------------------------------------------------------------------------
  const listRingBlanksRes = await client.get('/api/v1/admin/inventory/ring-blanks');
  TestReporter.record({
    code: 'INVEN-001',
    name: 'Xem danh sách phôi nhẫn trong kho',
    phase: PHASE,
    passed: listRingBlanksRes.status === 200,
    httpStatus: listRingBlanksRes.status,
    durationMs: listRingBlanksRes.durationMs,
    error: listRingBlanksRes.status >= 400 ? JSON.stringify(listRingBlanksRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 22. [INVEN-002] POST /api/v1/admin/inventory/ring-blanks/receipts
  // ---------------------------------------------------------------------------
  const receiptRingBlankRes = await client.post<{ id?: string; stockLotId?: string; data?: { id?: string; stockLotId?: string } }>('/api/v1/admin/inventory/ring-blanks/receipts', {
    templateVariantId: context.variantId,
    quantity: 10,
    lotCode: `LOT-${uniqueSuffix}`,
  });
  context.stockLotId = receiptRingBlankRes.data?.data?.id || receiptRingBlankRes.data?.data?.stockLotId || receiptRingBlankRes.data?.id || receiptRingBlankRes.data?.stockLotId || '00000000-0000-0000-0000-000000000023';
  TestReporter.record({
    code: 'INVEN-002',
    name: 'Nhập kho phôi nhẫn mới',
    phase: PHASE,
    passed: receiptRingBlankRes.status === 201 || receiptRingBlankRes.status === 200,
    httpStatus: receiptRingBlankRes.status,
    durationMs: receiptRingBlankRes.durationMs,
    error: receiptRingBlankRes.status >= 400 ? JSON.stringify(receiptRingBlankRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 23. [INVEN-003] GET /api/v1/admin/inventory/gemstone-batches
  // ---------------------------------------------------------------------------
  const listGemBatchesRes = await client.get('/api/v1/admin/inventory/gemstone-batches');
  TestReporter.record({
    code: 'INVEN-003',
    name: 'Xem danh sách lô đá quý không chứng chỉ',
    phase: PHASE,
    passed: listGemBatchesRes.status === 200,
    httpStatus: listGemBatchesRes.status,
    durationMs: listGemBatchesRes.durationMs,
    error: listGemBatchesRes.status >= 400 ? JSON.stringify(listGemBatchesRes.data) : undefined,
  });

  // ---------------------------------------------------------------------------
  // 24. [INVEN-004] POST /api/v1/admin/inventory/gemstone-batches/receipts
  // ---------------------------------------------------------------------------
  context.gemstoneBatchCode = `BATCH-MELEE-${uniqueSuffix}`;
  const receiptGemBatchRes = await client.post('/api/v1/admin/inventory/gemstone-batches/receipts', {
    gemstoneOptionId: context.gemstoneOptionId,
    quantity: 100,
    lotCode: context.gemstoneBatchCode,
  });
  TestReporter.record({
    code: 'INVEN-004',
    name: 'Nhập kho lô đá quý tấm',
    phase: PHASE,
    passed: receiptGemBatchRes.status === 201 || receiptGemBatchRes.status === 200,
    httpStatus: receiptGemBatchRes.status,
    durationMs: receiptGemBatchRes.durationMs,
    error: receiptGemBatchRes.status >= 400 ? JSON.stringify(receiptGemBatchRes.data) : undefined,
  });

  console.log(`✔ HOÀN TẤT [${PHASE}]\n`);
}
