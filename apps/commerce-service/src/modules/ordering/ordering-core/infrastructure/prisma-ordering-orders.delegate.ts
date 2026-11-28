import { ConflictException, NotFoundException } from '@nestjs/common';
import type { RingItemSummary } from '@app/contracts';
import { Prisma } from '../../../../../generated/prisma/client';
import type { PrismaService } from '../../../../persistence/prisma/prisma.service';
import {
  extractCertifiedPriceVersionIds,
  extractMaintenancePlan,
  parseGemstoneSelections,
} from '../../../design/cart/application/cart.mapper';
import { resolveGemstoneSelections } from '../../../design/cart/infrastructure/prisma-cart.repository';
import {
  releaseCertifiedGemstoneAssignments,
  setCertifiedGemstoneAssignments,
} from '../../../inventory/inventory-core/infrastructure/prisma-certified-gemstone-allocations';
import { releaseOrderStockLotAllocations } from '../../../inventory/inventory-core/infrastructure/prisma-stock-lot-allocations';
import { estimatePriceInTransaction } from '../../../pricing/pricing-core/infrastructure/prisma-pricing.repository';
import type {
  CreateOrderTransactionInput,
  CreateOrderTransactionResult,
  OrderingDetailRecord,
  OrderingDraftRecord,
  OrderingListItemRecord,
  OrderingPersonalizationContextRecord,
} from '../application/ordering.repository';
import {
  assertOrderCancellable,
  assertValidOrderStatusTransition,
  resolvePaymentCredit,
} from '../application/ordering-state';
import {
  ORDER_WITH_RELATIONS_INCLUDE,
  toOrderDetailRecord,
  toOrderListItemRecord,
  toPaymentTransactionRecord,
} from './prisma-ordering.mappers';

type ProvisionalQuoteLine = Pick<
  Prisma.quote_itemsCreateManyInput,
  | 'component_type'
  | 'description'
  | 'price_version_id'
  | 'pricing_rule_id'
  | 'metadata_json'
> & { amount: Prisma.Decimal };

async function priceDraftForCheckout(
  tx: Prisma.TransactionClient,
  draft: OrderingDraftRecord,
  at: Date,
) {
  const maintenancePlan = extractMaintenancePlan(draft.gemstoneConfigJson);
  const selections = await resolveGemstoneSelections(
    tx,
    draft.templateVariantId,
    parseGemstoneSelections(draft.gemstoneConfigJson),
    at,
  );
  const certified = selections.flatMap((selection) =>
    selection.certifiedGemstoneId ? [selection] : [],
  );
  const storedPriceIds = extractCertifiedPriceVersionIds(
    draft.gemstoneConfigJson,
  );
  if (
    storedPriceIds.join(',') !==
    certified.map(({ priceVersionId }) => priceVersionId).join(',')
  ) {
    throw new ConflictException(
      'Certified gemstone price changed. Update your cart item before placing the order',
    );
  }

  const pricing = await estimatePriceInTransaction(
    tx,
    {
      templateVariantId: draft.templateVariantId,
      targetSize: draft.targetSize,
      personalizationPackage: draft.personalizationPackage,
      maintenancePlan,
      gemstoneOptionIds: selections
        .filter(({ certifiedGemstoneId }) => !certifiedGemstoneId)
        .map(({ optionId }) => optionId),
    },
    at,
  );
  const { breakdown } = pricing.estimate;
  const quoteLines: ProvisionalQuoteLine[] = [
    {
      component_type: 'RING_BLANK',
      description: `${draft.templateName} - ${draft.materialName}`,
      amount: new Prisma.Decimal(breakdown.baseBlankPrice),
      price_version_id: pricing.blankPriceVersionId,
    },
    ...pricing.gemstones.map(({ priceVersionId, price }) => ({
      component_type: 'GEMSTONE',
      amount: new Prisma.Decimal(price),
      price_version_id: priceVersionId,
    })),
    ...certified.map((gemstone) => ({
      component_type: 'GEMSTONE',
      amount: new Prisma.Decimal(gemstone.certifiedPrice),
      price_version_id: gemstone.priceVersionId,
      metadata_json: { certifiedGemstoneId: gemstone.certifiedGemstoneId },
    })),
  ];
  if (pricing.resizeRuleId) {
    quoteLines.push({
      component_type: 'RESIZE',
      amount: new Prisma.Decimal(breakdown.resizeFee).toDecimalPlaces(2),
      pricing_rule_id: pricing.resizeRuleId,
    });
  }
  if (pricing.personalizationPriceVersionId) {
    quoteLines.push({
      component_type: 'PERSONALIZATION',
      amount: new Prisma.Decimal(breakdown.personalizationFee),
      price_version_id: pricing.personalizationPriceVersionId,
    });
  }
  if (pricing.maintenancePlanPriceVersionId) {
    quoteLines.push({
      component_type: 'MAINTENANCE_PLAN',
      description: maintenancePlan,
      amount: new Prisma.Decimal(breakdown.maintenancePlanFee),
      price_version_id: pricing.maintenancePlanPriceVersionId,
    });
  }
  const total = quoteLines.reduce(
    (sum, line) => sum.add(line.amount),
    new Prisma.Decimal(0),
  );
  if (!total.equals(draft.estimatedPrice)) {
    throw new ConflictException(
      `The price for draft ${draft.id} changed. Update your cart item before placing the order`,
    );
  }

  return { draft, maintenancePlan, selections, certified, quoteLines, total };
}

