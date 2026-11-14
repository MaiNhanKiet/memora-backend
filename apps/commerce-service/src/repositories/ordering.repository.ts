import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { orders, ring_items, quotes } from '../../generated/prisma/client';
import { PrismaService } from '../persistence/prisma/prisma.service';

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
      for (const draft of params.selectedDrafts) {
        // Create Ring Item
        const ringItem = await tx.ring_items.create({
          data: {
            order_id: order.id,
            item_no: itemNumber,
            source_ring_design_draft_id: draft.id,
          },
        });

        // Create Ring Item Version V1
        const ringItemVersion = await tx.ring_item_versions.create({
          data: {
            ring_item_id: ringItem.id,
            version_no: 1,
            template_variant_id: draft.template_variant_id,
            target_size: draft.target_size,
            personalization_package: draft.personalization_package,
            memory_enabled: draft.memory_enabled,
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
        if (
          Array.isArray(draft.gemstone_config_json) &&
          draft.gemstone_config_json.length > 0
        ) {
          const slots = await tx.gemstone_slots.findMany({
            where: {
              gemstone_groups: {
                ring_template_id: draft.template_variants.ring_template_id,
              },
            },
            orderBy: { slot_index: 'asc' },
          });

          for (const item of draft.gemstone_config_json as Array<{
            slotNumber?: number;
            slot_number?: number;
            gemstoneOptionId?: string;
            gemstone_option_id?: string;
          }>) {
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
        const unitPrice = draft.estimated_price ?? new Prisma.Decimal(0);
        await tx.quote_items.create({
          data: {
            quote_id: quote.id,
            ring_item_id: ringItem.id,
            component_type: 'RING_ITEM',
            description: `${draft.template_variants.ring_templates.name} - ${draft.template_variants.materials.name}`,
            quantity: new Prisma.Decimal(1),
            unit_amount: unitPrice,
            line_amount: unitPrice,
            price_source_type: 'CATALOG_ESTIMATE',
          },
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
}
