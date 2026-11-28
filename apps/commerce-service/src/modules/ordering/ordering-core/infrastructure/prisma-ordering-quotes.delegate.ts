import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import type { PrismaService } from '../../../../persistence/prisma/prisma.service';
import {
  findCertifiedGemstoneAssignments,
  setCertifiedGemstoneAssignments,
} from '../../../inventory/inventory-core/infrastructure/prisma-certified-gemstone-allocations';
import type {
  OrderingFinalConfirmationRecord,
  OrderingQuoteRecord,
} from '../application/ordering.repository';
import {
  resolveFinalQuotePreparationStatus,
  resolveFinalQuoteVersions,
} from '../application/ordering-state';
import { toQuoteRecord } from './prisma-ordering.mappers';

async function lockQuoteOrder(tx: Prisma.TransactionClient, orderId: string) {
  await tx.$queryRaw`SELECT id FROM ordering.orders WHERE id = ${orderId}::uuid FOR UPDATE`;
  return tx.orders.findUnique({
    where: { id: orderId },
    select: {
      order_no: true,
      status: true,
      current_quote_id: true,
      owner_customer_identity_id: true,
    },
  });
}

async function lockQuoteRingItems(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  await tx.$queryRaw`
    SELECT id FROM ordering.ring_items WHERE order_id = ${orderId}::uuid
    ORDER BY id FOR NO KEY UPDATE
  `;
  await tx.$queryRaw`
    SELECT version.id
    FROM ordering.ring_item_versions AS version
    JOIN ordering.ring_items AS item ON item.current_version_id = version.id
    WHERE item.order_id = ${orderId}::uuid
    ORDER BY version.id FOR NO KEY UPDATE OF version
  `;
  const rows = await tx.ring_items.findMany({
    where: { order_id: orderId },
    select: {
      id: true,
      current_version_id: true,
      ring_item_versions_ring_items_current_version_idToring_item_versions: {
        select: {
          id: true,
          ring_item_id: true,
          status: true,
          version_no: true,
          personalization_package: true,
        },
      },
    },
  });

  return rows.map((item) => {
    const version =
      item.ring_item_versions_ring_items_current_version_idToring_item_versions;
    return {
      id: item.id,
      currentVersionId: item.current_version_id,
      version: version && {
        id: version.id,
        ringItemId: version.ring_item_id,
        status: version.status,
        versionNo: version.version_no,
        personalizationPackage: version.personalization_package,
      },
    };
  });
}

function assertQuoteLinesBelongToOrder(
  versions: Record<string, string>,
  lines: readonly { ringItemId?: string }[],
): void {
  if (
    lines.some(
      ({ ringItemId }) => ringItemId && !versions[ringItemId.toLowerCase()],
    )
  ) {
    throw new BadRequestException(
      'A final quote line refers to a ring item from another order',
    );
  }
}