export class PrismaOrderingOrdersDelegate {
  constructor(private readonly prisma: PrismaService) {}

  async findDraftsByIds(
    draftIds: readonly string[],
  ): Promise<OrderingDraftRecord[]> {
    const rows = await this.prisma.ring_design_drafts.findMany({
      where: {
        id: { in: [...draftIds] },
        status: 'IN_CART',
      },
      include: {
        carts: {
          select: {
            user_id: true,
            guest_session_id: true,
          },
        },
        template_variants: {
          include: {
            materials: { select: { name: true } },
            ring_templates: { select: { code: true, name: true } },
          },
        },
      },
    });

    return rows.map((d) => ({
      id: d.id,
      cartId: d.cart_id ?? undefined,
      ownerUserId: d.owner_user_id ?? undefined,
      guestSessionId: d.guest_session_id ?? undefined,
      cartOwnerUserId: d.carts?.user_id ?? undefined,
      cartGuestSessionId: d.carts?.guest_session_id ?? undefined,
      templateVariantId: d.template_variant_id,
      templateCode: d.template_variants.ring_templates.code,
      templateName: d.template_variants.ring_templates.name,
      materialName: d.template_variants.materials.name,
      targetSize: Number(d.target_size),
      personalizationPackage: d.personalization_package,
      memoryEnabled: d.memory_enabled,
      gemstoneConfigJson: d.gemstone_config_json,
      updatedAt: d.updated_at,
      estimatedPrice: d.estimated_price ? Number(d.estimated_price) : 0,
    }));
  }

