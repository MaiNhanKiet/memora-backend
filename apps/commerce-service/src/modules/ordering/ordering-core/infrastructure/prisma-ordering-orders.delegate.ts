import type { RingItemSummary } from '@app/contracts';
import { Prisma } from '../../../../../generated/prisma/client';
import type { PrismaService } from '../../../../persistence/prisma/prisma.service';
import type {
  CreateOrderTransactionInput,
  CreateOrderTransactionResult,
  OrderingDetailRecord,
  OrderingDraftRecord,
  OrderingListItemRecord,
  OrderingPersonalizationContextRecord,
} from '../application/ordering.repository';
import {
  ORDER_WITH_RELATIONS_INCLUDE,
  toOrderDetailRecord,
  toOrderListItemRecord,
} from './prisma-ordering.mappers';

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
}
