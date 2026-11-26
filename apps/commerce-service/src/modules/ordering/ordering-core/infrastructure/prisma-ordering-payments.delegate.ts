import { Prisma } from '../../../../../generated/prisma/client';
import type { PrismaService } from '../../../../persistence/prisma/prisma.service';
import type {
  OrderingInvoiceRecord,
  OrderingPaymentTransactionRecord,
} from '../application/ordering.repository';
import {
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