  async createOrderTransaction(
    params: CreateOrderTransactionInput,
  ): Promise<CreateOrderTransactionResult> {
    const timestamp = Date.now();
    const randomSuffix = Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase();
    const orderNo = `ORD-${timestamp}-${randomSuffix}`;
    const quoteNo = `QUO-${timestamp}-${randomSuffix}`;

    const createOrder = async (tx: Prisma.TransactionClient) => {
      const pricedAt = new Date();
      const pricedDrafts = await Promise.all(
        params.selectedDrafts.map((draft) =>
          priceDraftForCheckout(tx, draft, pricedAt),
        ),
      );
      const converted = await tx.ring_design_drafts.updateMany({
        where: {
          status: 'IN_CART',
          OR: params.selectedDrafts.map((draft) => ({
            id: draft.id,
            updated_at: draft.updatedAt,
          })),
        },
        data: { status: 'CONVERTED', cart_id: null, updated_at: new Date() },
      });
      if (converted.count !== params.selectedDrafts.length) {
        throw new ConflictException(
          'A selected draft has changed or is no longer in the cart',
        );
      }

      const totalAmount = pricedDrafts.reduce(
        (sum, pricedDraft) => sum.add(pricedDraft.total),
        new Prisma.Decimal(0),
      );

      const order = await tx.orders.create({
        data: {
          order_no: orderNo,
          owner_customer_identity_id: params.ownerCustomerIdentityId,
          guest_email: params.guestEmail,
          guest_phone: params.guestPhone,
          created_from_cart_id: params.createdFromCartId,
          status: params.status,
          source_plan_mode: params.sourcePlanMode,
          pre_p1_notice_version: params.preP1NoticeVersion,
          privacy_notice_acknowledged_at: params.privacyNoticeAcknowledgedAt,
          p1_nonrefund_acknowledged_at: params.p1NonrefundAcknowledgedAt,
          pre_p1_evidence_json:
            (params.preP1EvidenceJson as Prisma.InputJsonValue | undefined) ??
            Prisma.JsonNull,
          fulfillment_mode: params.fulfillmentMode,
          recipient_name: params.recipientName,
          recipient_phone: params.recipientPhone,
          recipient_email: params.recipientEmail,
          delivery_address_json:
            params.deliveryAddressJson as Prisma.InputJsonValue,
        },
      });

      const quote = await tx.quotes.create({
        data: {
          quote_no: quoteNo,
          order_id: order.id,
          quote_type: 'PROVISIONAL',
          version_no: 1,
          status: 'ISSUED',
          subtotal_amount: totalAmount,
          delivery_amount: new Prisma.Decimal(0),
          adjustment_amount: new Prisma.Decimal(0),
          total_amount: totalAmount,
          currency: 'VND',
          issued_at: new Date(),
        },
      });

      let itemNumber = 1;
      const createdItems: RingItemSummary[] = [];
      const certifiedAssignments: {
        ringItemId: string;
        certifiedGemstoneId: string;
        gemstoneOptionId: string;
      }[] = [];
      for (const {
        draft,
        maintenancePlan,
        selections,
        certified,
        quoteLines,
      } of pricedDrafts) {
        const ringItem = await tx.ring_items.create({
          data: {
            order_id: order.id,
            item_no: itemNumber,
            source_ring_design_draft_id: draft.id,
          },
        });

        const ringItemVersion = await tx.ring_item_versions.create({
          data: {
            ring_item_id: ringItem.id,
            version_no: 1,
            template_variant_id: draft.templateVariantId,
            target_size: new Prisma.Decimal(draft.targetSize),
            personalization_package: draft.personalizationPackage,
            memory_enabled: draft.memoryEnabled,
            preview_snapshot_json: maintenancePlan
              ? { maintenancePlan }
              : Prisma.JsonNull,
            status:
              draft.personalizationPackage === 'NONE'
                ? 'REVIEW_NOT_REQUIRED'
                : 'DRAFT',
            change_reason: 'INITIAL_SNAPSHOT',
            created_by_customer_identity_id: params.ownerCustomerIdentityId,
          },
        });

        await tx.ring_items.update({
          where: { id: ringItem.id },
          data: { current_version_id: ringItemVersion.id },
        });

        for (const selection of selections) {
          await tx.ring_item_version_gemstones.create({
            data: {
              ring_item_version_id: ringItemVersion.id,
              gemstone_slot_id: selection.slotId,
              gemstone_option_id: selection.optionId,
              certified_gemstone_id: selection.certifiedGemstoneId,
            },
          });
        }
        for (const gemstone of certified) {
          certifiedAssignments.push({
            ringItemId: ringItem.id,
            certifiedGemstoneId: gemstone.certifiedGemstoneId,
            gemstoneOptionId: gemstone.optionId,
          });
        }
        await tx.quote_items.createMany({
          data: quoteLines.map(({ amount, ...line }) => ({
            ...line,
            quote_id: quote.id,
            ring_item_id: ringItem.id,
            quantity: 1,
            unit_amount: amount,
            line_amount: amount,
            price_source_type: line.pricing_rule_id
              ? 'PRICING_RULE'
              : 'PRICE_VERSION',
          })),
        });

        createdItems.push({
          id: ringItem.id,
          itemNo: itemNumber,
          sourceRingDesignDraftId: draft.id,
          currentVersionId: ringItemVersion.id,
          versionNo: 1,
          templateVariantId: draft.templateVariantId,
          templateCode: draft.templateCode,
          templateName: draft.templateName,
          materialName: draft.materialName,
          targetSize: draft.targetSize,
          personalizationPackage: draft.personalizationPackage,
          memoryEnabled: draft.memoryEnabled,
        });

        itemNumber++;
      }

      const updatedOrder = await tx.orders.update({
        where: { id: order.id },
        data: { current_quote_id: quote.id },
      });

      if (
        !(await setCertifiedGemstoneAssignments(
          tx,
          certifiedAssignments,
          'HOLD',
        ))
      ) {
        throw new ConflictException(
          'One or more certified gemstones are no longer available',
        );
      }

      return {
        orderId: updatedOrder.id,
        orderNo: updatedOrder.order_no,
        status: updatedOrder.status,
        sourcePlanMode: updatedOrder.source_plan_mode,
        createdAt: updatedOrder.created_at,
        itemsCount: params.selectedDrafts.length,
        totalAmount: Number(totalAmount),
        items: createdItems,
      };
    };

    try {
      return await this.prisma.$transaction(createOrder, {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ConflictException(
          'A selected draft no longer has valid pricing. Review your cart before placing the order',
        );
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'A selected draft or its inventory changed. Refresh your cart before placing the order',
        );
      }
      throw error;
    }
  }

