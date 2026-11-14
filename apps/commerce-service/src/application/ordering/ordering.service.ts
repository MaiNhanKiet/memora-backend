import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminOrderSummaryItem,
  CreateOrderRequest,
  CreateOrderResponse,
  FullQuoteDetail,
  GetAdminOrderDetailsRequest,
  GetAdminOrderDetailsResponse,
  GetOrderByIdRequest,
  GetOrderByIdResponse,
  GetOrderTimelineRequest,
  GetOrderTimelineResponse,
  GetRingItemDetailsRequest,
  GetRingItemDetailsResponse,
  ListAdminOrdersRequest,
  ListAdminOrdersResponse,
  ListOrderQuotesRequest,
  ListOrderQuotesResponse,
  ListOrdersRequest,
  ListOrdersResponse,
  ListRingItemVersionsRequest,
  ListRingItemVersionsResponse,
  OrderActorIdentity,
  RingItemVersionSummary,
  StageGateItem,
  TimelineEventItem,
  UpdateCurrentRingItemVersionRequest,
  UpdateCurrentRingItemVersionResponse,
  UpdateOrderStatusRequest,
  UpdateOrderStatusResponse,
} from '@app/contracts';
import { OrderingRepository } from '../../repositories/ordering.repository';
import type { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class OrderingService {
  constructor(private readonly repository: OrderingRepository) {}

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

  private validateActor(actor?: OrderActorIdentity): {
    userId?: string;
    guestSessionId?: string;
  } {
    if (!actor || (!actor.userId && !actor.guestSessionId)) {
      throw new BadRequestException(
        'Missing actor identity: either userId or guestSessionId must be provided',
      );
    }
    return {
      userId: actor.userId?.trim() || undefined,
      guestSessionId: actor.guestSessionId?.trim() || undefined,
    };
  }
}
