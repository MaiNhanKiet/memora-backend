import type { RingItemSummary } from '@app/contracts';

export const ORDERING_REPOSITORY = Symbol('ORDERING_REPOSITORY');

export interface RingItemReviewTransitionInput {
  readonly orderId: string;
  readonly ringItemId: string;
  readonly ringItemVersionId: string;
  readonly from: 'DRAFT' | 'READY_FOR_REVIEW' | 'SUBMITTED';
  readonly to: 'READY_FOR_REVIEW' | 'SUBMITTED' | 'MANAGER_APPROVED';
}

export interface OrderingDraftRecord {
  readonly id: string;
  readonly cartId?: string;
  readonly ownerUserId?: string;
  readonly guestSessionId?: string;
  readonly cartOwnerUserId?: string;
  readonly cartGuestSessionId?: string;
  readonly templateVariantId: string;
  readonly templateCode: string;
  readonly templateName: string;
  readonly materialName: string;
  readonly targetSize: number;
  readonly personalizationPackage: string;
  readonly memoryEnabled: boolean;
  readonly gemstoneConfigJson: unknown;
  readonly estimatedPrice: number;
  readonly updatedAt: Date;
}

export interface CreateOrderTransactionInput {
  readonly ownerCustomerIdentityId: string;
  readonly guestEmail?: string;
  readonly guestPhone?: string;
  readonly createdFromCartId?: string;
  readonly status: string;
  readonly sourcePlanMode: string;
  readonly preP1NoticeVersion?: string;
  readonly privacyNoticeAcknowledgedAt?: Date;
  readonly p1NonrefundAcknowledgedAt?: Date;
  readonly preP1EvidenceJson?: Record<string, unknown>;
  readonly fulfillmentMode: string;
  readonly recipientName: string;
  readonly recipientPhone: string;
  readonly recipientEmail: string;
  readonly deliveryAddressJson: Record<string, unknown>;
  readonly selectedDrafts: readonly OrderingDraftRecord[];
}

export interface CreateOrderTransactionResult {
  readonly orderId: string;
  readonly orderNo: string;
  readonly status: string;
  readonly sourcePlanMode: string;
  readonly createdAt: Date;
  readonly itemsCount: number;
  readonly totalAmount: number;
  readonly items: RingItemSummary[];
}

export interface OrderingQuoteSummaryRecord {
  readonly id: string;
  readonly quoteNo: string;
  readonly quoteType: string;
  readonly subtotalAmount: number;
  readonly deliveryAmount: number;
  readonly adjustmentAmount: number;
  readonly totalAmount: number;
  readonly currency: string;
  readonly status: string;
  readonly validUntil?: Date;
}

