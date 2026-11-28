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

  async createRefundRequest(params: {
    transactionId: string;
    refundAmount: number;
    reason: string;
    notes?: string;
    staffUserId?: string;
  }): Promise<OrderingPaymentTransactionRecord | undefined> {
    const amount = new Prisma.Decimal(params.refundAmount);
    if (!amount.isFinite() || !amount.gt(0) || amount.decimalPlaces() > 2) {
      throw new BadRequestException(
        'Refund amount must be positive with at most two decimal places',
      );
    }
    const refund = await this.prisma.$transaction(async (tx) => {
      // Use the same order-before-payment lock order as payment settlement.
      const [order] = await tx.$queryRaw<{ status: string }[]>`
        SELECT status FROM ordering.orders WHERE id = (
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
      if (order.status === 'COMPLETED' || order.status === 'DELIVERED') {
        throw new ConflictException(
          'Refunding a handed-over order requires a verified ring return',
        );
      }

      const reserved = await tx.payment_transactions.aggregate({
        where: {
          related_transaction_id: original.id,
          transaction_type: 'REFUND',
          status: { in: ['PENDING', 'SUCCEEDED'] },
        },
        _sum: { amount: true },
      });
      const refundable = original.amount.minus(reserved._sum.amount ?? 0);
      if (amount.gt(refundable)) {
        throw new ConflictException(
          'Refund amount exceeds the remaining refundable payment amount',
        );
      }

      return tx.payment_transactions.create({
        data: {
          order_id: original.order_id,
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
    });

    return refund ? toPaymentTransactionRecord(refund) : undefined;
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
