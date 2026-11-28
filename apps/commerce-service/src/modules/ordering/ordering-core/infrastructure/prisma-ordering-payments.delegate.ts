import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import type { PrismaService } from '../../../../persistence/prisma/prisma.service';
import {
  findCertifiedGemstoneAssignments,
  setCertifiedGemstoneAssignments,
} from '../../../inventory/inventory-core/infrastructure/prisma-certified-gemstone-allocations';
import type {
  OrderingInvoiceRecord,
  OrderingPaymentTransactionRecord,
  OrderingRepository,
} from '../application/ordering.repository';
import { resolveOrderNextPayment } from '../application/ordering-state';
import {
  ORDER_WITH_RELATIONS_INCLUDE,
  toOrderDetailRecord,
  toOrderInvoiceRecord,
  toPaymentTransactionRecord,
} from './prisma-ordering.mappers';
import { lockCurrentServiceQuote } from './prisma-ordering-quotes.delegate';

export class PrismaOrderingPaymentsDelegate {
  constructor(private readonly prisma: PrismaService) {}

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
    const order = await this.prisma.orders.findFirst({
      where: {
        id: orderId,
        invoice_no: { not: null },
        invoice_issued_at: { not: null },
        invoice_asset_key: { not: null },
      },
      include: {
        quotes_orders_current_quote_idToquotes: {
          include: { quote_items: { orderBy: { created_at: 'asc' } } },
        },
        payment_transactions: {
          where: { status: 'SUCCEEDED', transaction_type: 'PAYMENT' },
          orderBy: { completed_at: 'asc' },
        },
      },
    });
    if (order?.quotes_orders_current_quote_idToquotes?.quote_type !== 'FINAL') {
      return undefined;
    }

