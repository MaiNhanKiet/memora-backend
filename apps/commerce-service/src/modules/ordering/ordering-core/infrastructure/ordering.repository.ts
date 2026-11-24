import { Injectable } from '@nestjs/common';
import type { RingItemSummary } from '@app/contracts';
import { Prisma } from '../../../../../generated/prisma/client';
import type {
  orders,
  ring_items,
  quotes,
} from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';

export interface CreateOrderParams {
  ownerCustomerIdentityId: string;
  guestEmail?: string;
  guestPhone?: string;
  createdFromCartId?: string;
  status: string;
  sourcePlanMode: string;
  preP1NoticeVersion?: string;
  privacyNoticeAcknowledgedAt?: Date;
  p1NonrefundAcknowledgedAt?: Date;
  preP1EvidenceJson?: Prisma.InputJsonValue;
  fulfillmentMode: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  deliveryAddressJson: Prisma.InputJsonValue;
  selectedDrafts: Array<{
    id: string;
    cart_id: string | null;
    template_variant_id: string;
    target_size: Prisma.Decimal;
    personalization_package: string;
    memory_enabled: boolean;
    gemstone_config_json: Prisma.JsonValue;
    estimated_price: Prisma.Decimal | null;
    template_variants: {
      ring_template_id: string;
      materials: { name: string };
      ring_templates: { code: string; name: string };
    };
  }>;
}

export type OrderWithRelations = orders & {
  quotes_orders_current_quote_idToquotes: quotes | null;
  ring_items: (ring_items & {
    ring_item_versions_ring_items_current_version_idToring_item_versions: {
      id: string;
      version_no: number;
      target_size: Prisma.Decimal;
      personalization_package: string;
      memory_enabled: boolean;
      template_variants: {
        id: string;
        materials: { name: string };
        ring_templates: { code: string; name: string };
      };
    } | null;
  })[];
};

