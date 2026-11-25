import { Injectable } from '@nestjs/common';
import type { RingItemSummary } from '@app/contracts';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import type {
  CreateOrderTransactionInput,
  CreateOrderTransactionResult,
  OrderingDetailRecord,
  OrderingDraftRecord,
  OrderingFinalConfirmationRecord,
  OrderingInvoiceRecord,
  OrderingListItemRecord,
  OrderingPaymentTransactionRecord,
  OrderingPersonalizationContextRecord,
  OrderingQuoteRecord,
  OrderingRepository,
  OrderingRingItemDetailRecord,
  OrderingRingItemVersionRecord,
} from '../application/ordering.repository';
import {
  ORDER_WITH_RELATIONS_INCLUDE,
  toGemstoneDetailRecords,
  toOrderDetailRecord,
  toOrderInvoiceRecord,
  toOrderListItemRecord,
  toPaymentTransactionRecord,
  toQuoteRecord,
} from './prisma-ordering.mappers';

@Injectable()
export class PrismaOrderingRepository implements OrderingRepository {
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
      templateVariantId: d.template_variant_id,
      templateCode: d.template_variants.ring_templates.code,
      templateName: d.template_variants.ring_templates.name,
      materialName: d.template_variants.materials.name,
      targetSize: Number(d.target_size),
      personalizationPackage: d.personalization_package,
      memoryEnabled: d.memory_enabled,
      gemstoneConfigJson: d.gemstone_config_json,
      estimatedPrice: d.estimated_price ? Number(d.estimated_price) : 0,
      ringTemplateId: d.template_variants.ring_template_id,
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