    return toOrderInvoiceRecord(order);
  }

  async createRefundRequest(
    params: Parameters<OrderingRepository['createRefundRequest']>[0],
  ): Promise<OrderingPaymentTransactionRecord | undefined> {
    const amount = new Prisma.Decimal(params.refundAmount);
    if (!amount.isFinite() || !amount.gt(0) || amount.decimalPlaces() > 2) {
      throw new BadRequestException(
        'Refund amount must be positive with at most two decimal places',
      );
    }
    const refund = await this.prisma.$transaction(async (tx) => {
      // Use the same order-before-payment lock order as payment settlement.
      const [order] = await tx.$queryRaw<
        { id: string; status: string; current_quote_id: string | null }[]
      >`
        SELECT id, status, current_quote_id FROM ordering.orders WHERE id = (
          SELECT order_id FROM ordering.payment_transactions WHERE id = ${params.transactionId}::uuid
        ) FOR NO KEY UPDATE
      `;
      await tx.$queryRaw`
        SELECT id FROM ordering.payment_transactions
        WHERE id = ${params.transactionId}::uuid FOR NO KEY UPDATE
      `;

      const original = await tx.payment_transactions.findUnique({
        where: { id: params.transactionId },
      });
      if (!original) {
        return undefined;
      }
      if (
        original.transaction_type !== 'PAYMENT' ||
        original.status !== 'SUCCEEDED'
      ) {
        throw new BadRequestException(
          'Only successful payments can be refunded',
        );
      }
      if (!original.order_id || !order) {
        throw new BadRequestException(
          'This refund route requires an order payment',
        );
      }
      const handedOver =
        order.status === 'COMPLETED' || order.status === 'DELIVERED';
      const receipt = params.returnReceipt;
      if (handedOver && !receipt) {
        throw new ConflictException(
          'Refunding a handed-over order requires a verified ring return',
        );
      }
      if (
        receipt &&
        (!handedOver || receipt.orderId !== order.id || original.claim_id)
      ) {
        throw new ConflictException(
          'The return receipt does not match the handed-over order payment',
        );
      }

      const previousRefunds = await tx.payment_transactions.findMany({
        where: {
          related_transaction_id: original.id,
          transaction_type: 'REFUND',
          status: { in: ['PENDING', 'SUCCEEDED'] },
        },
        select: {
          amount: true,
          payment_item_allocations: { select: { allocated_amount: true } },
        },
      });
      const refundable = previousRefunds.reduce(
        (remaining, refund) => remaining.minus(refund.amount),
        original.amount,
      );
      if (amount.gt(refundable)) {
        throw new ConflictException(
          'Refund amount exceeds the remaining refundable payment amount',
        );
      }

      const allocations = receipt
        ? await this.prepareRingRefund(
            tx,
            receipt,
            order.current_quote_id,
            original.id,
            original.currency,
            amount,
            previousRefunds.reduce((total, refund) => {
              const unattributed = refund.payment_item_allocations.reduce(
                (remaining, allocation) =>
                  remaining.minus(allocation.allocated_amount),
                refund.amount,
              );
              return total.plus(Prisma.Decimal.max(0, unattributed));
            }, new Prisma.Decimal(0)),
          )
        : [];
      const refund = await tx.payment_transactions.create({
        data: {
          order_id: original.order_id,
          claim_id: receipt?.claimId,
          related_transaction_id: original.id,
          transaction_type: 'REFUND',
          payment_stage: original.payment_stage,
          payment_method: original.payment_method,
          provider: original.provider,
          amount,
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
      if (allocations.length) {
        await tx.payment_item_allocations.createMany({
          data: allocations.map((allocation) => ({
            ...allocation,
            payment_transaction_id: refund.id,
          })),
        });
      }
      return refund;
    });

    return refund ? toPaymentTransactionRecord(refund) : undefined;
  }

  private async prepareRingRefund(
    tx: Prisma.TransactionClient,
    receipt: NonNullable<
      Parameters<OrderingRepository['createRefundRequest']>[0]['returnReceipt']
    >,
    finalQuoteId: string | null,
    originalTransactionId: string,
    currency: string,
    amount: Prisma.Decimal,
    unattributedOriginalRefunds: Prisma.Decimal,
  ) {
    if (!finalQuoteId)
      throw new ConflictException('A locked Final Quote is required');
    const { orderId, ringItemId, claimId, receiptId } = receipt;
    const confirmation = await tx.final_confirmations.findFirst({
      where: {
        order_id: orderId,
        quote_id: finalQuoteId,
        status: 'ACTIVE',
        final_confirmation_items: { some: { ring_item_id: ringItemId } },
        quotes: {
          order_id: orderId,
          quote_type: 'FINAL',
          status: 'ACCEPTED',
          currency,
        },
      },
      select: { id: true },
    });
    const ring = await tx.ring_items.findFirst({
      where: { id: ringItemId, order_id: orderId },
      select: { id: true },
    });
    if (!confirmation || !ring) {
      throw new ConflictException(
        'The returned ring is not in the locked Final Quote',
      );
    }
    const lines = await tx.quote_items.findMany({
      where: { quote_id: finalQuoteId, ring_item_id: ringItemId },
      select: { id: true, line_amount: true },
    });
    const quoteAmount = lines.reduce(
      (sum, line) => sum.plus(line.line_amount),
      new Prisma.Decimal(0),
    );
    const previousRingRefunds = await tx.payment_item_allocations.aggregate({
      where: {
        ring_item_id: ringItemId,
        allocation_kind: 'RING_ITEM',
        payment_transactions: {
          order_id: orderId,
          transaction_type: 'REFUND',
          status: { in: ['PENDING', 'SUCCEEDED'] },
        },
      },
      _sum: { allocated_amount: true },
    });
    if (
      amount.gt(
        quoteAmount.minus(previousRingRefunds._sum.allocated_amount ?? 0),
      )
    ) {
      throw new ConflictException(
        'Refund exceeds the remaining locked quote amount for this ring',
      );
    }
    const originalAllocations = await tx.payment_item_allocations.findMany({
      where: {
        payment_transaction_id: originalTransactionId,
        ring_item_id: ringItemId,
        allocation_kind: 'RING_ITEM',
        original_allocation_id: null,
      },
      orderBy: { id: 'asc' },
      include: {
        other_payment_item_allocations: {
          where: {
            payment_transactions: {
              transaction_type: 'REFUND',
              status: { in: ['PENDING', 'SUCCEEDED'] },
            },
          },
          select: { allocated_amount: true },
        },
      },
    });

    let remaining = amount;
    let unattributed = unattributedOriginalRefunds;
    const allocations: Omit<
      Prisma.payment_item_allocationsCreateManyInput,
      'payment_transaction_id'
    >[] = [];
    for (const source of originalAllocations) {
      const available = Prisma.Decimal.max(
        0,
        source.other_payment_item_allocations.reduce(
          (net, refund) => net.minus(refund.allocated_amount),
          source.allocated_amount,
        ),
      );
      const unknownRefund = Prisma.Decimal.min(available, unattributed);
      unattributed = unattributed.minus(unknownRefund);
      const allocated = Prisma.Decimal.min(
        remaining,
        available.minus(unknownRefund),
      );
      if (allocated.gt(0)) {
        allocations.push({
          ring_item_id: ringItemId,
          original_allocation_id: source.id,
          allocated_amount: allocated,
          allocation_kind: 'RING_ITEM',
          basis_snapshot_json: {
            claimId,
            receiptId,
            finalQuoteId,
            confirmationId: confirmation.id,
            quoteLineIds: lines.map(({ id }) => id),
            quoteRingAmount: quoteAmount.toString(),
            originalPaymentBasis: source.basis_snapshot_json,
          },
        });
      }
      remaining = remaining.minus(allocated);
      if (remaining.isZero()) return allocations;
    }
    throw new ConflictException(
      'Refund exceeds the remaining paid allocation for this ring',
    );
  }

  async beginOrderPaymentAttempt(
    params: Parameters<OrderingRepository['beginOrderPaymentAttempt']>[0],
  ): ReturnType<OrderingRepository['beginOrderPaymentAttempt']> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM ordering.orders WHERE id = ${params.orderId}::uuid FOR UPDATE
      `;
      const order = await tx.orders.findUnique({
        where: { id: params.orderId },
        include: ORDER_WITH_RELATIONS_INCLUDE,
      });
      if (!order) throw new NotFoundException('Order not found');

      const payments = await tx.payment_transactions.findMany({
        where: { order_id: order.id },
        orderBy: { requested_at: 'desc' },
      });
      const now = new Date();
      const payment = resolveOrderNextPayment(
        toOrderDetailRecord(order),
        payments.map((row) => toPaymentTransactionRecord(row)),
        now,
      );
      if (
        !payment?.canPay ||
        (params.paymentStage && payment.stage !== params.paymentStage)
      ) {
        throw new BadRequestException(
          'No payment is due for the requested stage',
        );
      }
      const pending = payments.find(
        ({ id }) => id === payment.pendingAttempt?.transactionId,
      );
      if (pending) {
        return {
          transaction: toPaymentTransactionRecord(pending),
          created: false,
        };
      }

      const staleLinkIsStillOpen = payments.some(
        (row) =>
          row.provider === 'PAYOS' &&
          row.transaction_type === 'PAYMENT' &&
          row.status === 'PENDING' &&
          row.expires_at !== null &&
          row.expires_at > now,
      );
      if (staleLinkIsStillOpen) {
        throw new ConflictException('Hãy chờ link thanh toán trước hết hạn');
      }

      let holdExpiration = Infinity;
      if (payment.stage === 'DEPOSIT_P1') {
        const assignments = await findCertifiedGemstoneAssignments(
          tx,
          order.ring_items.flatMap(({ current_version_id }) =>
            current_version_id ? [current_version_id] : [],
          ),
        );
        const holds =
          assignments &&
          (await setCertifiedGemstoneAssignments(tx, assignments, 'HOLD'));
        if (!holds)
          throw new ConflictException(
            'One or more certified gemstones are no longer available',
          );
        holdExpiration = Math.min(
          ...holds.map(({ expires_at }) => expires_at?.getTime() ?? Infinity),
        );
      }

      const created = await tx.payment_transactions.create({
        data: {
          order_id: order.id,
          quote_id: order.current_quote_id,
          payment_stage: payment.stage,
          transaction_type: 'PAYMENT',
          payment_method: 'PAYOS',
          provider: 'PAYOS',
          provider_order_code: params.providerOrderCode,
          amount: new Prisma.Decimal(payment.amountDue),
          currency: payment.currency,
          expires_at: new Date(
            Math.min(
              now.getTime() + 15 * 60 * 1000,
              holdExpiration,
              payment.expiresAt ? Date.parse(payment.expiresAt) : Infinity,
            ),
          ),
          status: 'PENDING',
        },
      });
      return {
        transaction: toPaymentTransactionRecord(created),
        created: true,
      };
    });
  }

  async saveOrderPaymentLink(
    transactionId: string,
    metadata: Record<string, string>,
  ): Promise<OrderingPaymentTransactionRecord> {
    const updated = await this.prisma.payment_transactions.update({
      where: { id: transactionId },
      data: { metadata_json: metadata },
    });
    return toPaymentTransactionRecord(updated);
  }

  beginClaimPaymentAttempt(
    params: Parameters<OrderingRepository['beginClaimPaymentAttempt']>[0],
  ): ReturnType<OrderingRepository['beginClaimPaymentAttempt']> {
    return this.prisma.$transaction(async (tx) => {
      const quote = await lockCurrentServiceQuote(tx, params.claimId);
      if (quote?.status !== 'ACCEPTED') {
        throw new ConflictException(
          'An accepted current service quote is required',
        );
      }
      const payments = await tx.payment_transactions.findMany({
        where: {
          claim_id: params.claimId,
          transaction_type: 'PAYMENT',
          status: { in: ['PENDING', 'SUCCEEDED'] },
        },
        orderBy: [{ requested_at: 'asc' }, { id: 'asc' }],
      });
      const paid = payments.filter(({ status }) => status === 'SUCCEEDED');
      if (
        paid.some(
          (row) => row.quote_id !== quote.id || row.currency !== quote.currency,
        )
      ) {
        throw new ConflictException(
          'Previous service payments require reconciliation',
        );
      }
      const due = paid.reduce(
        (remaining, row) => remaining.minus(row.amount),
        quote.total_amount,
      );
      if (due.lte(0))
        throw new ConflictException('The service quote is already paid');
      if (quote.currency !== 'VND' || !Number.isSafeInteger(due.toNumber())) {
        throw new ConflictException(
          'The remaining service amount cannot be paid by PayOS',
        );
      }

      const open = payments.filter(({ status }) => status === 'PENDING');
      const pending = open[0];
      if (pending) {
        return {
          transaction: toPaymentTransactionRecord(pending),
          created: false,
          reusable:
            open.length === 1 &&
            pending.provider === 'PAYOS' &&
            pending.quote_id === quote.id &&
            pending.currency === quote.currency &&
            pending.amount.eq(due) &&
            pending.expires_at !== null &&
            pending.expires_at > new Date(),
          quoteNo: quote.quote_no,
        };
      }

      const row = await tx.payment_transactions.create({
        data: {
          claim_id: params.claimId,
          quote_id: quote.id,
          payment_stage: 'SERVICE_FEE',
          transaction_type: 'PAYMENT',
          payment_method: 'PAYOS',
          provider: 'PAYOS',
          provider_order_code: params.providerOrderCode,
          amount: due,
          currency: quote.currency,
          status: 'PENDING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      return {
        transaction: toPaymentTransactionRecord(row),
        created: true,
        reusable: true,
        quoteNo: quote.quote_no,
      };
    });
  }

  async closeClaimPaymentAttempt(
    transactionId: string,
    status: 'EXPIRED' | 'CANCELLED',
  ): Promise<void> {
    await this.prisma.payment_transactions.updateMany({
      where: {
        id: transactionId,
        status: 'PENDING',
        claim_id: { not: null },
        provider: 'PAYOS',
      },
      data: { status },
    });
  }

  async findTransactionByOrderCode(
    orderCode: bigint,
  ): Promise<OrderingPaymentTransactionRecord | undefined> {
    const row = await this.prisma.payment_transactions.findFirst({
      where: { provider: 'PAYOS', provider_order_code: orderCode },
      include: { orders: true, quotes: true },
    });
    return row ? toPaymentTransactionRecord(row) : undefined;
  }

  async markPaymentTransactionSucceeded(
    params: Parameters<
      OrderingRepository['markPaymentTransactionSucceeded']
    >[0],
  ): ReturnType<OrderingRepository['markPaymentTransactionSucceeded']> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.payment_transactions.findUnique({
        where: { id: params.transactionId },
      });
      if (!existing)
        throw new NotFoundException('Payment transaction not found');

      if (existing.order_id) {
        await tx.$queryRaw`
          SELECT id FROM ordering.orders WHERE id = ${existing.order_id}::uuid FOR UPDATE
        `;
      }

      const updated = await tx.payment_transactions.updateMany({
        where: {
          id: params.transactionId,
          provider: 'PAYOS',
          transaction_type: 'PAYMENT',
          status: 'PENDING',
        },
        data: {
          status: 'SUCCEEDED',
          completed_at: params.completedAt,
          provider_transaction_id: params.providerTransactionId,
          provider_reference: params.providerReference,
        },
      });
      const payment = await tx.payment_transactions.findUniqueOrThrow({
        where: { id: params.transactionId },
        include: { orders: true, quotes: true },
      });

      if (
        payment.status === 'SUCCEEDED' &&
        payment.order_id &&
        payment.payment_stage === 'DEPOSIT_P1'
      ) {
        await this.advancePaidDeposit(tx, payment.order_id);
      }

      return {
        transaction: toPaymentTransactionRecord(payment),
        applied: updated.count === 1,
      };
    });
  }

  private async advancePaidDeposit(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<void> {
    const order = await tx.orders.findUnique({
      where: { id: orderId },
      include: ORDER_WITH_RELATIONS_INCLUDE,
    });
    if (!order || order.status !== 'AWAITING_P1') return;

    const payments = await tx.payment_transactions.findMany({
      where: { order_id: orderId },
    });
    const nextPayment = resolveOrderNextPayment(
      toOrderDetailRecord(order),
      payments.map((row) => toPaymentTransactionRecord(row)),
    );
    if (nextPayment?.stage !== 'DEPOSIT_P1' || nextPayment.amountDue !== 0)
      return;

    const assignments = await findCertifiedGemstoneAssignments(
      tx,
      order.ring_items.flatMap(({ current_version_id }) =>
        current_version_id ? [current_version_id] : [],
      ),
    );
    if (
      !assignments ||
      !(await setCertifiedGemstoneAssignments(tx, assignments, 'RESERVED'))
    )
      return;

    await tx.orders.updateMany({
      where: { id: orderId, status: 'AWAITING_P1' },
      data: { status: 'DESIGN_IN_PROGRESS' },
    });
  }
}
