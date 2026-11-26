import { Prisma } from '../../../../../generated/prisma/client';
import type { PrismaService } from '../../../../persistence/prisma/prisma.service';
import type {
  OrderingFinalConfirmationRecord,
  OrderingQuoteRecord,
} from '../application/ordering.repository';
import { toQuoteRecord } from './prisma-ordering.mappers';

export class PrismaOrderingQuotesDelegate {
  constructor(private readonly prisma: PrismaService) {}

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

        const confirmationItems = items.flatMap((r) =>
          r.current_version_id
            ? [
                {
                  ring_item_id: r.id,
                  ring_item_version_id: r.current_version_id,
                },
              ]
            : [],
        );

        const created = await tx.final_confirmations.create({
          data: {
            order_id: orderId,
            quote_id: quoteId,
            confirmed_by_customer_identity_id: customerIdentityId,
            status: 'ACTIVE',
            confirmed_at: new Date(),
            final_confirmation_items: {
              create: confirmationItems,
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

  async rejectFinalQuote(orderId: string, quoteId: string): Promise<void> {
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
}
