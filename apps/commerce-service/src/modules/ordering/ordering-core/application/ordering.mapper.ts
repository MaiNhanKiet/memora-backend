import type {
  AdminOrderSummaryItem,
  FullQuoteDetail,
  GetAdminOrderDetailsResponse,
  GetOrderByIdResponse,
  GetRingItemDetailsResponse,
  OrderInvoiceDetail,
  OrderSummaryItem,
  PaymentReceiptDetail,
  PaymentTransactionDetail,
  RingItemSummary,
  RingItemVersionSummary,
} from '@app/contracts';
import type {
  OrderingDetailRecord,
  OrderingInvoiceRecord,
  OrderingListItemRecord,
  OrderingPaymentTransactionRecord,
  OrderingQuoteRecord,
  OrderingRingItemDetailRecord,
  OrderingRingItemRecord,
  OrderingRingItemVersionRecord,
} from './ordering.repository';

function mapRingItemSummary(item: OrderingRingItemRecord): RingItemSummary {
  return {
    id: item.id,
    itemNo: item.itemNo,
    sourceRingDesignDraftId: item.sourceRingDesignDraftId,
    currentVersionId: item.currentVersionId || '',
    versionNo: item.versionNo,
    templateVariantId: item.templateVariantId,
    templateCode: item.templateCode,
    templateName: item.templateName,
    materialName: item.materialName,
    targetSize: item.targetSize,
    personalizationPackage: item.personalizationPackage,
    memoryEnabled: item.memoryEnabled,
  };
}