export interface OrderingListItemRecord {
  readonly id: string;
  readonly orderNo: string;
  readonly status: string;
  readonly sourcePlanMode: string;
  readonly ownerCustomerIdentityId: string;
  readonly recipientName?: string;
  readonly recipientPhone?: string;
  readonly recipientEmail?: string;
  readonly ringItemsCount: number;
  readonly currentQuote?: OrderingQuoteSummaryRecord;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface OrderingRingItemRecord {
  readonly id: string;
  readonly itemNo: number;
  readonly sourceRingDesignDraftId: string;
  readonly currentVersionId?: string;
  readonly versionNo: number;
  readonly templateVariantId: string;
  readonly templateCode: string;
  readonly templateName: string;
  readonly materialName: string;
  readonly targetSize: number;
  readonly personalizationPackage: string;
  readonly memoryEnabled: boolean;
}

export interface OrderingDetailRecord {
  readonly id: string;
  readonly orderNo: string;
  readonly status: string;
  readonly sourcePlanMode: string;
  readonly fulfillmentMode?: string;
  readonly ownerCustomerIdentityId: string;
  readonly guestEmail?: string;
  readonly guestPhone?: string;
  readonly guestEmailVerifiedAt?: Date;
  readonly recipientName?: string;
  readonly recipientPhone?: string;
  readonly recipientEmail?: string;
  readonly deliveryAddressJson?: unknown;
  readonly preP1EvidenceJson?: unknown;
  readonly privacyNoticeAcknowledgedAt?: Date;
  readonly cancelledAt?: Date;
  readonly cancellationReason?: string;
  readonly currentQuoteId?: string;
  readonly currentQuote?: OrderingQuoteSummaryRecord;
  readonly ringItems: readonly OrderingRingItemRecord[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface OrderingGemstoneDetailRecord {
  readonly slotNumber: number;
  readonly gemstoneSlotId: string;
  readonly gemstoneOptionId: string;
  readonly gemstoneType: string;
  readonly gemstoneName: string;
  readonly shape: string;
  readonly caratWeight: number;
  readonly color: string;
  readonly clarity: string;
}

export interface OrderingRingItemDetailRecord extends OrderingRingItemRecord {
  readonly orderId: string;
  readonly maintenancePlan?: string;
  readonly gemstones: readonly OrderingGemstoneDetailRecord[];
  readonly createdAt: Date;
}

export interface OrderingRingItemVersionRecord {
  readonly id: string;
  readonly versionNo: number;
  readonly status: string;
  readonly targetSize: number;
  readonly personalizationPackage: string;
  readonly memoryEnabled: boolean;
  readonly changeReason?: string;
  readonly templateVariantId: string;
  readonly templateCode: string;
  readonly templateName: string;
  readonly materialName: string;
  readonly gemstones: readonly OrderingGemstoneDetailRecord[];
  readonly createdAt: Date;
}

export interface OrderingQuoteItemRecord {
  readonly id: string;
  readonly ringItemId?: string;
  readonly componentType: string;
  readonly description?: string;
  readonly quantity: number;
  readonly unitAmount: number;
  readonly lineAmount: number;
  readonly priceSourceType: string;
}

export interface OrderingQuoteRecord {
  readonly id: string;
  readonly quoteNo: string;
  readonly quoteType: string;
  readonly versionNo: number;
  readonly status: string;
  readonly subtotalAmount: number;
  readonly deliveryAmount: number;
  readonly adjustmentAmount: number;
  readonly totalAmount: number;
  readonly currency: string;
  readonly createdAt: Date;
  readonly validUntil?: Date;
  readonly issuedAt?: Date;
  readonly acceptedAt?: Date;
  readonly items: readonly OrderingQuoteItemRecord[];
}

export interface OrderingPersonalizationContextRecord {
  readonly id: string;
  readonly ownerCustomerIdentityId: string;
  readonly status: string;
  readonly sourcePlanMode: string;
  readonly p1Paid: boolean;
  readonly ringItems: readonly {
    readonly ringItemId: string;
    readonly itemNo: number;
    readonly currentVersionId: string;
    readonly personalizationPackage: string;
    readonly versionStatus: string;
  }[];
}

export interface OrderingFinalConfirmationRecord {
  readonly id: string;
  readonly orderId: string;
  readonly quoteId: string;
  readonly quoteNo: string;
  readonly quoteTotalAmount: number;
  readonly confirmedByCustomerIdentityId: string;
  readonly status: string;
  readonly confirmedAt: Date;
  readonly invalidatedAt?: Date;
  readonly invalidationReason?: string;
  readonly items: readonly {
    readonly id: string;
    readonly ringItemId: string;
    readonly ringItemVersionId: string;
    readonly versionNo: number;
  }[];
}

export interface OrderingPaymentTransactionRecord {
  readonly id: string;
  readonly quoteId?: string;
  readonly orderId?: string;
  readonly orderNo?: string;
  readonly orderStatus?: string;
  readonly recipientName?: string;
  readonly paymentStage: string;
  readonly transactionType: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: string;
  readonly provider?: string;
  readonly paymentMethod?: string;
  readonly providerOrderCode?: bigint;
  readonly providerTransactionId?: string;
  readonly providerReference?: string;
  readonly relatedTransactionId?: string;
  readonly requestedAt: Date;
  readonly completedAt?: Date;
  readonly failedAt?: Date;
  readonly failureReason?: string;
  readonly expiresAt?: Date;
  readonly receiptNo?: string;
  readonly receiptIssuedAt?: Date;
  readonly metadataJson?: unknown;
}

export interface OrderingInvoiceRecord {
  readonly id: string;
  readonly orderNo: string;
  readonly status: string;
  readonly invoiceNo?: string;
  readonly invoiceIssuedAt?: Date;
  readonly recipientName?: string;
  readonly recipientPhone?: string;
  readonly deliveryAddressJson?: unknown;
  readonly quoteCurrency?: string;
  readonly quoteTotalAmount: number;
  readonly quoteItems: readonly OrderingQuoteItemRecord[];
  readonly paymentTransactions: readonly {
    readonly paymentStage: string;
    readonly amount: number;
    readonly requestedAt: Date;
    readonly completedAt?: Date;
    readonly receiptNo?: string;
  }[];
}

export interface OrderingRepository {
  findDraftsByIds(draftIds: readonly string[]): Promise<OrderingDraftRecord[]>;
  createOrderTransaction(
    params: CreateOrderTransactionInput,
  ): Promise<CreateOrderTransactionResult>;
  listOrders(
    actorId: string,
    guestSessionId?: string,
    status?: string,
    skip?: number,
    take?: number,
  ): Promise<{ items: OrderingListItemRecord[]; total: number }>;
  findOrderById(
    orderId: string,
    actorId: string,
    guestSessionId?: string,
  ): Promise<OrderingDetailRecord | undefined>;
  findRingItemWithDetails(
    orderId: string,
    ringItemId: string,
    actorId: string,
    guestSessionId?: string,
  ): Promise<OrderingRingItemDetailRecord | undefined>;
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
  }>;
  findAdminOrderById(
    orderId: string,
  ): Promise<OrderingDetailRecord | undefined>;
  updateOrderStatus(params: {
    orderId: string;
    targetStatus: string;
    reason?: string;
  }): Promise<{ id: string; orderNo: string; status: string; updatedAt: Date }>;
  listRingItemVersions(
    orderId: string,
    ringItemId: string,
    actorId: string,
    guestSessionId?: string,
  ): Promise<OrderingRingItemVersionRecord[] | undefined>;
  findCurrentRingItemVersion(
    orderId: string,
    ringItemId: string,
    actorId: string,
    guestSessionId?: string,
  ): Promise<
    | {
        id: string;
        status: string;
      }
    | undefined
  >;
  applyRingItemReviewTransition(
    input: RingItemReviewTransitionInput,
  ): Promise<{ ringItemVersionId: string; status: string }>;
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
  }>;
  listOrderQuotes(
    orderId: string,
    actorId: string,
    guestSessionId?: string,
  ): Promise<OrderingQuoteRecord[] | undefined>;
  findOrderPersonalizationContext(
    orderId: string,
  ): Promise<OrderingPersonalizationContextRecord | undefined>;
  cancelOrder(
    orderId: string,
    reason?: string,
  ): Promise<{
    id: string;
    status: string;
    cancelledAt?: Date;
    cancellationReason?: string;
  }>;
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
  }): Promise<OrderingQuoteRecord | undefined>;
  findQuoteById(
    orderId: string,
    quoteId: string,
  ): Promise<OrderingQuoteRecord | undefined>;
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
  }): Promise<OrderingQuoteRecord>;
  publishFinalQuote(
    orderId: string,
    quoteId: string,
  ): Promise<OrderingQuoteRecord>;
  confirmFinalQuote(
    orderId: string,
    quoteId: string,
    actorId: string,
  ): Promise<OrderingFinalConfirmationRecord & { nextOrderStatus: string }>;
  rejectFinalQuote(
    orderId: string,
    quoteId: string,
    reason?: string,
  ): Promise<string>;
  findFinalConfirmations(
    orderId: string,
  ): Promise<OrderingFinalConfirmationRecord[]>;
  findOrderPayments(
    orderId: string,
  ): Promise<OrderingPaymentTransactionRecord[]>;
  findOrderPaymentById(
    orderId: string,
    transactionId: string,
  ): Promise<OrderingPaymentTransactionRecord | undefined>;
  findPaymentTransactionById(
    transactionId: string,
  ): Promise<OrderingPaymentTransactionRecord | undefined>;
  findPaymentReceipt(
    orderId: string,
    transactionId: string,
  ): Promise<OrderingPaymentTransactionRecord | undefined>;
  findOrderInvoice(orderId: string): Promise<OrderingInvoiceRecord | undefined>;
  createRefundRequest(params: {
    transactionId: string;
    refundAmount: number;
    reason: string;
    notes?: string;
    staffUserId?: string;
  }): Promise<OrderingPaymentTransactionRecord | undefined>;
  findClaimQuotes(claimId: string): Promise<OrderingQuoteRecord[]>;
  findClaimQuoteById(
    claimId: string,
    quoteId: string,
  ): Promise<OrderingQuoteRecord | undefined>;
  acceptClaimQuote(params: {
    quoteId: string;
    customerIdentityId: string;
  }): Promise<OrderingQuoteRecord>;
  createPaymentTransaction(params: {
    orderId?: string;
    claimId?: string;
    quoteId?: string;
    paymentStage: string;
    providerOrderCode: bigint;
    amount: number;
    currency: string;
    expiresAt: Date;
    metadata: Record<string, unknown>;
  }): Promise<OrderingPaymentTransactionRecord>;
  beginOrderPaymentAttempt(params: {
    orderId: string;
    paymentStage?: string;
    providerOrderCode: bigint;
  }): Promise<{
    transaction: OrderingPaymentTransactionRecord;
    created: boolean;
  }>;
  saveOrderPaymentLink(
    transactionId: string,
    metadata: Record<string, string>,
  ): Promise<OrderingPaymentTransactionRecord>;
  findTransactionByOrderCode(
    orderCode: bigint,
  ): Promise<OrderingPaymentTransactionRecord | undefined>;
  markPaymentTransactionSucceeded(params: {
    transactionId: string;
    providerTransactionId?: string;
    providerReference?: string;
    completedAt: Date;
  }): Promise<{
    transaction: OrderingPaymentTransactionRecord;
    applied: boolean;
  }>;
}