    return this.prisma.$transaction(async (tx) => {
      let subtotal = new Prisma.Decimal(0);
      for (const draft of params.selectedDrafts) {
        subtotal = subtotal.add(new Prisma.Decimal(draft.estimatedPrice));
      }
      const totalAmount = subtotal;

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
          subtotal_amount: subtotal,
          delivery_amount: new Prisma.Decimal(0),
          adjustment_amount: new Prisma.Decimal(0),
          total_amount: totalAmount,
          currency: 'VND',
          issued_at: new Date(),
        },
      });

      let itemNumber = 1;
      const createdItems: RingItemSummary[] = [];
      for (const draft of params.selectedDrafts) {
        const ringItem = await tx.ring_items.create({
          data: {
            order_id: order.id,
            item_no: itemNumber,
            source_ring_design_draft_id: draft.id,
          },
        });

        const draftConfig = draft.gemstoneConfigJson as
          | Array<{
              slotNumber?: number;
              slot_number?: number;
              gemstoneOptionId?: string;
              gemstone_option_id?: string;
            }>
          | {
              selections?: Array<{
                slotNumber?: number;
                slot_number?: number;
                gemstoneOptionId?: string;
                gemstone_option_id?: string;
              }>;
              maintenancePlan?: string;
            };

        const rawSelections = Array.isArray(draftConfig)
          ? draftConfig
          : (draftConfig?.selections ?? []);
        const maintenancePlan =
          !Array.isArray(draftConfig) && draftConfig?.maintenancePlan
            ? draftConfig.maintenancePlan
            : undefined;

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
            status: 'DRAFT',
            change_reason: 'INITIAL_SNAPSHOT',
            created_by_customer_identity_id: params.ownerCustomerIdentityId,
          },
        });

        await tx.ring_items.update({
          where: { id: ringItem.id },
          data: { current_version_id: ringItemVersion.id },
        });

        if (rawSelections.length > 0) {
          const slots = await tx.gemstone_slots.findMany({
            where: {
              gemstone_groups: {
                ring_template_id: draft.ringTemplateId,
              },
            },
            orderBy: { slot_index: 'asc' },
          });

          for (const item of rawSelections) {
            const slotIdx = item.slotNumber ?? item.slot_number ?? 1;
            const optId = item.gemstoneOptionId ?? item.gemstone_option_id;
            const matchedSlot =
              slots.find((s) => s.slot_index === slotIdx) ?? slots[0];

            if (matchedSlot && optId) {
              await tx.ring_item_version_gemstones.create({
                data: {
                  ring_item_version_id: ringItemVersion.id,
                  gemstone_slot_id: matchedSlot.id,
                  gemstone_option_id: optId,
                },
              });
            }
          }
        }

        const maintenanceAmount =
          maintenancePlan === 'LIFETIME_POLISHING' ? 500000 : 0;
        const ringBlankAmount = Math.max(
          0,
          draft.estimatedPrice - maintenanceAmount,
        );

        await tx.quote_items.create({
          data: {
            quote_id: quote.id,
            ring_item_id: ringItem.id,
            component_type: 'RING_BLANK',
            description: `${draft.templateName} - ${draft.materialName}`,
            quantity: new Prisma.Decimal(1),
            unit_amount: new Prisma.Decimal(ringBlankAmount),
            line_amount: new Prisma.Decimal(ringBlankAmount),
            price_source_type: 'MANUAL',
          },
        });

        if (maintenancePlan === 'LIFETIME_POLISHING') {
          await tx.quote_items.create({
            data: {
              quote_id: quote.id,
              ring_item_id: ringItem.id,
              component_type: 'MAINTENANCE_PLAN',
              description: 'Gói bảo dưỡng trọn đời - Đánh bóng và xi mới',
              quantity: new Prisma.Decimal(1),
              unit_amount: new Prisma.Decimal(500000),
              line_amount: new Prisma.Decimal(500000),
              price_source_type: 'MANUAL',
            },
          });
        }

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

      await tx.ring_design_drafts.updateMany({
        where: { id: { in: params.selectedDrafts.map((d) => d.id) } },
        data: {
          status: 'CONVERTED',
          cart_id: null,
          updated_at: new Date(),
        },
      });

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
    });
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

  async findRingItemWithDetails(
    orderId: string,
    ringItemId: string,
    actorId: string,
    guestEmail?: string,
  ): Promise<OrderingRingItemDetailRecord | undefined> {
    const order = await this.prisma.orders.findFirst({
      where: {
        id: orderId,
        OR: [
          { owner_customer_identity_id: actorId },
          ...(guestEmail ? [{ guest_email: guestEmail }] : []),
        ],
      },
    });
    if (!order) {
      return undefined;
    }

    const item = await this.prisma.ring_items.findFirst({
      where: { id: ringItemId, order_id: orderId },
      include: {
        ring_item_versions_ring_items_current_version_idToring_item_versions: {
          include: {
            template_variants: {
              include: {
                materials: { select: { name: true } },
                ring_templates: { select: { code: true, name: true } },
              },
            },
            ring_item_version_gemstones: {
              include: {
                gemstone_slots: true,
                gemstone_options: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      return undefined;
    }

    const ver =
      item.ring_item_versions_ring_items_current_version_idToring_item_versions;
    const maintenancePlan =
      typeof ver?.preview_snapshot_json === 'object' &&
      ver?.preview_snapshot_json !== null &&
      'maintenancePlan' in ver.preview_snapshot_json &&
      typeof ver.preview_snapshot_json.maintenancePlan === 'string'
        ? ver.preview_snapshot_json.maintenancePlan
        : undefined;

    return {
      id: item.id,
      orderId: item.order_id,
      itemNo: item.item_no,
      sourceRingDesignDraftId: item.source_ring_design_draft_id,
      currentVersionId: item.current_version_id ?? undefined,
      versionNo: ver?.version_no ?? 1,
      templateVariantId: ver?.template_variants.id ?? '',
      templateCode: ver?.template_variants.ring_templates.code ?? '',
      templateName: ver?.template_variants.ring_templates.name ?? '',
      materialName: ver?.template_variants.materials.name ?? '',
      targetSize: Number(ver?.target_size ?? 0),
      personalizationPackage: ver?.personalization_package ?? 'NONE',
      memoryEnabled: ver?.memory_enabled ?? false,
      maintenancePlan,
      gemstones: toGemstoneDetailRecords(
        ver?.ring_item_version_gemstones ?? [],
      ),
      createdAt: item.created_at,
    };
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

    const updated = await this.prisma.orders.update({
      where: { id: params.orderId },
      data,
    });

    return {
      id: updated.id,
      orderNo: updated.order_no,
      status: updated.status,
      updatedAt: updated.updated_at,
    };
  }

  async listRingItemVersions(
    orderId: string,
    ringItemId: string,
    actorId: string,
    guestEmail?: string,
  ): Promise<OrderingRingItemVersionRecord[] | undefined> {
    const order = await this.prisma.orders.findFirst({
      where: {
        id: orderId,
        OR: [
          { owner_customer_identity_id: actorId },
          ...(guestEmail ? [{ guest_email: guestEmail }] : []),
        ],
      },
    });
    if (!order) {
      return undefined;
    }

    const ringItem = await this.prisma.ring_items.findFirst({
      where: { id: ringItemId, order_id: orderId },
    });
    if (!ringItem) {
      return undefined;
    }

    const versions = await this.prisma.ring_item_versions.findMany({
      where: { ring_item_id: ringItemId },
      orderBy: { version_no: 'asc' },
      include: {
        template_variants: {
          include: {
            materials: { select: { name: true } },
            ring_templates: { select: { code: true, name: true } },
          },
        },
        ring_item_version_gemstones: {
          include: {
            gemstone_slots: true,
            gemstone_options: true,
          },
        },
      },
    });

    return versions.map((ver) => ({
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
      gemstones: toGemstoneDetailRecords(ver.ring_item_version_gemstones),
      createdAt: ver.created_at,
    }));
  }

  async findCurrentRingItemVersion(
    orderId: string,
    ringItemId: string,
    actorId: string,
    guestEmail?: string,
  ): Promise<{ id: string; status: string } | undefined> {
    const order = await this.prisma.orders.findFirst({
      where: {
        id: orderId,
        OR: [
          { owner_customer_identity_id: actorId },
          ...(guestEmail ? [{ guest_email: guestEmail }] : []),
        ],
      },
    });
    if (!order) {
      return undefined;
    }

    const ringItem = await this.prisma.ring_items.findFirst({
      where: { id: ringItemId, order_id: orderId },
      include: {
        ring_item_versions_ring_items_current_version_idToring_item_versions: {
          select: { id: true, status: true },
        },
      },
    });

    if (!ringItem || !ringItem.current_version_id) {
      return undefined;
    }

    return (
      ringItem.ring_item_versions_ring_items_current_version_idToring_item_versions ??
      undefined
    );
  }

  async updateCurrentRingItemVersion(
    versionId: string,
    data: {
      targetSize?: number;
      changeReason?: string;
      memoryEnabled?: boolean;
    },
  ): Promise<{
    id: string;
    versionNo: number;
    status: string;
    targetSize: number;
    changeReason?: string;
    createdAt: Date;
  }> {
    const updateData: Prisma.ring_item_versionsUpdateInput = {
      ...(data.targetSize !== undefined
        ? { target_size: new Prisma.Decimal(data.targetSize) }
        : {}),
      ...(data.changeReason !== undefined
        ? { change_reason: data.changeReason }
        : {}),
      ...(data.memoryEnabled !== undefined
        ? { memory_enabled: data.memoryEnabled }
        : {}),
    };

    const updated = await this.prisma.ring_item_versions.update({
      where: { id: versionId },
      data: updateData,
    });

    return {
      id: updated.id,
      versionNo: updated.version_no,
      status: updated.status,
      targetSize: Number(updated.target_size),
      changeReason: updated.change_reason ?? undefined,
      createdAt: updated.created_at,
    };
  }

  async listOrderQuotes(
    orderId: string,
    actorId: string,
    guestEmail?: string,
  ): Promise<OrderingQuoteRecord[] | undefined> {
    const order = await this.prisma.orders.findFirst({
      where: {
        id: orderId,
        OR: [
          { owner_customer_identity_id: actorId },
          ...(guestEmail ? [{ guest_email: guestEmail }] : []),
        ],
      },
    });
    if (!order) {
      return undefined;
    }

    const quotes = await this.prisma.quotes.findMany({
      where: { order_id: orderId },
      orderBy: { version_no: 'desc' },
      include: { quote_items: { orderBy: { created_at: 'asc' } } },
    });

    return quotes.map((q) => toQuoteRecord(q));
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
        payment_transactions: {
          where: {
            payment_stage: 'P1',
            status: { in: ['SUCCEEDED', 'COMPLETED'] },
          },
          select: { id: true },
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

    return {
      id: order.id,
      ownerCustomerIdentityId: order.owner_customer_identity_id,
      status: order.status,
      sourcePlanMode: order.source_plan_mode,
      p1Paid: order.payment_transactions.length > 0,
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
      const ringItems = await tx.ring_items.findMany({
        where: { order_id: orderId },
        select: { id: true },
      });

      const ringItemIds = ringItems.map((r) => r.id);
      if (ringItemIds.length > 0) {
        await tx.allocations.updateMany({
          where: {
            ring_item_id: { in: ringItemIds },
            status: { in: ['HOLD', 'RESERVED'] },
          },
          data: { status: 'RELEASED' },
        });
      }

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

  async createFinalQuote(params: {
    orderId: string;
    subtotalAmount?: number;
    deliveryAmount?: number;
    adjustmentAmount?: number;
    totalAmount: number;
    currency?: string;
    validUntil?: string;
    staffUserId?: string;
    items: readonly {
      ringItemId?: string;
      componentType: string;
      description?: string;
      quantity?: number;
      unitAmount: number;
      lineAmount: number;
      priceSourceType?: string;
    }[];
  }): Promise<OrderingQuoteRecord | undefined> {
    const created = await this.prisma.$transaction(async (tx) => {
      const order = await tx.orders.findUnique({
        where: { id: params.orderId },
        select: { id: true, order_no: true },
      });
      if (!order) {
        return undefined;
      }

      const lastQuote = await tx.quotes.findFirst({
        where: { order_id: params.orderId, quote_type: 'FINAL' },
        orderBy: { version_no: 'desc' },
      });
      const versionNo = (lastQuote?.version_no ?? 0) + 1;
      const quoteNo = `QUO-${order.order_no}-F${versionNo}`;

      return tx.quotes.create({
        data: {
          quote_no: quoteNo,
          order_id: params.orderId,
          quote_type: 'FINAL',
          version_no: versionNo,
          status: 'DRAFT',
          subtotal_amount: new Prisma.Decimal(
            params.subtotalAmount ?? params.totalAmount,
          ),
          delivery_amount: new Prisma.Decimal(params.deliveryAmount ?? 0),
          adjustment_amount: new Prisma.Decimal(params.adjustmentAmount ?? 0),
          total_amount: new Prisma.Decimal(params.totalAmount),
          currency: params.currency ?? 'VND',
          valid_until: params.validUntil ? new Date(params.validUntil) : null,
          created_by_user_id: params.staffUserId ?? null,
          quote_items: {
            create: params.items.map((item) => ({
              ring_item_id: item.ringItemId ?? null,
              component_type: item.componentType,
              description: item.description ?? null,
              quantity: new Prisma.Decimal(item.quantity ?? 1),
              unit_amount: new Prisma.Decimal(item.unitAmount),
              line_amount: new Prisma.Decimal(item.lineAmount),
              price_source_type: item.priceSourceType ?? 'MANUAL',
            })),
          },
        },
        include: { quote_items: { orderBy: { created_at: 'asc' } } },
      });
    });

    return created ? toQuoteRecord(created) : undefined;
  }

  async findQuoteById(
    orderId: string,
    quoteId: string,
  ): Promise<OrderingQuoteRecord | undefined> {
    const row = await this.prisma.quotes.findFirst({
      where: { id: quoteId, order_id: orderId },
      include: { quote_items: { orderBy: { created_at: 'asc' } } },
    });
    return row ? toQuoteRecord(row) : undefined;
  }

  async updateFinalQuote(params: {
    orderId: string;
    quoteId: string;
    subtotalAmount?: number;
    deliveryAmount?: number;
    adjustmentAmount?: number;
    totalAmount?: number;
    validUntil?: string;
    staffUserId?: string;
    items?: readonly {
      id?: string;
      ringItemId?: string;
      componentType: string;
      description?: string;
      quantity?: number;
      unitAmount: number;
      lineAmount: number;
      priceSourceType?: string;
    }[];
  }): Promise<OrderingQuoteRecord> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.quotesUpdateInput = {
        ...(params.subtotalAmount !== undefined
          ? { subtotal_amount: new Prisma.Decimal(params.subtotalAmount) }
          : {}),
        ...(params.deliveryAmount !== undefined
          ? { delivery_amount: new Prisma.Decimal(params.deliveryAmount) }
          : {}),
        ...(params.adjustmentAmount !== undefined
          ? { adjustment_amount: new Prisma.Decimal(params.adjustmentAmount) }
          : {}),
        ...(params.totalAmount !== undefined
          ? { total_amount: new Prisma.Decimal(params.totalAmount) }
          : {}),
        ...(params.validUntil !== undefined
          ? { valid_until: new Date(params.validUntil) }
          : {}),
      };

      if (params.items && params.items.length > 0) {
        await tx.quote_items.deleteMany({
          where: { quote_id: params.quoteId },
        });
        await tx.quote_items.createMany({
          data: params.items.map((item) => ({
            quote_id: params.quoteId,
            ring_item_id: item.ringItemId ?? null,
            component_type: item.componentType,
            description: item.description ?? null,
            quantity: new Prisma.Decimal(item.quantity ?? 1),
            unit_amount: new Prisma.Decimal(item.unitAmount),
            line_amount: new Prisma.Decimal(item.lineAmount),
            price_source_type: item.priceSourceType ?? 'MANUAL',
          })),
        });
      }

      return tx.quotes.update({
        where: { id: params.quoteId },
        data: updateData,
        include: { quote_items: { orderBy: { created_at: 'asc' } } },
      });
    });

    return toQuoteRecord(updated);
  }

  async publishFinalQuote(
    orderId: string,
    quoteId: string,
  ): Promise<OrderingQuoteRecord> {
    const published = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.quotes.findUnique({ where: { id: quoteId } });
      const validUntil =
        existing?.valid_until ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const quote = await tx.quotes.update({
        where: { id: quoteId },
        data: {
          status: 'ISSUED',
          issued_at: new Date(),
          valid_until: validUntil,
        },
        include: { quote_items: { orderBy: { created_at: 'asc' } } },
      });

      await tx.orders.update({
        where: { id: orderId },
        data: {
          current_quote_id: quoteId,
          status: 'AWAITING_CUSTOMER_CONFIRMATION',
        },
      });

      return quote;
    });

    return toQuoteRecord(published);
  }

  async confirmFinalQuote(
    orderId: string,
    quoteId: string,
    customerIdentityId: string,
    nextOrderStatus: string,
  ): Promise<OrderingFinalConfirmationRecord> {
    const { confirmation, ringItems } = await this.prisma.$transaction(
      async (tx) => {
        await tx.final_confirmations.updateMany({
          where: { order_id: orderId, status: 'ACTIVE' },
          data: {
            status: 'INVALIDATED',
            invalidated_at: new Date(),
            invalidation_reason: 'Superseded by new confirmation',
          },
        });

        const items = await tx.ring_items.findMany({
          where: { order_id: orderId },
          select: {
            id: true,
            current_version_id: true,
            ring_item_versions_ring_items_current_version_idToring_item_versions:
              { select: { version_no: true } },
          },
        });

        const created = await tx.final_confirmations.create({
          data: {
            order_id: orderId,
            quote_id: quoteId,
            confirmed_by_customer_identity_id: customerIdentityId,
            status: 'ACTIVE',
            confirmed_at: new Date(),
            final_confirmation_items: {
              create: items
                .filter((r) => r.current_version_id)
                .map((r) => ({
                  ring_item_id: r.id,
                  ring_item_version_id: r.current_version_id!,
                })),
            },
          },
          include: { final_confirmation_items: true },
        });

        await tx.quotes.update({
          where: { id: quoteId },
          data: {
            status: 'ACCEPTED',
            accepted_by_customer_identity_id: customerIdentityId,
            accepted_at: new Date(),
          },
        });

        await tx.orders.update({
          where: { id: orderId },
          data: { status: nextOrderStatus },
        });

        return { confirmation: created, ringItems: items };
      },
    );

    return {
      id: confirmation.id,
      orderId: confirmation.order_id,
      quoteId: confirmation.quote_id,
      quoteNo: '',
      quoteTotalAmount: 0,
      confirmedByCustomerIdentityId:
        confirmation.confirmed_by_customer_identity_id,
      status: confirmation.status,
      confirmedAt: confirmation.confirmed_at,
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

  async rejectFinalQuote(
    orderId: string,
    quoteId: string,
    _reason?: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.quotes.update({
        where: { id: quoteId },
        data: { status: 'REJECTED' },
      });

      await tx.orders.update({
        where: { id: orderId },
        data: { status: 'PENDING_FINAL_QUOTE' },
      });
    });
  }

  async findFinalConfirmations(
    orderId: string,
  ): Promise<OrderingFinalConfirmationRecord[]> {
    const rows = await this.prisma.final_confirmations.findMany({
      where: { order_id: orderId },
      orderBy: { confirmed_at: 'desc' },
      include: {
        quotes: true,
        final_confirmation_items: {
          include: { ring_item_versions: true },
        },
      },
    });

    return rows.map((c) => ({
      id: c.id,
      orderId: c.order_id,
      quoteId: c.quote_id,
      quoteNo: c.quotes?.quote_no ?? '',
      quoteTotalAmount: c.quotes ? Number(c.quotes.total_amount) : 0,
      confirmedByCustomerIdentityId: c.confirmed_by_customer_identity_id,
      status: c.status,
      confirmedAt: c.confirmed_at,
      invalidatedAt: c.invalidated_at ?? undefined,
      invalidationReason: c.invalidation_reason ?? undefined,
      items: c.final_confirmation_items.map((i) => ({
        id: i.id,
        ringItemId: i.ring_item_id,
        ringItemVersionId: i.ring_item_version_id,
        versionNo: i.ring_item_versions?.version_no ?? 1,
      })),
    }));
  }

  async findOrderPayments(
    orderId: string,
  ): Promise<OrderingPaymentTransactionRecord[]> {
    const rows = await this.prisma.payment_transactions.findMany({
      where: { order_id: orderId },
      orderBy: { requested_at: 'desc' },
    });
    return rows.map((p) => toPaymentTransactionRecord(p));
  }

  async findOrderPaymentById(
    orderId: string,
    transactionId: string,
  ): Promise<OrderingPaymentTransactionRecord | undefined> {
    const row = await this.prisma.payment_transactions.findFirst({
      where: { id: transactionId, order_id: orderId },
    });
    return row ? toPaymentTransactionRecord(row) : undefined;
  }

  async findPaymentTransactionById(
    transactionId: string,
  ): Promise<OrderingPaymentTransactionRecord | undefined> {
    const row = await this.prisma.payment_transactions.findUnique({
      where: { id: transactionId },
      include: { orders: true, quotes: true },
    });
    return row ? toPaymentTransactionRecord(row) : undefined;
  }

  async findPaymentReceipt(
    orderId: string,
    transactionId: string,
  ): Promise<OrderingPaymentTransactionRecord | undefined> {
    const tx = await this.prisma.payment_transactions.findFirst({
      where: { id: transactionId, order_id: orderId },
      include: {
        orders: {
          select: { order_no: true, recipient_name: true },
        },
      },
    });
    if (!tx) {
      return undefined;
    }

    if (!tx.receipt_no && tx.status === 'SUCCEEDED') {
      const orderNo = tx.orders?.order_no || 'ORD';
      const randomSuffix = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();
      const generatedReceiptNo = `REC-${orderNo}-${tx.payment_stage}-${randomSuffix}`;
      const receiptAssetKey = `receipts/${orderNo}/${generatedReceiptNo}.pdf`;
      const now = new Date();

      await this.prisma.payment_transactions.update({
        where: { id: tx.id },
        data: {
          receipt_no: generatedReceiptNo,
          receipt_issued_at: now,
          receipt_asset_key: receiptAssetKey,
        },
      });

      tx.receipt_no = generatedReceiptNo;
      tx.receipt_issued_at = now;
      tx.receipt_asset_key = receiptAssetKey;
    }

    return toPaymentTransactionRecord(tx);
  }

  async findOrderInvoice(
    orderId: string,
  ): Promise<OrderingInvoiceRecord | undefined> {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        quotes_orders_current_quote_idToquotes: {
          include: { quote_items: { orderBy: { created_at: 'asc' } } },
        },
        payment_transactions: {
          where: { status: 'SUCCEEDED' },
          orderBy: { completed_at: 'asc' },
        },
      },
    });
    if (!order) {
      return undefined;
    }

    if (!order.invoice_no) {
      const invoiceNo = `INV-${order.order_no}`;
      const now = new Date();

      await this.prisma.orders.update({
        where: { id: order.id },
        data: { invoice_no: invoiceNo, invoice_issued_at: now },
      });

      order.invoice_no = invoiceNo;
      order.invoice_issued_at = now;
    }

    return toOrderInvoiceRecord(order);
  }

  async createRefundRequest(params: {
    transactionId: string;
    refundAmount: number;
    reason: string;
    notes?: string;
    staffUserId?: string;
  }): Promise<OrderingPaymentTransactionRecord | undefined> {
    const refund = await this.prisma.$transaction(async (tx) => {
      const original = await tx.payment_transactions.findUnique({
        where: { id: params.transactionId },
      });
      if (!original) {
        return undefined;
      }

      return tx.payment_transactions.create({
        data: {
          order_id: original.order_id,
          related_transaction_id: original.id,
          transaction_type: 'REFUND',
          payment_stage: original.payment_stage,
          payment_method: original.payment_method,
          provider: original.provider,
          amount: new Prisma.Decimal(params.refundAmount),
          currency: original.currency,
          status: 'PENDING',
          recorded_by_user_id: params.staffUserId ?? null,
          metadata_json: {
            reason: params.reason,
            notes: params.notes ?? null,
            originalProviderTransactionId:
              original.provider_transaction_id ?? null,
          },
        },
      });
    });

    return refund ? toPaymentTransactionRecord(refund) : undefined;
  }

  async findClaimQuotes(claimId: string): Promise<OrderingQuoteRecord[]> {
    const rows = await this.prisma.quotes.findMany({
      where: { claim_id: claimId, quote_type: 'SERVICE' },
      include: { quote_items: { orderBy: { created_at: 'asc' } } },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((q) => toQuoteRecord(q));
  }

  async findClaimQuoteById(
    claimId: string,
    quoteId: string,
  ): Promise<OrderingQuoteRecord | undefined> {
    const row = await this.prisma.quotes.findFirst({
      where: { id: quoteId, claim_id: claimId },
      include: { quote_items: { orderBy: { created_at: 'asc' } } },
    });
    return row ? toQuoteRecord(row) : undefined;
  }

  async acceptClaimQuote(params: {
    quoteId: string;
    customerIdentityId: string;
  }): Promise<OrderingQuoteRecord> {
    const updated = await this.prisma.quotes.update({
      where: { id: params.quoteId },
      data: {
        status: 'ACCEPTED',
        accepted_by_customer_identity_id: params.customerIdentityId,
        accepted_at: new Date(),
      },
      include: { quote_items: { orderBy: { created_at: 'asc' } } },
    });
    return toQuoteRecord(updated);
  }

  async createPaymentTransaction(params: {
    orderId?: string;
    claimId?: string;
    quoteId?: string;
    paymentStage: string;
    providerOrderCode: bigint;
    amount: number;
    currency?: string;
    expiresAt?: Date;
    metadata?: Record<string, unknown>;
  }): Promise<OrderingPaymentTransactionRecord> {
    const created = await this.prisma.payment_transactions.create({
      data: {
        order_id: params.orderId ?? null,
        claim_id: params.claimId ?? null,
        quote_id: params.quoteId ?? null,
        payment_stage: params.paymentStage,
        transaction_type: 'PAYMENT',
        payment_method: 'PAYOS',
        provider: 'PAYOS',
        provider_order_code: params.providerOrderCode,
        amount: new Prisma.Decimal(params.amount),
        currency: params.currency ?? 'VND',
        status: 'PENDING',
        expires_at: params.expiresAt ?? null,
        metadata_json: (params.metadata as Prisma.InputJsonValue) ?? {},
      },
    });
    return toPaymentTransactionRecord(created);
  }

  async findTransactionByOrderCode(
    orderCode: bigint,
  ): Promise<OrderingPaymentTransactionRecord | undefined> {
    const row = await this.prisma.payment_transactions.findFirst({
      where: { provider_order_code: orderCode },
      include: { orders: true, quotes: true },
    });
    return row ? toPaymentTransactionRecord(row) : undefined;
  }

  async markPaymentTransactionSucceeded(params: {
    transactionId: string;
    providerTransactionId?: string;
    providerReference?: string;
    completedAt?: Date;
    nextOrderStatus?: string;
  }): Promise<OrderingPaymentTransactionRecord> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedTx = await tx.payment_transactions.update({
        where: { id: params.transactionId },
        data: {
          status: 'SUCCEEDED',
          completed_at: params.completedAt ?? new Date(),
          provider_transaction_id: params.providerTransactionId ?? null,
          provider_reference: params.providerReference ?? null,
        },
        include: { orders: true, quotes: true },
      });

      if (updatedTx.order_id && params.nextOrderStatus) {
        await tx.orders.update({
          where: { id: updatedTx.order_id },
          data: { status: params.nextOrderStatus },
        });
      }

      return updatedTx;
    });

    return toPaymentTransactionRecord(updated);
  }
}
