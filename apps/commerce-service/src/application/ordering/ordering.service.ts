import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { parseVerifiedActor, type ParsedVerifiedActor } from '@app/common';
import type {
  AcceptServiceQuoteRequest,
  AcceptServiceQuoteResponse,
  AdminOrderSummaryItem,
  CancelOrderRequest,
  CancelOrderResponse,
  ConfirmFinalQuoteRequest,
  ConfirmFinalQuoteResponse,
  CreateClaimPaymentLinkRequest,
  CreateFinalQuoteRequest,
  CreateOrderPaymentLinkRequest,
  CreateOrderRequest,
  CreateOrderResponse,
  CreateRefundRequestMessage,
  CreateRefundResponse,
  FullQuoteDetail,
  GetAdminOrderDetailsRequest,
  GetAdminOrderDetailsResponse,
  GetOrderByIdRequest,
  GetOrderByIdResponse,
  GetOrderFinalConfirmationsRequest,
  GetOrderFinalConfirmationsResponse,
  GetOrderInvoiceRequest,
  GetOrderPaymentByIdRequest,
  GetOrderPersonalizationContextRequest,
  GetOrderPersonalizationContextResponse,
  GetOrderQuoteByIdRequest,
  GetOrderTimelineRequest,
  GetOrderTimelineResponse,
  GetPaymentReceiptRequest,
  GetRingItemDetailsRequest,
  GetRingItemDetailsResponse,
  ListAdminOrdersRequest,
  ListAdminOrdersResponse,
  ListClaimQuotesRequest,
  ListClaimQuotesResponse,
  ListOrderPaymentsRequest,
  ListOrderPaymentsResponse,
  ListOrderQuotesRequest,
  ListOrderQuotesResponse,
  ListOrdersRequest,
  ListOrdersResponse,
  ListRingItemVersionsRequest,
  ListRingItemVersionsResponse,
  OrderInvoiceDetail,
  PaymentLinkResponse,
  PaymentReceiptDetail,
  PaymentTransactionDetail,
  PayosWebhookRequest,
  PayosWebhookResponse,
  PersonalizationRingItem,
  PublishFinalQuoteRequest,
  ReconcilePaymentTransactionRequest,
  RejectFinalQuoteRequest,
  RejectFinalQuoteResponse,
  RingItemVersionSummary,
  StageGateItem,
  TimelineEventItem,
  UpdateCurrentRingItemVersionRequest,
  UpdateCurrentRingItemVersionResponse,
  UpdateFinalQuoteRequest,
  UpdateOrderStatusRequest,
  UpdateOrderStatusResponse,
  VerifiedActor,
} from '@app/contracts';
import { OrderingRepository } from '../../repositories/ordering.repository';
import { PayosProvider } from '../../infrastructure/payment/payos.provider';
import type { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class OrderingService {
  constructor(
    private readonly repository: OrderingRepository,
    private readonly payosProvider: PayosProvider,
  ) {}

  // ---------------------------------------------------------------------------
  // [ORDER-001] Create Order
  // ---------------------------------------------------------------------------
  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    const actor = this.validateActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    // 1. Validate drafts selection length (1 to 2 items)
    if (
      !request.selectedDraftIds ||
      request.selectedDraftIds.length < 1 ||
      request.selectedDraftIds.length > 2
    ) {
      throw new BadRequestException(
        'An order must contain between 1 and 2 ring design drafts',
      );
    }

    // 2. Fetch and validate drafts exist and are IN_CART
    const drafts = await this.repository.findDraftsByIds(
      request.selectedDraftIds,
    );
    if (drafts.length !== request.selectedDraftIds.length) {
      throw new NotFoundException(
        'One or more selected drafts were not found or are no longer in cart',
      );
    }

    // 3. Check personalization packages
    const hasPersonalization = drafts.some(
      (d) =>
        d.personalization_package === 'FINGERPRINT' ||
        d.personalization_package === 'SOUNDWAVE',
    );

    // 4. Guest checkout restrictions
    if (!actor.userId && hasPersonalization) {
      throw new ForbiddenException(
        'Guest checkout is not permitted for personalized rings (FINGERPRINT / SOUNDWAVE). Please sign in.',
      );
    }

    // 5. Pre-P1 Acknowledgement validation for personalized orders
    let preP1NoticeVersion: string | undefined;
    let privacyNoticeAcknowledgedAt: Date | undefined;
    let p1NonrefundAcknowledgedAt: Date | undefined;
    let preP1EvidenceJson: Prisma.InputJsonValue | undefined;

    if (hasPersonalization) {
      if (
        !request.preP1Acknowledgement ||
        !request.preP1Acknowledgement.privacyNoticeAcknowledged ||
        !request.preP1Acknowledgement.p1NonrefundAcknowledged
      ) {
        throw new BadRequestException(
          'Pre-P1 consent and non-refund acknowledgment are mandatory for orders with personalized items',
        );
      }
      preP1NoticeVersion = request.preP1Acknowledgement.noticeVersion || 'v1.0';
      privacyNoticeAcknowledgedAt = new Date();
      p1NonrefundAcknowledgedAt = new Date();
      preP1EvidenceJson = {
        noticeVersion: preP1NoticeVersion,
        privacyNoticeAcknowledged: true,
        p1NonrefundAcknowledged: true,
        acknowledgedAt: privacyNoticeAcknowledgedAt.toISOString(),
      };
    }

    // 6. Source Plan Mode resolution
    let resolvedSourcePlanMode = 'N/A';
    if (drafts.length === 2) {
      const p1 = drafts[0].personalization_package;
      const p2 = drafts[1].personalization_package;
      if (
        (p1 === 'FINGERPRINT' && p2 === 'FINGERPRINT') ||
        (p1 === 'SOUNDWAVE' && p2 === 'SOUNDWAVE')
      ) {
        resolvedSourcePlanMode =
          request.sourcePlanMode === 'SHARED' ||
          request.sourcePlanMode === 'SEPARATE'
            ? request.sourcePlanMode
            : 'SHARED';
      }
    }

    // 7. Initial Order Status resolution (AWAITING_P1 vs PENDING_FINAL_QUOTE)
    const initialStatus = hasPersonalization
      ? 'AWAITING_P1'
      : 'PENDING_FINAL_QUOTE';

    // 8. Execute transactional order creation
    const cartId = drafts[0]?.cart_id ?? undefined;
    let deliveryAddressJson: Prisma.InputJsonValue = {};
    if (request.deliveryAddressJson) {
      try {
        const parsed: unknown = JSON.parse(request.deliveryAddressJson);
        deliveryAddressJson = parsed as Prisma.InputJsonValue;
      } catch {
        deliveryAddressJson = { raw: request.deliveryAddressJson };
      }
    }

    const result = await this.repository.createOrderTransaction({
      ownerCustomerIdentityId: actorId,
      guestEmail: actor.userId ? undefined : request.recipientEmail,
      guestPhone: actor.userId ? undefined : request.recipientPhone,
      createdFromCartId: cartId,
      status: initialStatus,
      sourcePlanMode: resolvedSourcePlanMode,
      preP1NoticeVersion,
      privacyNoticeAcknowledgedAt,
      p1NonrefundAcknowledgedAt,
      preP1EvidenceJson,
      fulfillmentMode: request.fulfillmentMode || 'DELIVERY',
      recipientName: request.recipientName,
      recipientPhone: request.recipientPhone,
      recipientEmail: request.recipientEmail,
      deliveryAddressJson,
      selectedDrafts: drafts,
    });

    const totalNum = Number(result.totalAmount);
    const depositNum = hasPersonalization ? Math.round(totalNum * 0.3) : 0;

    return {
      orderId: result.order.id,
      orderNo: result.order.order_no,
      status: result.order.status,
      sourcePlanMode: result.order.source_plan_mode,
      itemsCount: result.itemsCount,
      totalAmount: totalNum,
      depositAmount: depositNum,
      currency: 'VND',
      createdAt: result.order.created_at.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-002] List Orders
  // ---------------------------------------------------------------------------
  async listOrders(request: ListOrdersRequest): Promise<ListOrdersResponse> {
    const actor = this.validateActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;
    const page = Math.max(request.page || 1, 1);
    const limit = Math.min(Math.max(request.limit || 20, 1), 100);
    const skip = (page - 1) * limit;

    const { items, total } = await this.repository.listOrders(
      actorId,
      actor.userId ? undefined : actor.guestSessionId,
      request.status,
      skip,
      limit,
    );

    return {
      items: items.map((o) => ({
        id: o.id,
        orderNo: o.order_no,
        status: o.status,
        sourcePlanMode: o.source_plan_mode,
        itemsCount: o._count.ring_items,
        totalAmount: Number(
          o.quotes_orders_current_quote_idToquotes?.total_amount ?? 0,
        ),
        currency:
          o.quotes_orders_current_quote_idToquotes?.currency?.trim() || 'VND',
        recipientName: o.recipient_name ?? undefined,
        createdAt: o.created_at.toISOString(),
        updatedAt: o.updated_at.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-003] Get Order by ID
  // ---------------------------------------------------------------------------
  async getOrderById(
    request: GetOrderByIdRequest,
  ): Promise<GetOrderByIdResponse> {
    const actor = this.validateActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    const order = await this.repository.findOrderById(
      request.orderId,
      actorId,
      actor.userId ? undefined : actor.guestSessionId,
    );

    if (!order) {
      throw new NotFoundException('Order not found or access denied');
    }

    const currentQuote = order.quotes_orders_current_quote_idToquotes;

    return {
      id: order.id,
      orderNo: order.order_no,
      status: order.status,
      sourcePlanMode: order.source_plan_mode,
      fulfillmentMode: order.fulfillment_mode || 'DELIVERY',
      recipientName: order.recipient_name || '',
      recipientPhone: order.recipient_phone || '',
      recipientEmail: order.recipient_email || '',
      deliveryAddressJson: order.delivery_address_json
        ? JSON.stringify(order.delivery_address_json)
        : '{}',
      currentQuote: currentQuote
        ? {
            quoteId: currentQuote.id,
            quoteNo: currentQuote.quote_no,
            quoteType: currentQuote.quote_type,
            subtotalAmount: Number(currentQuote.subtotal_amount),
            deliveryAmount: Number(currentQuote.delivery_amount),
            adjustmentAmount: Number(currentQuote.adjustment_amount),
            totalAmount: Number(currentQuote.total_amount),
            currency: currentQuote.currency.trim(),
            status: currentQuote.status,
          }
        : undefined,
      items: order.ring_items.map((item) => {
        const ver =
          item.ring_item_versions_ring_items_current_version_idToring_item_versions;
        return {
          id: item.id,
          itemNo: item.item_no,
          sourceRingDesignDraftId: item.source_ring_design_draft_id,
          currentVersionId: item.current_version_id || '',
          versionNo: ver?.version_no ?? 1,
          templateVariantId: ver?.template_variants.id || '',
          templateCode: ver?.template_variants.ring_templates.code || '',
          templateName: ver?.template_variants.ring_templates.name || '',
          materialName: ver?.template_variants.materials.name || '',
          targetSize: Number(ver?.target_size ?? 0),
          personalizationPackage: ver?.personalization_package || 'NONE',
          memoryEnabled: ver?.memory_enabled ?? false,
        };
      }),
      createdAt: order.created_at.toISOString(),
      updatedAt: order.updated_at.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-004] Get Order Timeline
  // ---------------------------------------------------------------------------
  async getOrderTimeline(
    request: GetOrderTimelineRequest,
  ): Promise<GetOrderTimelineResponse> {
    const actor = this.validateActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    const order = await this.repository.findOrderById(
      request.orderId,
      actorId,
      actor.userId ? undefined : actor.guestSessionId,
    );

    if (!order) {
      throw new NotFoundException('Order not found or access denied');
    }

    const events: TimelineEventItem[] = [
      {
        eventType: 'ORDER_CREATED',
        title: 'Tạo đơn hàng',
        description: `Đơn hàng ${order.order_no} được khởi tạo thành công`,
        occurredAt: order.created_at.toISOString(),
        status: 'COMPLETED',
      },
    ];

    if (order.privacy_notice_acknowledged_at) {
      events.push({
        eventType: 'PRE_P1_ACKNOWLEDGED',
        title: 'Xác nhận thông báo trước P1 & quy tắc cọc',
        description:
          'Khách hàng đã xác nhận điều khoản cá nhân hóa và hiểu rõ chính sách cọc P1',
        occurredAt: order.privacy_notice_acknowledged_at.toISOString(),
        status: 'COMPLETED',
      });
    }

    if (order.cancelled_at) {
      events.push({
        eventType: 'ORDER_CANCELLED',
        title: 'Đơn hàng bị hủy',
        description:
          order.cancellation_reason || 'Đơn hàng đã được hủy theo yêu cầu',
        occurredAt: order.cancelled_at.toISOString(),
        status: 'CANCELLED',
      });
    }

    const isAllNone = order.status === 'PENDING_FINAL_QUOTE';

    const stageGates: StageGateItem[] = [
      {
        stageCode: 'CREATION',
        stageName: 'Khởi tạo đơn hàng',
        status: 'COMPLETED',
        isCurrent: false,
        completedAt: order.created_at.toISOString(),
      },
      {
        stageCode: 'DEPOSIT_P1',
        stageName: 'Đặt cọc P1 (30%)',
        status: isAllNone
          ? 'SKIPPED'
          : order.status === 'AWAITING_P1'
            ? 'ACTIVE'
            : 'COMPLETED',
        isCurrent: order.status === 'AWAITING_P1',
      },
      {
        stageCode: 'PERSONALIZATION_SOURCE',
        stageName: 'Thu thập dữ liệu cá nhân hóa',
        status: isAllNone
          ? 'SKIPPED'
          : order.status === 'COLLECTING_SOURCE'
            ? 'ACTIVE'
            : 'PENDING',
        isCurrent: order.status === 'COLLECTING_SOURCE',
      },
      {
        stageCode: 'FINAL_QUOTE_APPROVAL',
        stageName: 'Thẩm định báo giá & Chốt thiết kế',
        status:
          order.status === 'PENDING_FINAL_QUOTE'
            ? 'ACTIVE'
            : order.status === 'FINAL_QUOTE_ACCEPTED'
              ? 'COMPLETED'
              : 'PENDING',
        isCurrent: order.status === 'PENDING_FINAL_QUOTE',
      },
      {
        stageCode: 'PRODUCTION',
        stageName: 'Chế tác & Kiểm định chất lượng',
        status: order.status === 'IN_PRODUCTION' ? 'ACTIVE' : 'PENDING',
        isCurrent: order.status === 'IN_PRODUCTION',
      },
      {
        stageCode: 'FULFILLMENT',
        stageName: 'Bàn giao / Giao hàng',
        status: order.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
        isCurrent: order.status === 'DELIVERING',
      },
    ];

    return {
      orderId: order.id,
      orderNo: order.order_no,
      currentStatus: order.status,
      events,
      stageGates,
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-007] Get Ring Item Details
  // ---------------------------------------------------------------------------
  async getRingItemDetails(
    request: GetRingItemDetailsRequest,
  ): Promise<GetRingItemDetailsResponse> {
    const actor = this.validateActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    const item = await this.repository.findRingItemWithDetails(
      request.orderId,
      request.ringItemId,
      actorId,
      actor.userId ? undefined : actor.guestSessionId,
    );

    if (!item) {
      throw new NotFoundException(
        'Ring item not found in this order or access denied',
      );
    }

    const ver =
      item.ring_item_versions_ring_items_current_version_idToring_item_versions;

    return {
      id: item.id,
      orderId: item.order_id,
      itemNo: item.item_no,
      sourceRingDesignDraftId: item.source_ring_design_draft_id,
      currentVersionId: item.current_version_id || '',
      versionNo: ver?.version_no ?? 1,
      templateVariantId: ver?.template_variants.id || '',
      templateCode: ver?.template_variants.ring_templates.code || '',
      templateName: ver?.template_variants.ring_templates.name || '',
      materialName: ver?.template_variants.materials.name || '',
      targetSize: Number(ver?.target_size ?? 0),
      personalizationPackage: ver?.personalization_package || 'NONE',
      memoryEnabled: ver?.memory_enabled ?? false,
      gemstones: (ver?.ring_item_version_gemstones || []).map((gem) => ({
        slotNumber: gem.gemstone_slots.slot_index,
        gemstoneSlotId: gem.gemstone_slot_id,
        gemstoneOptionId: gem.gemstone_option_id,
        gemstoneType: gem.gemstone_options.stone_type,
        gemstoneName: gem.gemstone_options.name,
        shape: gem.gemstone_options.shape,
        caratWeight: Number(gem.gemstone_options.length_mm),
        color: gem.gemstone_options.color_grade || '',
        clarity: gem.gemstone_options.clarity_grade || '',
      })),
      createdAt: item.created_at.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-006] List Admin Orders
  // ---------------------------------------------------------------------------
  async listAdminOrders(
    request: ListAdminOrdersRequest,
  ): Promise<ListAdminOrdersResponse> {
    const { items, total, page, limit } = await this.repository.listAdminOrders(
      {
        page: request.page,
        limit: request.limit,
        status: request.status,
        search: request.search,
        dateFrom: request.dateFrom,
        dateTo: request.dateTo,
      },
    );

    const mappedItems: AdminOrderSummaryItem[] = items.map((o) => ({
      id: o.id,
      orderNo: o.order_no,
      status: o.status,
      sourcePlanMode: o.source_plan_mode,
      ownerCustomerIdentityId: o.owner_customer_identity_id,
      recipientName: o.recipient_name ?? undefined,
      recipientPhone: o.recipient_phone ?? undefined,
      recipientEmail: o.recipient_email ?? undefined,
      itemsCount: o._count.ring_items,
      totalAmount: Number(
        o.quotes_orders_current_quote_idToquotes?.total_amount ?? 0,
      ),
      currency:
        o.quotes_orders_current_quote_idToquotes?.currency?.trim() || 'VND',
      createdAt: o.created_at.toISOString(),
      updatedAt: o.updated_at.toISOString(),
    }));

    return {
      items: mappedItems,
      total,
      page,
      limit,
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-ADMIN-01] Get Admin Order Details
  // ---------------------------------------------------------------------------
  async getAdminOrderDetails(
    request: GetAdminOrderDetailsRequest,
  ): Promise<GetAdminOrderDetailsResponse> {
    const order = await this.repository.findAdminOrderById(request.orderId);

    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    const currentQuote = order.quotes_orders_current_quote_idToquotes;

    return {
      id: order.id,
      orderNo: order.order_no,
      status: order.status,
      sourcePlanMode: order.source_plan_mode,
      fulfillmentMode: order.fulfillment_mode ?? undefined,
      customer: {
        customerIdentityId: order.owner_customer_identity_id,
        guestEmail: order.guest_email ?? undefined,
        guestPhone: order.guest_phone ?? undefined,
        guestEmailVerifiedAt: order.guest_email_verified_at
          ? order.guest_email_verified_at.toISOString()
          : undefined,
      },
      recipientName: order.recipient_name ?? undefined,
      recipientPhone: order.recipient_phone ?? undefined,
      recipientEmail: order.recipient_email ?? undefined,
      deliveryAddressJson: order.delivery_address_json
        ? JSON.stringify(order.delivery_address_json)
        : undefined,
      preP1EvidenceJson: order.pre_p1_evidence_json
        ? JSON.stringify(order.pre_p1_evidence_json)
        : undefined,
      currentQuote: currentQuote
        ? {
            quoteId: currentQuote.id,
            quoteNo: currentQuote.quote_no,
            quoteType: currentQuote.quote_type,
            subtotalAmount: Number(currentQuote.subtotal_amount),
            deliveryAmount: Number(currentQuote.delivery_amount),
            adjustmentAmount: Number(currentQuote.adjustment_amount),
            totalAmount: Number(currentQuote.total_amount),
            currency: currentQuote.currency.trim(),
            status: currentQuote.status,
          }
        : undefined,
      items: order.ring_items.map((item) => {
        const ver =
          item.ring_item_versions_ring_items_current_version_idToring_item_versions;
        return {
          id: item.id,
          itemNo: item.item_no,
          sourceRingDesignDraftId: item.source_ring_design_draft_id,
          currentVersionId: item.current_version_id || '',
          versionNo: ver?.version_no ?? 1,
          templateVariantId: ver?.template_variants.id || '',
          templateCode: ver?.template_variants.ring_templates.code || '',
          templateName: ver?.template_variants.ring_templates.name || '',
          materialName: ver?.template_variants.materials.name || '',
          targetSize: Number(ver?.target_size ?? 0),
          personalizationPackage: ver?.personalization_package || 'NONE',
          memoryEnabled: ver?.memory_enabled ?? false,
        };
      }),
      cancelledAt: order.cancelled_at
        ? order.cancelled_at.toISOString()
        : undefined,
      cancellationReason: order.cancellation_reason ?? undefined,
      createdAt: order.created_at.toISOString(),
      updatedAt: order.updated_at.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-ADMIN-02] Update Order Status
  // ---------------------------------------------------------------------------
  async updateOrderStatus(
    request: UpdateOrderStatusRequest,
  ): Promise<UpdateOrderStatusResponse> {
    const order = await this.repository.findAdminOrderById(request.orderId);

    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    const previousStatus = order.status;
    const targetStatus = request.targetStatus.trim().toUpperCase();

    // Valid state transitions map
    const VALID_TRANSITIONS: Record<string, string[]> = {
      AWAITING_P1: ['PENDING_FINAL_QUOTE', 'CANCELLED'],
      PENDING_FINAL_QUOTE: ['AWAITING_CUSTOMER_CONFIRMATION', 'CANCELLED'],
      AWAITING_CUSTOMER_CONFIRMATION: ['AWAITING_P2', 'CANCELLED'],
      AWAITING_P2: ['MANUFACTURING', 'CANCELLED'],
      MANUFACTURING: [
        'COMPLETED_MANUFACTURING',
        'READY_FOR_DELIVERY',
        'CANCELLED',
      ],
      COMPLETED_MANUFACTURING: ['READY_FOR_DELIVERY', 'CANCELLED'],
      READY_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
      DELIVERED: [],
      CANCELLED: [],
    };

    const allowed = VALID_TRANSITIONS[previousStatus] ?? [];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition order status from '${previousStatus}' to '${targetStatus}'. Allowed: [${allowed.join(', ')}]`,
      );
    }

    const updated = await this.repository.updateOrderStatus({
      orderId: request.orderId,
      targetStatus,
      reason: request.reason,
    });

    return {
      orderId: updated.id,
      orderNo: updated.order_no,
      previousStatus,
      currentStatus: updated.status,
      updatedAt: updated.updated_at.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-008] List Ring Item Versions
  // ---------------------------------------------------------------------------
  async listRingItemVersions(
    request: ListRingItemVersionsRequest,
  ): Promise<ListRingItemVersionsResponse> {
    const actor = this.validateActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    const versions = await this.repository.listRingItemVersions(
      request.orderId,
      request.ringItemId,
      actorId,
      actor.userId ? undefined : actor.guestSessionId,
    );

    if (!versions) {
      throw new NotFoundException(
        'Order or ring item not found or access denied',
      );
    }

    const mappedVersions: RingItemVersionSummary[] = versions.map((ver) => ({
      id: ver.id,
      versionNo: ver.version_no,
      status: ver.status,
      targetSize: Number(ver.target_size),
      personalizationPackage: ver.personalization_package,
      memoryEnabled: ver.memory_enabled,
      changeReason: ver.change_reason ?? undefined,
      templateVariantId: ver.template_variants.id,
      templateCode: ver.template_variants.ring_templates.code,
      templateName: ver.template_variants.ring_templates.name,
      materialName: ver.template_variants.materials.name,
      gemstones: ver.ring_item_version_gemstones.map((gem) => ({
        slotNumber: gem.gemstone_slots.slot_index,
        gemstoneSlotId: gem.gemstone_slot_id,
        gemstoneOptionId: gem.gemstone_option_id,
        gemstoneType: gem.gemstone_options.stone_type,
        gemstoneName: gem.gemstone_options.name,
        shape: gem.gemstone_options.shape,
        caratWeight: Number(gem.gemstone_options.length_mm),
        color: gem.gemstone_options.color_grade || '',
        clarity: gem.gemstone_options.clarity_grade || '',
      })),
      createdAt: ver.created_at.toISOString(),
    }));

    return {
      ringItemId: request.ringItemId,
      orderId: request.orderId,
      versions: mappedVersions,
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-009] Update Current Ring Item Version
  // ---------------------------------------------------------------------------
  async updateCurrentRingItemVersion(
    request: UpdateCurrentRingItemVersionRequest,
  ): Promise<UpdateCurrentRingItemVersionResponse> {
    const actor = this.validateActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    const currentVersion = await this.repository.findCurrentRingItemVersion(
      request.orderId,
      request.ringItemId,
      actorId,
      actor.userId ? undefined : actor.guestSessionId,
    );

    if (!currentVersion) {
      throw new NotFoundException(
        'Ring item current version not found or access denied',
      );
    }

    if (
      currentVersion.status !== 'DRAFT' &&
      currentVersion.status !== 'SUBMITTED'
    ) {
      throw new BadRequestException(
        `Cannot modify ring item version in status '${currentVersion.status}'. Only DRAFT or SUBMITTED versions can be updated.`,
      );
    }

    const updated = await this.repository.updateCurrentRingItemVersion(
      currentVersion.id,
      {
        targetSize: request.targetSize,
        changeReason: request.changeReason,
        memoryEnabled: request.memoryEnabled,
      },
    );

    return {
      ringItemId: request.ringItemId,
      versionId: updated.id,
      versionNo: updated.version_no,
      status: updated.status,
      targetSize: Number(updated.target_size),
      changeReason: updated.change_reason ?? undefined,
      updatedAt: updated.created_at.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-010] List Order Quotes
  // ---------------------------------------------------------------------------
  async listOrderQuotes(
    request: ListOrderQuotesRequest,
  ): Promise<ListOrderQuotesResponse> {
    const actor = this.validateActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    const quotes = await this.repository.listOrderQuotes(
      request.orderId,
      actorId,
      actor.userId ? undefined : actor.guestSessionId,
    );

    if (!quotes) {
      throw new NotFoundException('Order not found or access denied');
    }

    const mappedQuotes: FullQuoteDetail[] = quotes.map((q) => ({
      id: q.id,
      quoteNo: q.quote_no,
      quoteType: q.quote_type,
      versionNo: q.version_no,
      status: q.status,
      subtotalAmount: Number(q.subtotal_amount),
      deliveryAmount: Number(q.delivery_amount),
      adjustmentAmount: Number(q.adjustment_amount),
      totalAmount: Number(q.total_amount),
      currency: q.currency.trim(),
      items: q.quote_items.map((qi) => ({
        id: qi.id,
        componentType: qi.component_type,
        description: qi.description ?? undefined,
        quantity: Number(qi.quantity),
        unitAmount: Number(qi.unit_amount),
        lineAmount: Number(qi.line_amount),
        priceSourceType: qi.price_source_type,
      })),
      createdAt: q.created_at.toISOString(),
    }));

    return {
      orderId: request.orderId,
      quotes: mappedQuotes,
    };
  }

  // ---------------------------------------------------------------------------
  // [Cross-Service] Get Order Personalization Context (for Operations)
  // ---------------------------------------------------------------------------
  async getOrderPersonalizationContext(
    request: GetOrderPersonalizationContextRequest,
  ): Promise<GetOrderPersonalizationContextResponse> {
    const orderId = request?.orderId?.trim();
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!orderId || !uuidRegex.test(orderId)) {
      throw new BadRequestException(
        `Invalid or missing orderId: '${orderId}' is not a valid UUID`,
      );
    }

    const order =
      await this.repository.findOrderPersonalizationContext(orderId);

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const p1Paid = order.payment_transactions.length > 0;

    const ringItems: PersonalizationRingItem[] = order.ring_items.map(
      (item) => {
        const ver =
          item.ring_item_versions_ring_items_current_version_idToring_item_versions;
        return {
          ringItemId: item.id,
          itemNo: item.item_no,
          currentVersionId: item.current_version_id || ver?.id || '',
          personalizationPackage: ver?.personalization_package || 'NONE',
          versionStatus: ver?.status || 'DRAFT',
        };
      },
    );

    return {
      orderId: order.id,
      ownerCustomerIdentityId: order.owner_customer_identity_id,
      status: order.status,
      p1Paid,
      sourcePlanMode: order.source_plan_mode,
      ringItems,
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-005] Customer Cancel Order
  // ---------------------------------------------------------------------------
  async cancelOrder(request: CancelOrderRequest): Promise<CancelOrderResponse> {
    const actor = this.validateActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    const order = await this.repository.findOrderById(request.orderId, actorId);
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    const cancellableStatuses = [
      'AWAITING_P1',
      'PENDING_FINAL_QUOTE',
      'AWAITING_CUSTOMER_CONFIRMATION',
    ];
    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Order in status '${order.status}' cannot be cancelled. Only pre-production orders can be cancelled.`,
      );
    }

    const updated = await this.repository.cancelOrder(
      request.orderId,
      request.reason,
    );

    return {
      orderId: updated.id,
      status: updated.status,
      cancelledAt: updated.cancelled_at
        ? updated.cancelled_at.toISOString()
        : new Date().toISOString(),
      cancellationReason: updated.cancellation_reason ?? undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-011] Create Final Quote
  // ---------------------------------------------------------------------------
  async createFinalQuote(
    request: CreateFinalQuoteRequest,
  ): Promise<FullQuoteDetail> {
    const order = await this.repository.findAdminOrderById(request.orderId);
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    if (!request.items || request.items.length === 0) {
      throw new BadRequestException(
        'Final quote must contain at least one line item',
      );
    }

    const quote = await this.repository.createFinalQuote(request);
    if (!quote) {
      throw new NotFoundException(`Failed to create quote: order not found`);
    }

    return this.mapQuoteToDetail(quote);
  }

  // ---------------------------------------------------------------------------
  // [ORDER-012] Update Final Quote
  // ---------------------------------------------------------------------------
  async updateFinalQuote(
    request: UpdateFinalQuoteRequest,
  ): Promise<FullQuoteDetail> {
    const existing = await this.repository.findQuoteById(
      request.orderId,
      request.quoteId,
    );
    if (!existing) {
      throw new NotFoundException(
        `Quote ${request.quoteId} not found for order ${request.orderId}`,
      );
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        `Quote in status '${existing.status}' cannot be modified. Only DRAFT quotes can be edited.`,
      );
    }

    if (existing.quote_type !== 'FINAL') {
      throw new BadRequestException(
        `Quote type '${existing.quote_type}' cannot be modified through this endpoint. Only FINAL quotes are editable.`,
      );
    }

    const updated = await this.repository.updateFinalQuote(request);
    return this.mapQuoteToDetail(updated);
  }

  // ---------------------------------------------------------------------------
  // [ORDER-013 Part A] Publish Final Quote
  // ---------------------------------------------------------------------------
  async publishFinalQuote(
    request: PublishFinalQuoteRequest,
  ): Promise<FullQuoteDetail> {
    const existing = await this.repository.findQuoteById(
      request.orderId,
      request.quoteId,
    );
    if (!existing) {
      throw new NotFoundException(
        `Quote ${request.quoteId} not found for order ${request.orderId}`,
      );
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot publish quote in status '${existing.status}'. Expected 'DRAFT'.`,
      );
    }

    const published = await this.repository.publishFinalQuote(
      request.orderId,
      request.quoteId,
    );
    return this.mapQuoteToDetail(published);
  }

  // ---------------------------------------------------------------------------
  // [ORDER-013 Part B] Get Quote By ID
  // ---------------------------------------------------------------------------
  async getOrderQuoteById(
    request: GetOrderQuoteByIdRequest,
  ): Promise<FullQuoteDetail> {
    if (request.actor) {
      const actor = this.validateActor(request.actor);
      const actorId = actor.userId ?? actor.guestSessionId!;
      const order = await this.repository.findOrderById(
        request.orderId,
        actorId,
      );
      if (!order) {
        throw new NotFoundException(`Order ${request.orderId} not found`);
      }
    }

    const quote = await this.repository.findQuoteById(
      request.orderId,
      request.quoteId,
    );
    if (!quote) {
      throw new NotFoundException(
        `Quote ${request.quoteId} not found for order ${request.orderId}`,
      );
    }

    return this.mapQuoteToDetail(quote);
  }

  // ---------------------------------------------------------------------------
  // [ORDER-014] Customer Confirm Final Quote
  // ---------------------------------------------------------------------------
  async confirmFinalQuote(
    request: ConfirmFinalQuoteRequest,
  ): Promise<ConfirmFinalQuoteResponse> {
    const actor = this.validateActor(request.actor);
    if (!actor.userId) {
      throw new ForbiddenException(
        'Only registered customers can confirm a final quote',
      );
    }

    const order = await this.repository.findOrderById(
      request.orderId,
      actor.userId,
    );
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    const targetQuoteId = request.quoteId || order.current_quote_id;
    if (!targetQuoteId) {
      throw new BadRequestException(
        'Order does not have an active quote to confirm',
      );
    }

    const quote = await this.repository.findQuoteById(
      request.orderId,
      targetQuoteId,
    );
    if (!quote) {
      throw new NotFoundException(`Quote ${targetQuoteId} not found`);
    }

    if (quote.status !== 'ISSUED') {
      throw new BadRequestException(
        `Quote in status '${quote.status}' cannot be confirmed. Only ISSUED quotes are eligible.`,
      );
    }

    if (quote.valid_until && quote.valid_until < new Date()) {
      throw new BadRequestException(
        'This quote has expired. Please contact our support team for an updated quote.',
      );
    }

    const nextOrderStatus =
      order.source_plan_mode === 'NONE'
        ? 'PRODUCTION_AUTHORIZED'
        : 'AWAITING_P2';

    const { confirmation, ringItems } = await this.repository.confirmFinalQuote(
      request.orderId,
      quote.id,
      actor.userId,
      nextOrderStatus,
    );

    return {
      confirmationId: confirmation.id,
      orderId: confirmation.order_id,
      quoteId: confirmation.quote_id,
      status: confirmation.status,
      confirmedAt: confirmation.confirmed_at.toISOString(),
      nextOrderStatus,
      items: confirmation.final_confirmation_items.map((i) => {
        const item = ringItems.find((r) => r.id === i.ring_item_id);
        const ver =
          item?.ring_item_versions_ring_items_current_version_idToring_item_versions;
        return {
          id: i.id,
          ringItemId: i.ring_item_id,
          ringItemVersionId: i.ring_item_version_id,
          versionNo: ver?.version_no ?? 1,
        };
      }),
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-015 Part B] Customer Reject Final Quote
  // ---------------------------------------------------------------------------
  async rejectFinalQuote(
    request: RejectFinalQuoteRequest,
  ): Promise<RejectFinalQuoteResponse> {
    const actor = this.validateActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    const order = await this.repository.findOrderById(request.orderId, actorId);
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    const targetQuoteId = request.quoteId || order.current_quote_id;
    if (!targetQuoteId) {
      throw new BadRequestException(
        'Order does not have an active quote to reject',
      );
    }

    const quote = await this.repository.findQuoteById(
      request.orderId,
      targetQuoteId,
    );
    if (!quote) {
      throw new NotFoundException(`Quote ${targetQuoteId} not found`);
    }

    if (quote.status !== 'ISSUED') {
      throw new BadRequestException(
        `Quote in status '${quote.status}' cannot be rejected. Only ISSUED quotes can be rejected.`,
      );
    }

    if (!request.reason || request.reason.trim().length === 0) {
      throw new BadRequestException('A reason for rejection is required');
    }

    await this.repository.rejectFinalQuote(
      request.orderId,
      quote.id,
      request.reason,
    );

    return {
      orderId: request.orderId,
      quoteId: quote.id,
      status: 'REJECTED',
      reason: request.reason,
      updatedOrderStatus: 'PENDING_FINAL_QUOTE',
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-015 Part A] Get Order Final Confirmations History
  // ---------------------------------------------------------------------------
  async getOrderFinalConfirmations(
    request: GetOrderFinalConfirmationsRequest,
  ): Promise<GetOrderFinalConfirmationsResponse> {
    const actor = this.validateActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    const order = await this.repository.findOrderById(request.orderId, actorId);
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    const confirmations = await this.repository.findFinalConfirmations(
      request.orderId,
    );

    return {
      orderId: request.orderId,
      confirmations: confirmations.map((c) => ({
        id: c.id,
        orderId: c.order_id,
        quoteId: c.quote_id,
        quoteNo: c.quotes?.quote_no ?? '',
        quoteTotalAmount: c.quotes ? Number(c.quotes.total_amount) : 0,
        confirmedByCustomerIdentityId: c.confirmed_by_customer_identity_id,
        status: c.status,
        confirmedAt: c.confirmed_at.toISOString(),
        invalidatedAt: c.invalidated_at
          ? c.invalidated_at.toISOString()
          : undefined,
        invalidationReason: c.invalidation_reason ?? undefined,
        items: c.final_confirmation_items.map((i) => ({
          id: i.id,
          ringItemId: i.ring_item_id,
          ringItemVersionId: i.ring_item_version_id,
          versionNo: i.ring_item_versions?.version_no ?? 1,
        })),
      })),
    };
  }

  private mapQuoteToDetail(quote: {
    id: string;
    quote_no: string;
    quote_type: string;
    version_no: number;
    status: string;
    subtotal_amount: Prisma.Decimal;
    delivery_amount: Prisma.Decimal;
    adjustment_amount: Prisma.Decimal;
    total_amount: Prisma.Decimal;
    currency: string;
    created_at: Date;
    valid_until: Date | null;
    issued_at: Date | null;
    accepted_at: Date | null;
    quote_items: Array<{
      id: string;
      ring_item_id: string | null;
      component_type: string;
      description: string | null;
      quantity: Prisma.Decimal;
      unit_amount: Prisma.Decimal;
      line_amount: Prisma.Decimal;
      price_source_type: string;
    }>;
  }): FullQuoteDetail {
    return {
      id: quote.id,
      quoteNo: quote.quote_no,
      quoteType: quote.quote_type,
      versionNo: quote.version_no,
      status: quote.status,
      subtotalAmount: Number(quote.subtotal_amount),
      deliveryAmount: Number(quote.delivery_amount),
      adjustmentAmount: Number(quote.adjustment_amount),
      totalAmount: Number(quote.total_amount),
      currency: quote.currency,
      createdAt: quote.created_at.toISOString(),
      validUntil: quote.valid_until
        ? quote.valid_until.toISOString()
        : undefined,
      issuedAt: quote.issued_at ? quote.issued_at.toISOString() : undefined,
      acceptedAt: quote.accepted_at
        ? quote.accepted_at.toISOString()
        : undefined,
      items: quote.quote_items.map((i) => ({
        id: i.id,
        ringItemId: i.ring_item_id ?? undefined,
        componentType: i.component_type,
        description: i.description ?? undefined,
        quantity: Number(i.quantity),
        unitAmount: Number(i.unit_amount),
        lineAmount: Number(i.line_amount),
        priceSourceType: i.price_source_type,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-017] List Order Payments
  // ---------------------------------------------------------------------------
  async listOrderPayments(
    request: ListOrderPaymentsRequest,
  ): Promise<ListOrderPaymentsResponse> {
    const actor = this.validateActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    const order = await this.repository.findOrderById(request.orderId, actorId);
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    const payments = await this.repository.findOrderPayments(request.orderId);
    const totalPaidAmount = payments
      .filter(
        (p) => p.status === 'SUCCEEDED' && p.transaction_type === 'PAYMENT',
      )
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      orderId: request.orderId,
      totalPaidAmount,
      currency: payments[0]?.currency || 'VND',
      payments: payments.map((p) => ({
        id: p.id,
        orderId: p.order_id || request.orderId,
        paymentStage: p.payment_stage,
        transactionType: p.transaction_type,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        provider: p.provider ?? undefined,
        paymentMethod: p.payment_method ?? undefined,
        requestedAt: p.requested_at.toISOString(),
        completedAt: p.completed_at ? p.completed_at.toISOString() : undefined,
        receiptNo: p.receipt_no ?? undefined,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-018] Get Payment Transaction by ID
  // ---------------------------------------------------------------------------
  async getOrderPaymentById(
    request: GetOrderPaymentByIdRequest,
  ): Promise<PaymentTransactionDetail> {
    const actor = this.validateActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    const order = await this.repository.findOrderById(request.orderId, actorId);
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    const p = await this.repository.findOrderPaymentById(
      request.orderId,
      request.transactionId,
    );
    if (!p) {
      throw new NotFoundException(
        `Payment transaction ${request.transactionId} not found for order ${request.orderId}`,
      );
    }

    return {
      id: p.id,
      orderId: p.order_id || request.orderId,
      paymentStage: p.payment_stage,
      transactionType: p.transaction_type,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      provider: p.provider ?? undefined,
      paymentMethod: p.payment_method ?? undefined,
      providerOrderCode: p.provider_order_code
        ? p.provider_order_code.toString()
        : undefined,
      providerTransactionId: p.provider_transaction_id ?? undefined,
      providerReference: p.provider_reference ?? undefined,
      relatedTransactionId: p.related_transaction_id ?? undefined,
      requestedAt: p.requested_at.toISOString(),
      completedAt: p.completed_at ? p.completed_at.toISOString() : undefined,
      failedAt: p.failed_at ? p.failed_at.toISOString() : undefined,
      failureReason: p.failure_reason ?? undefined,
      receiptNo: p.receipt_no ?? undefined,
      receiptIssuedAt: p.receipt_issued_at
        ? p.receipt_issued_at.toISOString()
        : undefined,
      metadataJson: p.metadata_json
        ? JSON.stringify(p.metadata_json)
        : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-021] Get Payment Receipt
  // ---------------------------------------------------------------------------
  async getPaymentReceipt(
    request: GetPaymentReceiptRequest,
  ): Promise<PaymentReceiptDetail> {
    const actor = this.validateActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    const order = await this.repository.findOrderById(request.orderId, actorId);
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    const tx = await this.repository.findPaymentReceipt(
      request.orderId,
      request.transactionId,
    );
    if (!tx) {
      throw new NotFoundException(
        `Payment transaction ${request.transactionId} not found for order ${request.orderId}`,
      );
    }

    if (tx.status !== 'SUCCEEDED') {
      throw new BadRequestException(
        `Receipt is only available for SUCCEEDED transactions. Current status: '${tx.status}'.`,
      );
    }

    return {
      receiptNo:
        tx.receipt_no ||
        `REC-${tx.orders?.order_no || 'ORD'}-${tx.payment_stage}`,
      transactionId: tx.id,
      orderId: tx.order_id || request.orderId,
      orderNo: tx.orders?.order_no || '',
      paymentStage: tx.payment_stage,
      amount: Number(tx.amount),
      currency: tx.currency,
      paymentMethod: tx.payment_method,
      completedAt: tx.completed_at
        ? tx.completed_at.toISOString()
        : tx.requested_at.toISOString(),
      recipientName: tx.orders?.recipient_name || '',
      issuedAt: tx.receipt_issued_at
        ? tx.receipt_issued_at.toISOString()
        : new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-022] Get Order Invoice
  // ---------------------------------------------------------------------------
  async getOrderInvoice(
    request: GetOrderInvoiceRequest,
  ): Promise<OrderInvoiceDetail> {
    const actor = this.validateActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    const order = await this.repository.findOrderById(request.orderId, actorId);
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    const orderDetails = await this.repository.findOrderInvoice(
      request.orderId,
    );
    if (!orderDetails) {
      throw new NotFoundException(
        `Invoice details not found for order ${request.orderId}`,
      );
    }

    const quote = orderDetails.quotes_orders_current_quote_idToquotes;
    const totalAmount = quote ? Number(quote.total_amount) : 0;
    const totalPaidAmount = orderDetails.payment_transactions.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const remainingAmount = Math.max(0, totalAmount - totalPaidAmount);

    return {
      invoiceNo: orderDetails.invoice_no || `INV-${orderDetails.order_no}`,
      orderId: orderDetails.id,
      orderNo: orderDetails.order_no,
      status: orderDetails.status,
      issuedAt: orderDetails.invoice_issued_at
        ? orderDetails.invoice_issued_at.toISOString()
        : new Date().toISOString(),
      totalAmount,
      totalPaidAmount,
      remainingAmount,
      currency: quote?.currency || 'VND',
      recipientName: orderDetails.recipient_name || '',
      recipientPhone: orderDetails.recipient_phone ?? undefined,
      deliveryAddressJson: orderDetails.delivery_address_json
        ? JSON.stringify(orderDetails.delivery_address_json)
        : undefined,
      items: (quote?.quote_items || []).map((item) => ({
        componentType: item.component_type,
        description: item.description || '',
        quantity: Number(item.quantity),
        unitAmount: Number(item.unit_amount),
        lineAmount: Number(item.line_amount),
      })),
      paymentTransactions: orderDetails.payment_transactions.map((pt) => ({
        paymentStage: pt.payment_stage,
        amount: Number(pt.amount),
        completedAt: pt.completed_at
          ? pt.completed_at.toISOString()
          : pt.requested_at.toISOString(),
        receiptNo: pt.receipt_no ?? undefined,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-023] Create Refund Request (Staff / Admin)
  // ---------------------------------------------------------------------------
  async createRefundRequest(
    request: CreateRefundRequestMessage,
  ): Promise<CreateRefundResponse> {
    if (!request.refundAmount || request.refundAmount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }

    if (!request.reason || request.reason.trim().length === 0) {
      throw new BadRequestException('A reason for the refund is required');
    }

    const refund = await this.repository.createRefundRequest(request);
    if (!refund) {
      throw new NotFoundException(
        `Original payment transaction ${request.transactionId} not found`,
      );
    }

    return {
      refundTransactionId: refund.id,
      originalTransactionId:
        refund.related_transaction_id || request.transactionId,
      orderId: refund.order_id || '',
      refundAmount: Number(refund.amount),
      currency: refund.currency,
      status: refund.status,
      requestedAt: refund.requested_at.toISOString(),
      reason: request.reason,
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-024] List Claim Quotes
  // ---------------------------------------------------------------------------
  async listClaimQuotes(
    request: ListClaimQuotesRequest,
  ): Promise<ListClaimQuotesResponse> {
    if (!request.claimId) {
      throw new BadRequestException('Claim ID is required');
    }
    this.validateActor(request.actor);

    const quotes = await this.repository.findClaimQuotes(request.claimId);
    return {
      quotes: quotes.map((q) => this.mapQuoteToDetail(q)),
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-025] Accept Service Quote
  // ---------------------------------------------------------------------------
  async acceptServiceQuote(
    request: AcceptServiceQuoteRequest,
  ): Promise<AcceptServiceQuoteResponse> {
    if (!request.claimId || !request.quoteId) {
      throw new BadRequestException('Claim ID and Quote ID are required');
    }

    const actor = this.validateActor(request.actor);
    const customerIdentityId = actor.userId ?? actor.guestSessionId;
    if (!customerIdentityId) {
      throw new ForbiddenException(
        'A valid customer identity is required to accept a service quote',
      );
    }

    const quote = await this.repository.findClaimQuoteById(
      request.claimId,
      request.quoteId,
    );
    if (!quote) {
      throw new NotFoundException(
        `Service quote ${request.quoteId} for claim ${request.claimId} not found`,
      );
    }

    if (quote.quote_type !== 'SERVICE') {
      throw new BadRequestException(
        `Quote is not a SERVICE quote (type: '${quote.quote_type}')`,
      );
    }

    if (quote.status === 'ACCEPTED') {
      return {
        success: true,
        quoteId: quote.id,
        status: quote.status,
        acceptedAt: quote.accepted_at
          ? quote.accepted_at.toISOString()
          : new Date().toISOString(),
      };
    }

    if (quote.status !== 'ISSUED') {
      throw new BadRequestException(
        `Only ISSUED service quotes can be accepted. Current status: '${quote.status}'`,
      );
    }

    if (quote.valid_until && new Date(quote.valid_until) < new Date()) {
      throw new BadRequestException(
        `Service quote expired on ${quote.valid_until.toISOString()}`,
      );
    }

    const updated = await this.repository.acceptClaimQuote({
      quoteId: quote.id,
      customerIdentityId,
    });

    return {
      success: true,
      quoteId: updated.id,
      status: updated.status,
      acceptedAt: updated.accepted_at
        ? updated.accepted_at.toISOString()
        : new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-016] Create Order Payment Link (PayOS)
  // ---------------------------------------------------------------------------
  async createOrderPaymentLink(
    request: CreateOrderPaymentLinkRequest,
  ): Promise<PaymentLinkResponse> {
    const actor = this.validateActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    const order = await this.repository.findOrderById(request.orderId, actorId);
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    // Determine payment stage
    let stage = request.paymentStage;
    if (!stage) {
      if (order.status === 'AWAITING_P1') {
        stage = 'DEPOSIT_P1';
      } else if (order.status === 'AWAITING_P2') {
        stage = 'MILESTONE_P2';
      } else if (
        order.status === 'AWAITING_P3' ||
        order.status === 'READY_FOR_DELIVERY'
      ) {
        stage = 'FINAL_P3';
      } else if (order.status === 'PENDING_FINAL_QUOTE') {
        stage = 'FULL_PAYMENT';
      } else {
        throw new BadRequestException(
          `Cannot create payment link for order in status '${order.status}'`,
        );
      }
    }

    // Determine payment amount
    let amount = 0;
    const currentQuote = order.quotes_orders_current_quote_idToquotes;
    const totalAmount = currentQuote ? Number(currentQuote.total_amount) : 0;
    const currency = currentQuote?.currency?.trim() || 'VND';

    if (stage === 'DEPOSIT_P1') {
      amount = Math.round(totalAmount * 0.3);
    } else if (stage === 'MILESTONE_P2') {
      amount = Math.round(totalAmount * 0.4);
    } else if (stage === 'FINAL_P3') {
      const existingPayments = await this.repository.findOrderPayments(
        order.id,
      );
      const paid = existingPayments
        .filter(
          (p) => p.status === 'SUCCEEDED' && p.transaction_type === 'PAYMENT',
        )
        .reduce((sum, p) => sum + Number(p.amount), 0);
      amount = Math.max(0, totalAmount - paid);
    } else {
      amount = totalAmount;
    }

    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    const orderCode = this.payosProvider.generateOrderCode();
    const returnUrl =
      request.returnUrl || 'https://memora.vn/orders/' + order.id;
    const cancelUrl =
      request.cancelUrl || 'https://memora.vn/orders/' + order.id;

    const paymentLink = await this.payosProvider.createPaymentLink({
      orderCode,
      amount,
      description: `MEMORA ${order.order_no} ${stage}`,
      returnUrl,
      cancelUrl,
    });

    const tx = await this.repository.createPaymentTransaction({
      orderId: order.id,
      paymentStage: stage,
      providerOrderCode: BigInt(orderCode),
      amount,
      currency,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      metadata: {
        paymentLinkId: paymentLink.paymentLinkId,
        checkoutUrl: paymentLink.checkoutUrl,
        qrCode: paymentLink.qrCode,
      },
    });

    return {
      transactionId: tx.id,
      orderCode,
      checkoutUrl: paymentLink.checkoutUrl,
      qrCode: paymentLink.qrCode,
      amount,
      currency: tx.currency,
      paymentStage: stage,
      status: tx.status,
      expiresAt: tx.expires_at ? tx.expires_at.toISOString() : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-019] Process PayOS Webhook
  // ---------------------------------------------------------------------------
  async processPayosWebhook(
    request: PayosWebhookRequest,
  ): Promise<PayosWebhookResponse> {
    let payloadData: any;
    try {
      payloadData =
        typeof request.dataJson === 'string'
          ? JSON.parse(request.dataJson)
          : request.dataJson;
    } catch {
      throw new BadRequestException('Invalid dataJson in PayOS webhook');
    }

    const isValid = this.payosProvider.verifyWebhookSignature({
      code: request.code,
      desc: request.desc,
      success: request.success,
      data: payloadData,
      signature: request.signature,
    });

    if (!isValid) {
      throw new ForbiddenException('Invalid PayOS webhook signature');
    }

    const orderCode = BigInt(payloadData.orderCode);
    const tx = await this.repository.findTransactionByOrderCode(orderCode);
    if (!tx) {
      return {
        success: false,
        message: `Transaction with provider_order_code ${orderCode} not found`,
      };
    }

    if (tx.status === 'SUCCEEDED') {
      return {
        success: true,
        message: 'Transaction already processed',
        transactionId: tx.id,
        status: tx.status,
      };
    }

    // Determine next order status based on payment stage
    let nextOrderStatus: string | undefined;
    if (tx.orders) {
      if (tx.payment_stage === 'DEPOSIT_P1') {
        nextOrderStatus = 'PENDING_FINAL_QUOTE';
      } else if (tx.payment_stage === 'MILESTONE_P2') {
        nextOrderStatus = 'MANUFACTURING';
      } else if (
        tx.payment_stage === 'FINAL_P3' ||
        tx.payment_stage === 'FULL_PAYMENT'
      ) {
        nextOrderStatus =
          tx.orders.status === 'READY_FOR_DELIVERY' ? 'DELIVERING' : undefined;
      }
    }

    const updated = await this.repository.markPaymentTransactionSucceeded({
      transactionId: tx.id,
      providerTransactionId: payloadData.reference || payloadData.paymentLinkId,
      providerReference: payloadData.reference,
      completedAt: payloadData.transactionDateTime
        ? new Date(payloadData.transactionDateTime)
        : new Date(),
      nextOrderStatus,
    });

    return {
      success: true,
      message: 'Payment processed successfully',
      transactionId: updated.id,
      status: updated.status,
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-020] Reconcile Payment Transaction
  // ---------------------------------------------------------------------------
  async reconcilePaymentTransaction(
    request: ReconcilePaymentTransactionRequest,
  ): Promise<PaymentTransactionDetail> {
    const tx = await this.repository.findPaymentTransactionById(
      request.transactionId,
    );
    if (!tx) {
      throw new NotFoundException(
        `Transaction ${request.transactionId} not found`,
      );
    }

    if (tx.status === 'SUCCEEDED') {
      return this.mapPaymentTransactionDetail(tx);
    }

    if (!tx.provider_order_code) {
      throw new BadRequestException(
        'Transaction has no provider_order_code to reconcile',
      );
    }

    const info = await this.payosProvider.getPaymentInformation(
      Number(tx.provider_order_code),
    );

    if (info && info.status === 'PAID') {
      let nextOrderStatus: string | undefined;
      if (tx.orders) {
        if (tx.payment_stage === 'DEPOSIT_P1') {
          nextOrderStatus = 'PENDING_FINAL_QUOTE';
        } else if (tx.payment_stage === 'MILESTONE_P2') {
          nextOrderStatus = 'MANUFACTURING';
        }
      }

      const updated = await this.repository.markPaymentTransactionSucceeded({
        transactionId: tx.id,
        completedAt: new Date(),
        nextOrderStatus,
      });

      return this.mapPaymentTransactionDetail(updated);
    }

    return this.mapPaymentTransactionDetail(tx);
  }

  private mapPaymentTransactionDetail(p: any): PaymentTransactionDetail {
    return {
      id: p.id,
      orderId: p.order_id || '',
      paymentStage: p.payment_stage,
      transactionType: p.transaction_type,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      provider: p.provider ?? undefined,
      paymentMethod: p.payment_method ?? undefined,
      providerOrderCode: p.provider_order_code
        ? p.provider_order_code.toString()
        : undefined,
      providerTransactionId: p.provider_transaction_id ?? undefined,
      providerReference: p.provider_reference ?? undefined,
      relatedTransactionId: p.related_transaction_id ?? undefined,
      requestedAt: p.requested_at.toISOString(),
      completedAt: p.completed_at ? p.completed_at.toISOString() : undefined,
      failedAt: p.failed_at ? p.failed_at.toISOString() : undefined,
      failureReason: p.failure_reason ?? undefined,
      receiptNo: p.receipt_no ?? undefined,
      receiptIssuedAt: p.receipt_issued_at
        ? p.receipt_issued_at.toISOString()
        : undefined,
      metadataJson: p.metadata_json
        ? JSON.stringify(p.metadata_json)
        : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // [ORDER-026] Create Claim Payment Link
  // ---------------------------------------------------------------------------
  async createClaimPaymentLink(
    request: CreateClaimPaymentLinkRequest,
  ): Promise<PaymentLinkResponse> {
    if (!request.claimId) {
      throw new BadRequestException('Claim ID is required');
    }
    this.validateActor(request.actor);

    const quotes = await this.repository.findClaimQuotes(request.claimId);
    const acceptedQuote = quotes.find((q) => q.status === 'ACCEPTED');
    if (!acceptedQuote) {
      throw new BadRequestException(
        `No ACCEPTED service quote found for claim ${request.claimId}`,
      );
    }

    const amount = Number(acceptedQuote.total_amount);
    if (amount <= 0) {
      throw new BadRequestException(
        'Accepted quote amount must be greater than 0',
      );
    }

    const orderCode = this.payosProvider.generateOrderCode();
    const returnUrl =
      request.returnUrl || 'https://memora.vn/claims/' + request.claimId;
    const cancelUrl =
      request.cancelUrl || 'https://memora.vn/claims/' + request.claimId;

    const paymentLink = await this.payosProvider.createPaymentLink({
      orderCode,
      amount,
      description: `MEMORA CLAIM ${acceptedQuote.quote_no}`,
      returnUrl,
      cancelUrl,
    });

    const tx = await this.repository.createPaymentTransaction({
      claimId: request.claimId,
      quoteId: acceptedQuote.id,
      paymentStage: 'SERVICE_FEE',
      providerOrderCode: BigInt(orderCode),
      amount,
      currency: acceptedQuote.currency || 'VND',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      metadata: {
        paymentLinkId: paymentLink.paymentLinkId,
        checkoutUrl: paymentLink.checkoutUrl,
        qrCode: paymentLink.qrCode,
      },
    });

    return {
      transactionId: tx.id,
      orderCode,
      checkoutUrl: paymentLink.checkoutUrl,
      qrCode: paymentLink.qrCode,
      amount,
      currency: tx.currency,
      paymentStage: 'SERVICE_FEE',
      status: tx.status,
      expiresAt: tx.expires_at ? tx.expires_at.toISOString() : undefined,
    };
  }

  private validateActor(actor?: VerifiedActor): {
    userId?: string;
    guestSessionId?: string;
  } {
    const parsed: ParsedVerifiedActor = parseVerifiedActor(actor);
    if (parsed.kind === 'USER') {
      return { userId: parsed.userId };
    }
    if (parsed.kind === 'GUEST_SESSION') {
      return { guestSessionId: parsed.guestSessionId };
    }
    if (parsed.kind === 'VERIFIED_GUEST') {
      return { userId: parsed.customerIdentityId };
    }
    throw new BadRequestException('Invalid actor');
  }
}
