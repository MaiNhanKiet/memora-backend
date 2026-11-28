import type { Prisma } from '../../../../../generated/prisma/client';
import type {
  payment_transactions,
  quote_items,
  quotes,
} from '../../../../../generated/prisma/client';
import type {
  OrderingDetailRecord,
  OrderingGemstoneDetailRecord,
  OrderingInvoiceRecord,
  OrderingListItemRecord,
  OrderingPaymentTransactionRecord,
  OrderingQuoteRecord,
  OrderingQuoteSummaryRecord,
  OrderingRingItemRecord,
} from '../application/ordering.repository';

export const ORDER_WITH_RELATIONS_INCLUDE = {
  quotes_orders_current_quote_idToquotes: true,
  ring_items: {
    orderBy: { item_no: 'asc' as const },
    include: {
      ring_item_versions_ring_items_current_version_idToring_item_versions: {
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
} as const;

export type OrderWithRelationsRow = Prisma.ordersGetPayload<{
  include: typeof ORDER_WITH_RELATIONS_INCLUDE;
}>;

export type OrderListRow = Prisma.ordersGetPayload<{
  include: {
    quotes_orders_current_quote_idToquotes: true;
    _count: { select: { ring_items: true } };
  };
}>;

export type QuoteWithItemsRow = quotes & {
  quote_items: quote_items[];
};

export function toQuoteSummaryRecord(q: quotes): OrderingQuoteSummaryRecord {
  return {
    id: q.id,
    quoteNo: q.quote_no,
    quoteType: q.quote_type,
    subtotalAmount: Number(q.subtotal_amount),
    deliveryAmount: Number(q.delivery_amount),
    adjustmentAmount: Number(q.adjustment_amount),
    totalAmount: Number(q.total_amount),
    currency: q.currency.trim(),
    status: q.status,
    validUntil: q.valid_until ?? undefined,
  };
}

export function toOrderListItemRecord(o: OrderListRow): OrderingListItemRecord {
  return {
    id: o.id,
    orderNo: o.order_no,
    status: o.status,
    sourcePlanMode: o.source_plan_mode,
    ownerCustomerIdentityId: o.owner_customer_identity_id,
    recipientName: o.recipient_name ?? undefined,
    recipientPhone: o.recipient_phone ?? undefined,
    recipientEmail: o.recipient_email ?? undefined,
    ringItemsCount: o._count.ring_items,
    currentQuote: o.quotes_orders_current_quote_idToquotes
      ? toQuoteSummaryRecord(o.quotes_orders_current_quote_idToquotes)
      : undefined,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  };
}

export function toOrderDetailRecord(
  o: OrderWithRelationsRow,
): OrderingDetailRecord {
  const ringItems: OrderingRingItemRecord[] = o.ring_items.map((item) => {
    const ver =
      item.ring_item_versions_ring_items_current_version_idToring_item_versions;
    return {
      id: item.id,
      itemNo: item.item_no,
      sourceRingDesignDraftId: item.source_ring_design_draft_id,
      currentVersionId: item.current_version_id ?? undefined,
      versionNo: ver?.version_no ?? 1,
      templateVariantId: ver?.template_variants.id ?? '',
      templateCode: ver?.template_variants.ring_templates.code ?? '',
      templateName: ver?.template_variants.ring_templates.name ?? '',
      materialName: ver?.template_variants.materials.name ?? '',
      targetSize: Number(ver?.target_size ?? 0),
      personalizationPackage: ver?.personalization_package ?? 'NONE',
      memoryEnabled: ver?.memory_enabled ?? false,
    };
  });

  return {
    id: o.id,
    orderNo: o.order_no,
    status: o.status,
    sourcePlanMode: o.source_plan_mode,
    fulfillmentMode: o.fulfillment_mode ?? undefined,
    ownerCustomerIdentityId: o.owner_customer_identity_id,
    guestEmail: o.guest_email ?? undefined,
    guestPhone: o.guest_phone ?? undefined,
    guestEmailVerifiedAt: o.guest_email_verified_at ?? undefined,
    recipientName: o.recipient_name ?? undefined,
    recipientPhone: o.recipient_phone ?? undefined,
    recipientEmail: o.recipient_email ?? undefined,
    deliveryAddressJson: o.delivery_address_json ?? undefined,
    preP1EvidenceJson: o.pre_p1_evidence_json ?? undefined,
    privacyNoticeAcknowledgedAt: o.privacy_notice_acknowledged_at ?? undefined,
    cancelledAt: o.cancelled_at ?? undefined,
    cancellationReason: o.cancellation_reason ?? undefined,
    currentQuoteId: o.current_quote_id ?? undefined,
    currentQuote: o.quotes_orders_current_quote_idToquotes
      ? toQuoteSummaryRecord(o.quotes_orders_current_quote_idToquotes)
      : undefined,
    ringItems,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  };
}

export function toGemstoneDetailRecords(
  gemstones: Array<{
    gemstone_slot_id: string;
    gemstone_option_id: string;
    gemstone_slots: { slot_index: number };
    gemstone_options: {
      stone_type: string;
      name: string;
      shape: string;
      length_mm: Prisma.Decimal;
      color_grade: string | null;
      clarity_grade: string | null;
    };
  }>,
): OrderingGemstoneDetailRecord[] {
  return gemstones.map((gem) => ({
    slotNumber: gem.gemstone_slots.slot_index,
    gemstoneSlotId: gem.gemstone_slot_id,
    gemstoneOptionId: gem.gemstone_option_id,
    gemstoneType: gem.gemstone_options.stone_type,
    gemstoneName: gem.gemstone_options.name,
    shape: gem.gemstone_options.shape,
    caratWeight: Number(gem.gemstone_options.length_mm),
    color: gem.gemstone_options.color_grade || '',
    clarity: gem.gemstone_options.clarity_grade || '',
  }));
}

export function toQuoteRecord(q: QuoteWithItemsRow): OrderingQuoteRecord {
  return {
    id: q.id,
    quoteNo: q.quote_no,
    quoteType: q.quote_type,
    versionNo: q.version_no,
    status: q.status,
    subtotalAmount: Number(q.subtotal_amount),
    deliveryAmount: Number(q.delivery_amount),
    adjustmentAmount: Number(q.adjustment_amount),
    totalAmount: Number(q.total_amount),
    currency: q.currency.trim(),
    createdAt: q.created_at,
    validUntil: q.valid_until ?? undefined,
    issuedAt: q.issued_at ?? undefined,
    acceptedAt: q.accepted_at ?? undefined,
    items: q.quote_items.map((i) => ({
      id: i.id,
      ringItemId: i.ring_item_id ?? undefined,
      componentType: i.component_type,
      description: i.description ?? undefined,
      quantity: Number(i.quantity),
      unitAmount: Number(i.unit_amount),
      lineAmount: Number(i.line_amount),
      priceSourceType: i.price_source_type,
    })),
  };
}

export function toPaymentTransactionRecord(
  p: payment_transactions & {
    orders?: {
      order_no: string;
      status?: string;
      recipient_name?: string | null;
    } | null;
  },
): OrderingPaymentTransactionRecord {
  return {
    id: p.id,
    quoteId: p.quote_id ?? undefined,
    orderId: p.order_id ?? undefined,
    orderNo: p.orders?.order_no,
    orderStatus: p.orders?.status,
    recipientName: p.orders?.recipient_name ?? undefined,
    paymentStage: p.payment_stage,
    transactionType: p.transaction_type,
    amount: Number(p.amount),
    currency: p.currency,
    status: p.status,
    provider: p.provider ?? undefined,
    paymentMethod: p.payment_method ?? undefined,
    providerOrderCode: p.provider_order_code ?? undefined,
    providerTransactionId: p.provider_transaction_id ?? undefined,
    providerReference: p.provider_reference ?? undefined,
    relatedTransactionId: p.related_transaction_id ?? undefined,
    requestedAt: p.requested_at,
    completedAt: p.completed_at ?? undefined,
    failedAt: p.failed_at ?? undefined,
    failureReason: p.failure_reason ?? undefined,
    expiresAt: p.expires_at ?? undefined,
    receiptNo: p.receipt_no ?? undefined,
    receiptIssuedAt: p.receipt_issued_at ?? undefined,
    metadataJson: p.metadata_json ?? undefined,
  };
}

export function toOrderInvoiceRecord(
  order: Prisma.ordersGetPayload<{
    include: {
      quotes_orders_current_quote_idToquotes: {
        include: { quote_items: true };
      };
      payment_transactions: true;
    };
  }>,
): OrderingInvoiceRecord {
  const quote = order.quotes_orders_current_quote_idToquotes;
  return {
    id: order.id,
    orderNo: order.order_no,
    status: order.status,
    invoiceNo: order.invoice_no ?? undefined,
    invoiceIssuedAt: order.invoice_issued_at ?? undefined,
    recipientName: order.recipient_name ?? undefined,
    recipientPhone: order.recipient_phone ?? undefined,
    deliveryAddressJson: order.delivery_address_json ?? undefined,
    quoteCurrency: quote?.currency,
    quoteTotalAmount: quote ? Number(quote.total_amount) : 0,
    quoteItems: (quote?.quote_items ?? []).map((i) => ({
      id: i.id,
      ringItemId: i.ring_item_id ?? undefined,
      componentType: i.component_type,
      description: i.description ?? undefined,
      quantity: Number(i.quantity),
      unitAmount: Number(i.unit_amount),
      lineAmount: Number(i.line_amount),
      priceSourceType: i.price_source_type,
    })),
    paymentTransactions: order.payment_transactions.map((pt) => ({
      paymentStage: pt.payment_stage,
      amount: Number(pt.amount),
      requestedAt: pt.requested_at,
      completedAt: pt.completed_at ?? undefined,
      receiptNo: pt.receipt_no ?? undefined,
    })),
  };
}