async function assertFinalQuoteSnapshotMatches(
  tx: Prisma.TransactionClient,
  quoteId: string,
  versions: Record<string, string>,
): Promise<void> {
  const line = await tx.quote_items.findFirst({
    where: { quote_id: quoteId },
    orderBy: { id: 'asc' },
    select: { metadata_json: true },
  });
  const metadata = line?.metadata_json;
  const snapshot =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? metadata.finalQuoteRingItemVersions
      : undefined;
  if (
    !snapshot ||
    typeof snapshot !== 'object' ||
    Array.isArray(snapshot) ||
    Object.keys(snapshot).length !== Object.keys(versions).length ||
    Object.entries(versions).some(
      ([itemId, versionId]) => snapshot[itemId] !== versionId,
    )
  ) {
    throw new ConflictException(
      'The final quote does not match the current ring item versions. Create a new final quote.',
    );
  }
}

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
      const order = await lockQuoteOrder(tx, params.orderId);
      if (!order) {
        return undefined;
      }

      const versions = resolveFinalQuoteVersions(
        order.status,
        'prepare',
        await lockQuoteRingItems(tx, params.orderId),
      );
      assertQuoteLinesBelongToOrder(versions, params.items);

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
              // Every line carries the order snapshot so order-level lines work too.
              metadata_json: { finalQuoteRingItemVersions: versions },
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
      const order = await lockQuoteOrder(tx, params.orderId);
      const existing = await tx.quotes.findFirst({
        where: {
          id: params.quoteId,
          order_id: params.orderId,
          quote_type: 'FINAL',
          status: 'DRAFT',
        },
        select: { id: true },
      });
      if (!order || !existing) {
        throw new ConflictException('The final quote can no longer be edited');
      }

      const versions = resolveFinalQuoteVersions(
        order.status,
        'prepare',
        await lockQuoteRingItems(tx, params.orderId),
      );
      await assertFinalQuoteSnapshotMatches(tx, params.quoteId, versions);
      assertQuoteLinesBelongToOrder(versions, params.items ?? []);
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
            metadata_json: { finalQuoteRingItemVersions: versions },
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
      const order = await lockQuoteOrder(tx, orderId);
      const existing = await tx.quotes.findFirst({
        where: {
          id: quoteId,
          order_id: orderId,
          quote_type: 'FINAL',
          status: 'DRAFT',
        },
      });
      if (!order || !existing) {
        throw new ConflictException(
          'The final quote can no longer be published',
        );
      }
      const versions = resolveFinalQuoteVersions(
        order.status,
        'prepare',
        await lockQuoteRingItems(tx, orderId),
      );
      await assertFinalQuoteSnapshotMatches(tx, quoteId, versions);
      const validUntil =
        existing.valid_until ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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
          status: 'AWAITING_FINAL_CONFIRMATION',
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
  ): Promise<OrderingFinalConfirmationRecord & { nextOrderStatus: string }> {
    const { confirmation, ringItems, nextOrderStatus } =
      await this.prisma.$transaction(async (tx) => {
        const order = await lockQuoteOrder(tx, orderId);
        if (
          order?.status !== 'AWAITING_FINAL_CONFIRMATION' ||
          order.current_quote_id !== quoteId ||
          order.owner_customer_identity_id !== customerIdentityId
        ) {
          throw new ConflictException(
            'This quote is no longer the active final quote',
          );
        }
        const items = await lockQuoteRingItems(tx, orderId);
        const versions = resolveFinalQuoteVersions(
          order.status,
          'confirm',
          items,
        );
        await assertFinalQuoteSnapshotMatches(tx, quoteId, versions);

        const accepted = await tx.quotes.updateMany({
          where: {
            id: quoteId,
            order_id: orderId,
            quote_type: 'FINAL',
            status: 'ISSUED',
            OR: [{ valid_until: null }, { valid_until: { gt: new Date() } }],
          },
          data: {
            status: 'ACCEPTED',
            accepted_by_customer_identity_id: customerIdentityId,
            accepted_at: new Date(),
          },
        });
        if (accepted.count !== 1)
          throw new ConflictException(
            'The final quote can no longer be accepted',
          );

        await tx.final_confirmations.updateMany({
          where: { order_id: orderId, status: 'ACTIVE' },
          data: {
            status: 'INVALIDATED',
            invalidated_at: new Date(),
            invalidation_reason: 'Superseded by new confirmation',
          },
        });

        const confirmationItems = items.flatMap((r) =>
          r.currentVersionId
            ? [
                {
                  ring_item_id: r.id,
                  ring_item_version_id: r.currentVersionId,
                },
              ]
            : [],
        );

        if (!items.length || confirmationItems.length !== items.length) {
          throw new ConflictException(
            'An order item is missing its current version',
          );
        }

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

        const allNone =
          resolveFinalQuotePreparationStatus(items) === 'PENDING_FINAL_QUOTE';
        if (allNone) {
          const assignments = await findCertifiedGemstoneAssignments(
            tx,
            confirmationItems.map(
              ({ ring_item_version_id }) => ring_item_version_id,
            ),
          );
          if (
            !assignments ||
            !(await setCertifiedGemstoneAssignments(
              tx,
              assignments,
              'RESERVED',
            ))
          ) {
            throw new ConflictException(
              'One or more certified gemstones are no longer available for this quote',
            );
          }
        }

        const nextOrderStatus = allNone
          ? 'AWAITING_FINAL_CONFIRMATION'
          : 'AWAITING_P2';
        await tx.orders.update({
          where: { id: orderId },
          data: { status: nextOrderStatus },
        });

        return { confirmation: created, ringItems: items, nextOrderStatus };
      });

    return {
      id: confirmation.id,
      orderId: confirmation.order_id,
      quoteId: confirmation.quote_id,
      nextOrderStatus,
      quoteNo: '',
      quoteTotalAmount: 0,
      confirmedByCustomerIdentityId:
        confirmation.confirmed_by_customer_identity_id,
      status: confirmation.status,
      confirmedAt: confirmation.confirmed_at,
      items: confirmation.final_confirmation_items.map((i) => {
        const item = ringItems.find((r) => r.id === i.ring_item_id);
        const ver = item?.version;
        return {
          id: i.id,
          ringItemId: i.ring_item_id,
          ringItemVersionId: i.ring_item_version_id,
          versionNo: ver?.versionNo ?? 1,
        };
      }),
    };
  }

  async rejectFinalQuote(orderId: string, quoteId: string): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const order = await lockQuoteOrder(tx, orderId);
      if (
        order?.status !== 'AWAITING_FINAL_CONFIRMATION' ||
        order.current_quote_id !== quoteId
      ) {
        throw new ConflictException(
          'This quote is no longer the active final quote',
        );
      }

      const rejected = await tx.quotes.updateMany({
        where: {
          id: quoteId,
          order_id: orderId,
          quote_type: 'FINAL',
          status: 'ISSUED',
        },
        data: { status: 'REJECTED' },
      });
      if (rejected.count !== 1)
        throw new ConflictException(
          'The final quote can no longer be rejected',
        );

      const status = resolveFinalQuotePreparationStatus(
        await lockQuoteRingItems(tx, orderId),
      );
      await tx.orders.update({
        where: { id: orderId },
        data: { status },
      });
      return status;
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
    claimId: string;
    quoteId: string;
    customerIdentityId: string;
  }): Promise<OrderingQuoteRecord> {
    return this.prisma.$transaction(async (tx) => {
      const quote = await lockCurrentServiceQuote(tx, params.claimId);
      if (!quote || quote.id !== params.quoteId) {
        throw new ConflictException('The service quote is no longer current');
      }
      if (quote.status === 'ACCEPTED') return toQuoteRecord(quote);
      const now = new Date();
      if (
        quote.status !== 'ISSUED' ||
        (quote.valid_until && quote.valid_until <= now)
      ) {
        throw new ConflictException(
          'The service quote can no longer be accepted',
        );
      }
      const updated = await tx.quotes.update({
        where: { id: quote.id },
        data: {
          status: 'ACCEPTED',
          accepted_by_customer_identity_id: params.customerIdentityId,
          accepted_at: now,
        },
        include: { quote_items: { orderBy: { created_at: 'asc' } } },
      });
      return toQuoteRecord(updated);
    });
  }
}

export async function lockCurrentServiceQuote(
  tx: Prisma.TransactionClient,
  claimId: string,
) {
  await tx.$queryRaw`
    SELECT 1 FROM pg_advisory_xact_lock(
      hashtextextended('claim-payment:' || ${claimId}::uuid::text, 0)
    )
  `;
  return tx.quotes.findFirst({
    where: {
      claim_id: claimId,
      quote_type: 'SERVICE',
      status: { not: 'DRAFT' },
    },
    orderBy: [{ version_no: 'desc' }, { created_at: 'desc' }, { id: 'desc' }],
    include: { quote_items: { orderBy: { created_at: 'asc' } } },
  });
}