export function mapOrderSummary(o: OrderingListItemRecord): OrderSummaryItem {
  return {
    id: o.id,
    orderNo: o.orderNo,
    status: o.status,
    sourcePlanMode: o.sourcePlanMode,
    itemsCount: o.ringItemsCount,
    totalAmount: o.currentQuote?.totalAmount ?? 0,
    currency: o.currentQuote?.currency || 'VND',
    recipientName: o.recipientName,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

export function mapAdminOrderSummary(
  o: OrderingListItemRecord,
): AdminOrderSummaryItem {
  return {
    id: o.id,
    orderNo: o.orderNo,
    status: o.status,
    sourcePlanMode: o.sourcePlanMode,
    ownerCustomerIdentityId: o.ownerCustomerIdentityId,
    recipientName: o.recipientName,
    recipientPhone: o.recipientPhone,
    recipientEmail: o.recipientEmail,
    itemsCount: o.ringItemsCount,
    totalAmount: o.currentQuote?.totalAmount ?? 0,
    currency: o.currentQuote?.currency || 'VND',
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

export function mapOrderDetail(
  order: OrderingDetailRecord,
): GetOrderByIdResponse {
  return {
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    sourcePlanMode: order.sourcePlanMode,
    fulfillmentMode: order.fulfillmentMode || 'DELIVERY',
    recipientName: order.recipientName || '',
    recipientPhone: order.recipientPhone || '',
    recipientEmail: order.recipientEmail || '',
    deliveryAddressJson: order.deliveryAddressJson
      ? JSON.stringify(order.deliveryAddressJson)
      : '{}',
    currentQuote: order.currentQuote
      ? {
          quoteId: order.currentQuote.id,
          quoteNo: order.currentQuote.quoteNo,
          quoteType: order.currentQuote.quoteType,
          subtotalAmount: order.currentQuote.subtotalAmount,
          deliveryAmount: order.currentQuote.deliveryAmount,
          adjustmentAmount: order.currentQuote.adjustmentAmount,
          totalAmount: order.currentQuote.totalAmount,
          currency: order.currentQuote.currency,
          status: order.currentQuote.status,
        }
      : undefined,
    items: order.ringItems.map((i) => mapRingItemSummary(i)),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function mapAdminOrderDetail(
  order: OrderingDetailRecord,
): GetAdminOrderDetailsResponse {
  return {
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    sourcePlanMode: order.sourcePlanMode,
    fulfillmentMode: order.fulfillmentMode,
    customer: {
      customerIdentityId: order.ownerCustomerIdentityId,
      guestEmail: order.guestEmail,
      guestPhone: order.guestPhone,
      guestEmailVerifiedAt: order.guestEmailVerifiedAt?.toISOString(),
    },
    recipientName: order.recipientName,
    recipientPhone: order.recipientPhone,
    recipientEmail: order.recipientEmail,
    deliveryAddressJson: order.deliveryAddressJson
      ? JSON.stringify(order.deliveryAddressJson)
      : undefined,
    preP1EvidenceJson: order.preP1EvidenceJson
      ? JSON.stringify(order.preP1EvidenceJson)
      : undefined,
    currentQuote: order.currentQuote
      ? {
          quoteId: order.currentQuote.id,
          quoteNo: order.currentQuote.quoteNo,
          quoteType: order.currentQuote.quoteType,
          subtotalAmount: order.currentQuote.subtotalAmount,
          deliveryAmount: order.currentQuote.deliveryAmount,
          adjustmentAmount: order.currentQuote.adjustmentAmount,
          totalAmount: order.currentQuote.totalAmount,
          currency: order.currentQuote.currency,
          status: order.currentQuote.status,
        }
      : undefined,
    items: order.ringItems.map((i) => mapRingItemSummary(i)),
    cancelledAt: order.cancelledAt?.toISOString(),
    cancellationReason: order.cancellationReason,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function mapRingItemDetail(
  item: OrderingRingItemDetailRecord,
): GetRingItemDetailsResponse {
  return {
    id: item.id,
    orderId: item.orderId,
    itemNo: item.itemNo,
    sourceRingDesignDraftId: item.sourceRingDesignDraftId,
    currentVersionId: item.currentVersionId || '',
    versionNo: item.versionNo,
    templateVariantId: item.templateVariantId,
    templateCode: item.templateCode,
    templateName: item.templateName,
    materialName: item.materialName,
    targetSize: item.targetSize,
    personalizationPackage: item.personalizationPackage,
    memoryEnabled: item.memoryEnabled,
    maintenancePlan: item.maintenancePlan,
    gemstones: [...item.gemstones],
    createdAt: item.createdAt.toISOString(),
  };
}

export function mapRingItemVersion(
  ver: OrderingRingItemVersionRecord,
): RingItemVersionSummary {
  return {
    id: ver.id,
    versionNo: ver.versionNo,
    status: ver.status,
    targetSize: ver.targetSize,
    personalizationPackage: ver.personalizationPackage,
    memoryEnabled: ver.memoryEnabled,
    changeReason: ver.changeReason,
    templateVariantId: ver.templateVariantId,
    templateCode: ver.templateCode,
    templateName: ver.templateName,
    materialName: ver.materialName,
    gemstones: [...ver.gemstones],
    createdAt: ver.createdAt.toISOString(),
  };
}

export function mapQuoteToDetail(quote: OrderingQuoteRecord): FullQuoteDetail {
  return {
    id: quote.id,
    quoteNo: quote.quoteNo,
    quoteType: quote.quoteType,
    versionNo: quote.versionNo,
    status: quote.status,
    subtotalAmount: quote.subtotalAmount,
    deliveryAmount: quote.deliveryAmount,
    adjustmentAmount: quote.adjustmentAmount,
    totalAmount: quote.totalAmount,
    currency: quote.currency,
    createdAt: quote.createdAt.toISOString(),
    validUntil: quote.validUntil?.toISOString(),
    issuedAt: quote.issuedAt?.toISOString(),
    acceptedAt: quote.acceptedAt?.toISOString(),
    items: quote.items.map((i) => ({
      id: i.id,
      ringItemId: i.ringItemId,
      componentType: i.componentType,
      description: i.description,
      quantity: i.quantity,
      unitAmount: i.unitAmount,
      lineAmount: i.lineAmount,
      priceSourceType: i.priceSourceType,
    })),
  };
}

export function mapPaymentTransactionDetail(
  p: OrderingPaymentTransactionRecord,
  fallbackOrderId = '',
): PaymentTransactionDetail {
  return {
    id: p.id,
    orderId: p.orderId || fallbackOrderId,
    paymentStage: p.paymentStage,
    transactionType: p.transactionType,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    provider: p.provider,
    paymentMethod: p.paymentMethod,
    providerOrderCode: p.providerOrderCode
      ? p.providerOrderCode.toString()
      : undefined,
    providerTransactionId: p.providerTransactionId,
    providerReference: p.providerReference,
    relatedTransactionId: p.relatedTransactionId,
    requestedAt: p.requestedAt.toISOString(),
    completedAt: p.completedAt?.toISOString(),
    failedAt: p.failedAt?.toISOString(),
    failureReason: p.failureReason,
    receiptNo: p.receiptNo,
    receiptIssuedAt: p.receiptIssuedAt?.toISOString(),
    metadataJson: p.metadataJson ? JSON.stringify(p.metadataJson) : undefined,
  };
}

export function mapPaymentReceipt(
  tx: OrderingPaymentTransactionRecord,
  fallbackOrderId: string,
): PaymentReceiptDetail {
  return {
    receiptNo: tx.receiptNo || `REC-${tx.orderNo || 'ORD'}-${tx.paymentStage}`,
    transactionId: tx.id,
    orderId: tx.orderId || fallbackOrderId,
    orderNo: tx.orderNo || '',
    paymentStage: tx.paymentStage,
    amount: tx.amount,
    currency: tx.currency,
    paymentMethod: tx.paymentMethod ?? '',
    completedAt: (tx.completedAt ?? tx.requestedAt).toISOString(),
    recipientName: tx.recipientName || '',
    issuedAt: (tx.receiptIssuedAt ?? new Date()).toISOString(),
  };
}

export function mapOrderInvoice(
  orderDetails: OrderingInvoiceRecord,
): OrderInvoiceDetail {
  const totalAmount = orderDetails.quoteTotalAmount;
  const totalPaidAmount = orderDetails.paymentTransactions.reduce(
    (sum, p) => sum + p.amount,
    0,
  );
  const remainingAmount = Math.max(0, totalAmount - totalPaidAmount);

  return {
    invoiceNo: orderDetails.invoiceNo || `INV-${orderDetails.orderNo}`,
    orderId: orderDetails.id,
    orderNo: orderDetails.orderNo,
    status: orderDetails.status,
    issuedAt: (orderDetails.invoiceIssuedAt ?? new Date()).toISOString(),
    totalAmount,
    totalPaidAmount,
    remainingAmount,
    currency: orderDetails.quoteCurrency || 'VND',
    recipientName: orderDetails.recipientName || '',
    recipientPhone: orderDetails.recipientPhone,
    deliveryAddressJson: orderDetails.deliveryAddressJson
      ? JSON.stringify(orderDetails.deliveryAddressJson)
      : undefined,
    items: orderDetails.quoteItems.map((item) => ({
      componentType: item.componentType,
      description: item.description || '',
      quantity: item.quantity,
      unitAmount: item.unitAmount,
      lineAmount: item.lineAmount,
    })),
    paymentTransactions: orderDetails.paymentTransactions.map((pt) => ({
      paymentStage: pt.paymentStage,
      amount: pt.amount,
      completedAt: (pt.completedAt ?? pt.requestedAt).toISOString(),
      receiptNo: pt.receiptNo,
    })),
  };
}
