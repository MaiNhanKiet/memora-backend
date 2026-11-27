import { Injectable } from '@nestjs/common';
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
import { PrismaOrderingOrdersDelegate } from './prisma-ordering-orders.delegate';
import { PrismaOrderingPaymentsDelegate } from './prisma-ordering-payments.delegate';
import { PrismaOrderingQuotesDelegate } from './prisma-ordering-quotes.delegate';
import { PrismaOrderingRingItemsDelegate } from './prisma-ordering-ring-items.delegate';

@Injectable()
export class PrismaOrderingRepository implements OrderingRepository {
  private readonly orders: PrismaOrderingOrdersDelegate;
  private readonly ringItems: PrismaOrderingRingItemsDelegate;
  private readonly quotes: PrismaOrderingQuotesDelegate;
  private readonly payments: PrismaOrderingPaymentsDelegate;

  constructor(prisma: PrismaService) {
    this.orders = new PrismaOrderingOrdersDelegate(prisma);
    this.ringItems = new PrismaOrderingRingItemsDelegate(prisma);
    this.quotes = new PrismaOrderingQuotesDelegate(prisma);
    this.payments = new PrismaOrderingPaymentsDelegate(prisma);
  }

  findDraftsByIds(draftIds: readonly string[]): Promise<OrderingDraftRecord[]> {
    return this.orders.findDraftsByIds(draftIds);
  }

  createOrderTransaction(
    params: CreateOrderTransactionInput,
  ): Promise<CreateOrderTransactionResult> {
    return this.orders.createOrderTransaction(params);
  }

  listOrders(
    actorId: string,
    guestEmail?: string,
    status?: string,
    skip = 0,
    take = 20,
  ): Promise<{ items: OrderingListItemRecord[]; total: number }> {
    return this.orders.listOrders(actorId, guestEmail, status, skip, take);
  }

  findOrderById(
    orderId: string,
    actorId: string,
    guestEmail?: string,
  ): Promise<OrderingDetailRecord | undefined> {
    return this.orders.findOrderById(orderId, actorId, guestEmail);
  }

  findRingItemWithDetails(
    orderId: string,
    ringItemId: string,
    actorId: string,
    guestEmail?: string,
  ): Promise<OrderingRingItemDetailRecord | undefined> {
    return this.ringItems.findRingItemWithDetails(
      orderId,
      ringItemId,
      actorId,
      guestEmail,
    );
  }