  async listOrders(
    actorId: string,
    guestEmail?: string,
    status?: string,
    skip = 0,
    take = 20,
  ): Promise<{ items: OrderingListItemRecord[]; total: number }> {
    const where: Prisma.ordersWhereInput = {
      OR: [
        { owner_customer_identity_id: actorId },
        ...(guestEmail ? [{ guest_email: guestEmail }] : []),
      ],
      ...(status ? { status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.orders.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          quotes_orders_current_quote_idToquotes: true,
          _count: { select: { ring_items: true } },
        },
      }),
      this.prisma.orders.count({ where }),
    ]);

    return { items: items.map((o) => toOrderListItemRecord(o)), total };
  }

  async findOrderById(
    orderId: string,
    actorId: string,
    guestEmail?: string,
  ): Promise<OrderingDetailRecord | undefined> {
    const row = await this.prisma.orders.findFirst({
      where: {
        id: orderId,
        OR: [
          { owner_customer_identity_id: actorId },
          ...(guestEmail ? [{ guest_email: guestEmail }] : []),
        ],
      },
      include: ORDER_WITH_RELATIONS_INCLUDE,
    });

    return row ? toOrderDetailRecord(row) : undefined;
  }

  async listAdminOrders(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    items: OrderingListItemRecord[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ordersWhereInput = {};
    if (params.status) {
      where.status = params.status;
    }
    if (params.search) {
      const search = params.search.trim();
      where.OR = [
        { order_no: { contains: search, mode: 'insensitive' } },
        { recipient_name: { contains: search, mode: 'insensitive' } },
        { recipient_phone: { contains: search } },
      ];
    }
    if (params.dateFrom || params.dateTo) {
      where.created_at = {
        ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
        ...(params.dateTo ? { lte: new Date(params.dateTo) } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.orders.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          quotes_orders_current_quote_idToquotes: true,
          _count: { select: { ring_items: true } },
        },
      }),
      this.prisma.orders.count({ where }),
    ]);

    return {
      items: items.map((o) => toOrderListItemRecord(o)),
      total,
      page,
      limit,
    };
  }

  async findAdminOrderById(
    orderId: string,
  ): Promise<OrderingDetailRecord | undefined> {
    const row = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: ORDER_WITH_RELATIONS_INCLUDE,
    });
    return row ? toOrderDetailRecord(row) : undefined;
  }

  async updateOrderStatus(params: {
    orderId: string;
    targetStatus: string;
    reason?: string;
  }): Promise<{
    id: string;
    orderNo: string;
    status: string;
    updatedAt: Date;
  }> {
    const data: Prisma.ordersUpdateInput = {
      status: params.targetStatus,
      updated_at: new Date(),
    };
    if (params.targetStatus === 'CANCELLED') {
      data.cancelled_at = new Date();
      data.cancellation_reason = params.reason || 'Admin cancelled';
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await this.lockOrder(tx, params.orderId);
      assertValidOrderStatusTransition(current.status, params.targetStatus);
      if (params.targetStatus === 'CANCELLED') {
        await this.releaseOrderAllocations(tx, params.orderId);
      }
      return tx.orders.update({ where: { id: params.orderId }, data });
    });

    return {
      id: updated.id,
      orderNo: updated.order_no,
      status: updated.status,
      updatedAt: updated.updated_at,
    };
  }

  async findOrderPersonalizationContext(
    orderId: string,
  ): Promise<OrderingPersonalizationContextRecord | undefined> {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        owner_customer_identity_id: true,
        status: true,
        source_plan_mode: true,
        payment_transactions: { where: { status: 'SUCCEEDED' } },
        quotes_quotes_order_idToorders: {
          where: { quote_type: 'PROVISIONAL' },
          orderBy: { version_no: 'desc' },
          take: 1,
          select: { id: true, currency: true, total_amount: true },
        },
        ring_items: {
          orderBy: { item_no: 'asc' },
          select: {
            id: true,
            item_no: true,
            current_version_id: true,
            ring_item_versions_ring_items_current_version_idToring_item_versions:
              {
                select: {
                  id: true,
                  personalization_package: true,
                  status: true,
                },
              },
          },
        },
      },
    });

    if (!order) {
      return undefined;
    }

    const [depositQuote] = order.quotes_quotes_order_idToorders;
    const depositTarget = depositQuote
      ? Math.round(Number(depositQuote.total_amount) * 0.3)
      : 0;
    const p1Paid =
      depositQuote &&
      depositTarget > 0 &&
      !['AWAITING_P1', 'CANCELLED', 'EXPIRED_UNPAID'].includes(order.status) &&
      resolvePaymentCredit(
        order.payment_transactions.map((row) =>
          toPaymentTransactionRecord(row),
        ),
        depositQuote,
        new Set(['DEPOSIT_P1']),
        true,
      ) >= depositTarget;

    return {
      id: order.id,
      ownerCustomerIdentityId: order.owner_customer_identity_id,
      status: order.status,
      sourcePlanMode: order.source_plan_mode,
      p1Paid: p1Paid === true,
      ringItems: order.ring_items.map((item) => {
        const ver =
          item.ring_item_versions_ring_items_current_version_idToring_item_versions;
        return {
          ringItemId: item.id,
          itemNo: item.item_no,
          currentVersionId: item.current_version_id || ver?.id || '',
          personalizationPackage: ver?.personalization_package || 'NONE',
          versionStatus: ver?.status || 'DRAFT',
        };
      }),
    };
  }

  private async lockOrder(tx: Prisma.TransactionClient, orderId: string) {
    await tx.$queryRaw`SELECT id FROM ordering.orders WHERE id = ${orderId}::uuid FOR UPDATE`;
    const order = await tx.orders.findUnique({
      where: { id: orderId },
      select: { status: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private async releaseOrderAllocations(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<void> {
    const items = await tx.ring_items.findMany({
      where: { order_id: orderId },
      select: { id: true },
    });
    const ringItemIds = items.map(({ id }) => id);
    if (!ringItemIds.length) return;
    await releaseCertifiedGemstoneAssignments(
      tx,
      ringItemIds,
      ['HOLD', 'RESERVED'],
      'Order cancelled',
    );
    await releaseOrderStockLotAllocations(tx, ringItemIds);
  }

  async cancelOrder(
    orderId: string,
    reason?: string,
  ): Promise<{
    id: string;
    status: string;
    cancelledAt?: Date;
    cancellationReason?: string;
  }> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, orderId);
      assertOrderCancellable(order.status);
      const payment = await tx.payment_transactions.findFirst({
        where: {
          order_id: orderId,
          transaction_type: 'PAYMENT',
          status: 'SUCCEEDED',
        },
        select: { id: true },
      });
      if (payment)
        throw new ConflictException(
          'Contact support to cancel an order with a confirmed payment',
        );
      await this.releaseOrderAllocations(tx, orderId);
      return tx.orders.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelled_at: new Date(),
          cancellation_reason: reason ?? null,
        },
      });
    });

    return {
      id: updated.id,
      status: updated.status,
      cancelledAt: updated.cancelled_at ?? undefined,
      cancellationReason: updated.cancellation_reason ?? undefined,
    };
  }
}