@Injectable()
export class OrderingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findDraftsByIds(draftIds: string[]) {
    return this.prisma.ring_design_drafts.findMany({
      where: {
        id: { in: draftIds },
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
  }

  async findGemstoneSlotsByTemplateId(ringTemplateId: string) {
    return this.prisma.gemstone_slots.findMany({
      where: {
        gemstone_groups: {
          ring_template_id: ringTemplateId,
        },
      },
      orderBy: { slot_index: 'asc' },
    });
  }

  async createOrderTransaction(params: CreateOrderParams) {
    const timestamp = Date.now();
    const randomSuffix = Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase();
    const orderNo = `ORD-${timestamp}-${randomSuffix}`;
    const quoteNo = `QUO-${timestamp}-${randomSuffix}`;

    return this.prisma.$transaction(async (tx) => {
      // 1. Calculate subtotal and total
      let subtotal = new Prisma.Decimal(0);
      for (const draft of params.selectedDrafts) {
        if (draft.estimated_price) {
          subtotal = subtotal.add(draft.estimated_price);
        }
      }
      const totalAmount = subtotal;

      // 2. Create Order
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
          pre_p1_evidence_json: params.preP1EvidenceJson ?? Prisma.JsonNull,
          fulfillment_mode: params.fulfillmentMode,
          recipient_name: params.recipientName,
          recipient_phone: params.recipientPhone,
          recipient_email: params.recipientEmail,
          delivery_address_json: params.deliveryAddressJson,
        },
      });

      // 3. Create Provisional Quote
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

      // 4. Create Ring Items, Versions, Gemstones and Quote Items
      let itemNumber = 1;
      const createdItems: RingItemSummary[] = [];
      for (const draft of params.selectedDrafts) {
        // Create Ring Item
        const ringItem = await tx.ring_items.create({
          data: {
            order_id: order.id,
            item_no: itemNumber,
            source_ring_design_draft_id: draft.id,
          },
        });

        // Extract maintenance plan & gemstone selections from draft.gemstone_config_json
        const draftConfig = draft.gemstone_config_json as
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

        // Create Ring Item Version V1
        const ringItemVersion = await tx.ring_item_versions.create({
          data: {
            ring_item_id: ringItem.id,
            version_no: 1,
            template_variant_id: draft.template_variant_id,
            target_size: draft.target_size,
            personalization_package: draft.personalization_package,
            memory_enabled: draft.memory_enabled,
            preview_snapshot_json: maintenancePlan
              ? { maintenancePlan }
              : Prisma.JsonNull,
            status: 'DRAFT',
            change_reason: 'INITIAL_SNAPSHOT',
            created_by_customer_identity_id: params.ownerCustomerIdentityId,
          },
        });

        // Update Ring Item current_version_id
        await tx.ring_items.update({
          where: { id: ringItem.id },
          data: { current_version_id: ringItemVersion.id },
        });

        // Map gemstone selections to ring_item_version_gemstones
        if (rawSelections.length > 0) {
          const slots = await tx.gemstone_slots.findMany({
            where: {
              gemstone_groups: {
                ring_template_id: draft.template_variants.ring_template_id,
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

        // Create Quote Item for this Ring Item
        const totalDraftPrice = draft.estimated_price
          ? Number(draft.estimated_price)
          : 0;
        const maintenanceAmount =
          maintenancePlan === 'LIFETIME_POLISHING' ? 500000 : 0;
        const ringBlankAmount = Math.max(
          0,
          totalDraftPrice - maintenanceAmount,
        );

        await tx.quote_items.create({
          data: {
            quote_id: quote.id,
            ring_item_id: ringItem.id,
            component_type: 'RING_BLANK',
            description: `${draft.template_variants.ring_templates.name} - ${draft.template_variants.materials.name}`,
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
          templateVariantId: draft.template_variant_id,
          templateCode: draft.template_variants.ring_templates.code,
          templateName: draft.template_variants.ring_templates.name,
          materialName: draft.template_variants.materials.name,
          targetSize: Number(draft.target_size),
          personalizationPackage: draft.personalization_package,
          memoryEnabled: draft.memory_enabled,
        });

        itemNumber++;
      }

      // 5. Update Order current_quote_id
      const updatedOrder = await tx.orders.update({
        where: { id: order.id },
        data: { current_quote_id: quote.id },
      });

      // 6. Convert selected drafts: status -> CONVERTED, cart_id -> null
      const draftIds = params.selectedDrafts.map((d) => d.id);
      await tx.ring_design_drafts.updateMany({
        where: { id: { in: draftIds } },
        data: {
          status: 'CONVERTED',
          cart_id: null,
          updated_at: new Date(),
        },
      });

      return {
        order: updatedOrder,
        quote,
        itemsCount: params.selectedDrafts.length,
        totalAmount,
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
  ) {
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

    return { items, total };
  }

  async findOrderById(
    orderId: string,
    actorId: string,
    guestEmail?: string,
  ): Promise<OrderWithRelations | null> {
    const where: Prisma.ordersWhereInput = {
      id: orderId,
      OR: [
        { owner_customer_identity_id: actorId },
        ...(guestEmail ? [{ guest_email: guestEmail }] : []),
      ],
    };

    return this.prisma.orders.findFirst({
      where,
      include: {
        quotes_orders_current_quote_idToquotes: true,
        ring_items: {
          orderBy: { item_no: 'asc' },
          include: {
            ring_item_versions_ring_items_current_version_idToring_item_versions:
              {
                include: {
                  template_variants: {
                    include: {
                      materials: { select: { name: true } },
                      ring_templates: { select: { code: true, name: true } },
                    },
                  },
                },
              },
          },
        },
      },
    });
  }

  async findRingItemWithDetails(
    orderId: string,
    ringItemId: string,
    actorId: string,
    guestEmail?: string,
  ) {
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
      return null;
    }

    return this.prisma.ring_items.findFirst({
      where: {
        id: ringItemId,
        order_id: orderId,
      },
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
  }

  // ---------------------------------------------------------------------------
  // Admin Operations
  // ---------------------------------------------------------------------------

  async listAdminOrders(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
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

    return { items, total, page, limit };
  }

  async findAdminOrderById(
    orderId: string,
  ): Promise<OrderWithRelations | null> {
    return this.prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        quotes_orders_current_quote_idToquotes: true,
        ring_items: {
          orderBy: { item_no: 'asc' },
          include: {
            ring_item_versions_ring_items_current_version_idToring_item_versions:
              {
                include: {
                  template_variants: {
                    include: {
                      materials: { select: { name: true } },
                      ring_templates: { select: { code: true, name: true } },
                    },
                  },
                },
              },
          },
        },
      },
    });
  }

  async updateOrderStatus(params: {
    orderId: string;
    targetStatus: string;
    reason?: string;
  }) {
    const data: Prisma.ordersUpdateInput = {
      status: params.targetStatus,
      updated_at: new Date(),
    };

    if (params.targetStatus === 'CANCELLED') {
      data.cancelled_at = new Date();
      data.cancellation_reason = params.reason || 'Admin cancelled';
    }

    return this.prisma.orders.update({
      where: { id: params.orderId },
      data,
    });
  }

  // ---------------------------------------------------------------------------
  // Ring Item Versions & Quotes
  // ---------------------------------------------------------------------------

  async listRingItemVersions(
    orderId: string,
    ringItemId: string,
    actorId: string,
    guestEmail?: string,
  ) {
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
      return null;
    }

    const ringItem = await this.prisma.ring_items.findFirst({
      where: { id: ringItemId, order_id: orderId },
    });

    if (!ringItem) {
      return null;
    }

    return this.prisma.ring_item_versions.findMany({
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
  }

  async findCurrentRingItemVersion(
    orderId: string,
    ringItemId: string,
    actorId: string,
    guestEmail?: string,
  ) {
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
      return null;
    }

    const ringItem = await this.prisma.ring_items.findFirst({
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

    if (!ringItem || !ringItem.current_version_id) {
      return null;
    }

    return ringItem.ring_item_versions_ring_items_current_version_idToring_item_versions;
  }

  async updateCurrentRingItemVersion(
    versionId: string,
    data: {
      targetSize?: number;
      changeReason?: string;
      memoryEnabled?: boolean;
    },
  ) {
    const updateData: Prisma.ring_item_versionsUpdateInput = {};

    if (data.targetSize !== undefined) {
      updateData.target_size = new Prisma.Decimal(data.targetSize);
    }
    if (data.changeReason !== undefined) {
      updateData.change_reason = data.changeReason;
    }
    if (data.memoryEnabled !== undefined) {
      updateData.memory_enabled = data.memoryEnabled;
    }

    return this.prisma.ring_item_versions.update({
      where: { id: versionId },
      data: updateData,
    });
  }

  async listOrderQuotes(orderId: string, actorId: string, guestEmail?: string) {
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
      return null;
    }

    return this.prisma.quotes.findMany({
      where: { order_id: orderId },
      orderBy: { version_no: 'desc' },
      include: {
        quote_items: {
          orderBy: { created_at: 'asc' },
        },
      },
    });
  }

  async findOrderPersonalizationContext(orderId: string) {
    return this.prisma.orders.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        order_no: true,
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
                  version_no: true,
                  personalization_package: true,
                  status: true,
                },
              },
          },
        },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-005] Cancel Order & Release Allocations
  // ---------------------------------------------------------------------------
  async cancelOrder(orderId: string, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
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
  }

  // ---------------------------------------------------------------------------
  // [ORDER-011] Create Final Quote
  // ---------------------------------------------------------------------------
  async createFinalQuote(params: {
    orderId: string;
    subtotalAmount?: number;
    deliveryAmount?: number;
    adjustmentAmount?: number;
    totalAmount: number;
    currency?: string;
    validUntil?: string;
    staffUserId?: string;
    items: Array<{
      ringItemId?: string;
      componentType: string;
      description?: string;
      quantity?: number;
      unitAmount: number;
      lineAmount: number;
      priceSourceType?: string;
    }>;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.orders.findUnique({
        where: { id: params.orderId },
        select: { id: true, order_no: true },
      });
      if (!order) {
        return null;
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
        include: {
          quote_items: {
            orderBy: { created_at: 'asc' },
          },
        },
      });
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-013 Part B] Find Quote By ID
  // ---------------------------------------------------------------------------
  async findQuoteById(orderId: string, quoteId: string) {
    return this.prisma.quotes.findFirst({
      where: { id: quoteId, order_id: orderId },
      include: {
        quote_items: {
          orderBy: { created_at: 'asc' },
        },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-012] Update Final Quote (DRAFT only)
  // ---------------------------------------------------------------------------
  async updateFinalQuote(params: {
    orderId: string;
    quoteId: string;
    subtotalAmount?: number;
    deliveryAmount?: number;
    adjustmentAmount?: number;
    totalAmount?: number;
    validUntil?: string;
    staffUserId?: string;
    items?: Array<{
      id?: string;
      ringItemId?: string;
      componentType: string;
      description?: string;
      quantity?: number;
      unitAmount: number;
      lineAmount: number;
      priceSourceType?: string;
    }>;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.quotesUpdateInput = {};
      if (params.subtotalAmount !== undefined) {
        updateData.subtotal_amount = new Prisma.Decimal(params.subtotalAmount);
      }
      if (params.deliveryAmount !== undefined) {
        updateData.delivery_amount = new Prisma.Decimal(params.deliveryAmount);
      }
      if (params.adjustmentAmount !== undefined) {
        updateData.adjustment_amount = new Prisma.Decimal(
          params.adjustmentAmount,
        );
      }
      if (params.totalAmount !== undefined) {
        updateData.total_amount = new Prisma.Decimal(params.totalAmount);
      }
      if (params.validUntil !== undefined) {
        updateData.valid_until = new Date(params.validUntil);
      }

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
        include: {
          quote_items: {
            orderBy: { created_at: 'asc' },
          },
        },
      });
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-013 Part A] Publish Final Quote
  // ---------------------------------------------------------------------------
  async publishFinalQuote(orderId: string, quoteId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.quotes.findUnique({
        where: { id: quoteId },
      });
      const validUntil =
        existing?.valid_until ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const quote = await tx.quotes.update({
        where: { id: quoteId },
        data: {
          status: 'ISSUED',
          issued_at: new Date(),
          valid_until: validUntil,
        },
        include: {
          quote_items: {
            orderBy: { created_at: 'asc' },
          },
        },
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
  }

  // ---------------------------------------------------------------------------
  // [ORDER-014] Customer Confirm Final Quote
  // ---------------------------------------------------------------------------
  async confirmFinalQuote(
    orderId: string,
    quoteId: string,
    customerIdentityId: string,
    nextOrderStatus: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Invalidate any existing active confirmations for this order
      await tx.final_confirmations.updateMany({
        where: { order_id: orderId, status: 'ACTIVE' },
        data: {
          status: 'INVALIDATED',
          invalidated_at: new Date(),
          invalidation_reason: 'Superseded by new confirmation',
        },
      });

      // 2. Query all ring items for current versions
      const ringItems = await tx.ring_items.findMany({
        where: { order_id: orderId },
        select: {
          id: true,
          current_version_id: true,
          ring_item_versions_ring_items_current_version_idToring_item_versions:
            {
              select: { version_no: true },
            },
        },
      });

      // 3. Create final confirmation record
      const confirmation = await tx.final_confirmations.create({
        data: {
          order_id: orderId,
          quote_id: quoteId,
          confirmed_by_customer_identity_id: customerIdentityId,
          status: 'ACTIVE',
          confirmed_at: new Date(),
          final_confirmation_items: {
            create: ringItems
              .filter((r) => r.current_version_id)
              .map((r) => ({
                ring_item_id: r.id,
                ring_item_version_id: r.current_version_id!,
              })),
          },
        },
        include: {
          final_confirmation_items: true,
        },
      });

      // 4. Update quote
      await tx.quotes.update({
        where: { id: quoteId },
        data: {
          status: 'ACCEPTED',
          accepted_by_customer_identity_id: customerIdentityId,
          accepted_at: new Date(),
        },
      });

      // 5. Advance order status
      await tx.orders.update({
        where: { id: orderId },
        data: { status: nextOrderStatus },
      });

      return { confirmation, ringItems };
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-015 Part B] Customer Reject Final Quote
  // ---------------------------------------------------------------------------
  async rejectFinalQuote(orderId: string, quoteId: string, _reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.quotes.update({
        where: { id: quoteId },
        data: { status: 'REJECTED' },
      });

      return tx.orders.update({
        where: { id: orderId },
        data: { status: 'PENDING_FINAL_QUOTE' },
      });
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-015 Part A] List Final Confirmations
  // ---------------------------------------------------------------------------
  async findFinalConfirmations(orderId: string) {
    return this.prisma.final_confirmations.findMany({
      where: { order_id: orderId },
      orderBy: { confirmed_at: 'desc' },
      include: {
        quotes: true,
        final_confirmation_items: {
          include: {
            ring_item_versions: true,
          },
        },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-017] List Order Payments
  // ---------------------------------------------------------------------------
  async findOrderPayments(orderId: string) {
    return this.prisma.payment_transactions.findMany({
      where: { order_id: orderId },
      orderBy: { requested_at: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-018] Get Payment Transaction by ID
  // ---------------------------------------------------------------------------
  async findOrderPaymentById(orderId: string, transactionId: string) {
    return this.prisma.payment_transactions.findFirst({
      where: { id: transactionId, order_id: orderId },
    });
  }

  async findPaymentTransactionById(transactionId: string) {
    return this.prisma.payment_transactions.findUnique({
      where: { id: transactionId },
      include: {
        orders: true,
        quotes: true,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-021] Get Payment Receipt
  // ---------------------------------------------------------------------------
  async findPaymentReceipt(orderId: string, transactionId: string) {
    const tx = await this.prisma.payment_transactions.findFirst({
      where: { id: transactionId, order_id: orderId },
      include: {
        orders: {
          select: {
            order_no: true,
            recipient_name: true,
          },
        },
      },
    });

    if (!tx) {
      return null;
    }

    // Auto-generate immutable receipt_no if not assigned yet
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

    return tx;
  }

  // ---------------------------------------------------------------------------
  // [ORDER-022] Get Order Invoice
  // ---------------------------------------------------------------------------
  async findOrderInvoice(orderId: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        quotes_orders_current_quote_idToquotes: {
          include: {
            quote_items: {
              orderBy: { created_at: 'asc' },
            },
          },
        },
        payment_transactions: {
          where: { status: 'SUCCEEDED' },
          orderBy: { completed_at: 'asc' },
        },
      },
    });

    if (!order) {
      return null;
    }

    // Auto-generate invoice_no if not assigned yet
    if (!order.invoice_no) {
      const invoiceNo = `INV-${order.order_no}`;
      const now = new Date();

      await this.prisma.orders.update({
        where: { id: order.id },
        data: {
          invoice_no: invoiceNo,
          invoice_issued_at: now,
        },
      });

      order.invoice_no = invoiceNo;
      order.invoice_issued_at = now;
    }

    return order;
  }

  // ---------------------------------------------------------------------------
  // [ORDER-023] Create Refund Request
  // ---------------------------------------------------------------------------
  async createRefundRequest(params: {
    transactionId: string;
    refundAmount: number;
    reason: string;
    notes?: string;
    staffUserId?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.payment_transactions.findUnique({
        where: { id: params.transactionId },
      });

      if (!original) {
        return null;
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
  }

  // ---------------------------------------------------------------------------
  // [ORDER-024] Find Claim Quotes (quote_type = 'SERVICE')
  // ---------------------------------------------------------------------------
  async findClaimQuotes(claimId: string) {
    return this.prisma.quotes.findMany({
      where: {
        claim_id: claimId,
        quote_type: 'SERVICE',
      },
      include: {
        quote_items: {
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-025] Accept Service Quote
  // ---------------------------------------------------------------------------
  async findClaimQuoteById(claimId: string, quoteId: string) {
    return this.prisma.quotes.findFirst({
      where: {
        id: quoteId,
        claim_id: claimId,
      },
      include: {
        quote_items: {
          orderBy: { created_at: 'asc' },
        },
      },
    });
  }

  async acceptClaimQuote(params: {
    quoteId: string;
    customerIdentityId: string;
  }) {
    return this.prisma.quotes.update({
      where: { id: params.quoteId },
      data: {
        status: 'ACCEPTED',
        accepted_by_customer_identity_id: params.customerIdentityId,
        accepted_at: new Date(),
      },
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-016 & ORDER-026] Create Payment Transaction for PayOS
  // ---------------------------------------------------------------------------
  async createPaymentTransaction(params: {
    orderId?: string;
    claimId?: string;
    quoteId?: string;
    paymentStage: string;
    providerOrderCode: bigint;
    amount: number;
    currency?: string;
    expiresAt?: Date;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.payment_transactions.create({
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
        metadata_json: params.metadata ?? {},
      },
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-019 & ORDER-020] Find and Complete Transaction by Provider Order Code
  // ---------------------------------------------------------------------------
  async findTransactionByOrderCode(orderCode: bigint) {
    return this.prisma.payment_transactions.findFirst({
      where: { provider_order_code: orderCode },
      include: {
        orders: true,
        quotes: true,
      },
    });
  }

  async markPaymentTransactionSucceeded(params: {
    transactionId: string;
    providerTransactionId?: string;
    providerReference?: string;
    completedAt?: Date;
    nextOrderStatus?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const updatedTx = await tx.payment_transactions.update({
        where: { id: params.transactionId },
        data: {
          status: 'SUCCEEDED',
          completed_at: params.completedAt ?? new Date(),
          provider_transaction_id: params.providerTransactionId ?? null,
          provider_reference: params.providerReference ?? null,
        },
        include: {
          orders: true,
          quotes: true,
        },
      });

      if (updatedTx.order_id && params.nextOrderStatus) {
        await tx.orders.update({
          where: { id: updatedTx.order_id },
          data: { status: params.nextOrderStatus },
        });
      }

      return updatedTx;
    });
  }
}