  listAdminOrders(params: {
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
    return this.orders.listAdminOrders(params);
  }

  findAdminOrderById(
    orderId: string,
  ): Promise<OrderingDetailRecord | undefined> {
    return this.orders.findAdminOrderById(orderId);
  }

  updateOrderStatus(params: {
    orderId: string;
    targetStatus: string;
    reason?: string;
  }): Promise<{
    id: string;
    orderNo: string;
    status: string;
    updatedAt: Date;
  }> {
    return this.orders.updateOrderStatus(params);
  }

  listRingItemVersions(
    orderId: string,
    ringItemId: string,
    actorId: string,
    guestEmail?: string,
  ): Promise<OrderingRingItemVersionRecord[] | undefined> {
    return this.ringItems.listRingItemVersions(
      orderId,
      ringItemId,
      actorId,
      guestEmail,
    );
  }

  findCurrentRingItemVersion(
    orderId: string,
    ringItemId: string,
    actorId: string,
    guestEmail?: string,
  ): Promise<{ id: string; status: string } | undefined> {
    return this.ringItems.findCurrentRingItemVersion(
      orderId,
      ringItemId,
      actorId,
      guestEmail,
    );
  }

  updateCurrentRingItemVersion(
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
    return this.ringItems.updateCurrentRingItemVersion(versionId, data);
  }

  listOrderQuotes(
    orderId: string,
    actorId: string,
    guestEmail?: string,
  ): Promise<OrderingQuoteRecord[] | undefined> {
    return this.quotes.listOrderQuotes(orderId, actorId, guestEmail);
  }

  findOrderPersonalizationContext(
    orderId: string,
  ): Promise<OrderingPersonalizationContextRecord | undefined> {
    return this.orders.findOrderPersonalizationContext(orderId);
  }

  cancelOrder(
    orderId: string,
    reason?: string,
  ): Promise<{
    id: string;
    status: string;
    cancelledAt?: Date;
    cancellationReason?: string;
  }> {
    return this.orders.cancelOrder(orderId, reason);
  }

  createFinalQuote(params: {
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
    return this.quotes.createFinalQuote(params);
  }

  findQuoteById(
    orderId: string,
    quoteId: string,
  ): Promise<OrderingQuoteRecord | undefined> {
    return this.quotes.findQuoteById(orderId, quoteId);
  }

  updateFinalQuote(params: {
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
    return this.quotes.updateFinalQuote(params);
  }

  publishFinalQuote(
    orderId: string,
    quoteId: string,
  ): Promise<OrderingQuoteRecord> {
    return this.quotes.publishFinalQuote(orderId, quoteId);
  }

  confirmFinalQuote(
    orderId: string,
    quoteId: string,
    customerIdentityId: string,
    nextOrderStatus: string,
  ): Promise<OrderingFinalConfirmationRecord> {
    return this.quotes.confirmFinalQuote(
      orderId,
      quoteId,
      customerIdentityId,
      nextOrderStatus,
    );
  }

  rejectFinalQuote(orderId: string, quoteId: string): Promise<void> {
    return this.quotes.rejectFinalQuote(orderId, quoteId);
  }

  findFinalConfirmations(
    orderId: string,
  ): Promise<OrderingFinalConfirmationRecord[]> {
    return this.quotes.findFinalConfirmations(orderId);
  }

  findOrderPayments(
    orderId: string,
  ): Promise<OrderingPaymentTransactionRecord[]> {
    return this.payments.findOrderPayments(orderId);
  }

  findOrderPaymentById(
    orderId: string,
    transactionId: string,
  ): Promise<OrderingPaymentTransactionRecord | undefined> {
    return this.payments.findOrderPaymentById(orderId, transactionId);
  }

  findPaymentTransactionById(
    transactionId: string,
  ): Promise<OrderingPaymentTransactionRecord | undefined> {
    return this.payments.findPaymentTransactionById(transactionId);
  }

  findPaymentReceipt(
    orderId: string,
    transactionId: string,
  ): Promise<OrderingPaymentTransactionRecord | undefined> {
    return this.payments.findPaymentReceipt(orderId, transactionId);
  }

  findOrderInvoice(
    orderId: string,
  ): Promise<OrderingInvoiceRecord | undefined> {
    return this.payments.findOrderInvoice(orderId);
  }

  createRefundRequest(params: {
    transactionId: string;
    refundAmount: number;
    reason: string;
    notes?: string;
    staffUserId?: string;
  }): Promise<OrderingPaymentTransactionRecord | undefined> {
    return this.payments.createRefundRequest(params);
  }

  findClaimQuotes(claimId: string): Promise<OrderingQuoteRecord[]> {
    return this.quotes.findClaimQuotes(claimId);
  }

  findClaimQuoteById(
    claimId: string,
    quoteId: string,
  ): Promise<OrderingQuoteRecord | undefined> {
    return this.quotes.findClaimQuoteById(claimId, quoteId);
  }

  acceptClaimQuote(params: {
    quoteId: string;
    customerIdentityId: string;
  }): Promise<OrderingQuoteRecord> {
    return this.quotes.acceptClaimQuote(params);
  }

  createPaymentTransaction(params: {
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
    return this.payments.createPaymentTransaction(params);
  }

  beginOrderPaymentAttempt(
    params: Parameters<OrderingRepository['beginOrderPaymentAttempt']>[0],
  ): ReturnType<OrderingRepository['beginOrderPaymentAttempt']> {
    return this.payments.beginOrderPaymentAttempt(params);
  }

  saveOrderPaymentLink(
    transactionId: string,
    metadata: Record<string, string>,
  ): Promise<OrderingPaymentTransactionRecord> {
    return this.payments.saveOrderPaymentLink(transactionId, metadata);
  }

  findTransactionByOrderCode(
    orderCode: bigint,
  ): Promise<OrderingPaymentTransactionRecord | undefined> {
    return this.payments.findTransactionByOrderCode(orderCode);
  }

  markPaymentTransactionSucceeded(params: {
    transactionId: string;
    providerTransactionId?: string;
    providerReference?: string;
    completedAt: Date;
  }): ReturnType<OrderingRepository['markPaymentTransactionSucceeded']> {
    return this.payments.markPaymentTransactionSucceeded(params);
  }
}
