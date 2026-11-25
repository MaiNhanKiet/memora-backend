import type { FullQuoteDetail, PaymentTransactionDetail } from '@app/contracts';

export type DecimalLike = number | string | { toString(): string };

export interface QuoteDetailInput {
  id: string;
  quote_no: string;
  quote_type: string;
  version_no: number;
  status: string;
  subtotal_amount: DecimalLike;
  delivery_amount: DecimalLike;
  adjustment_amount: DecimalLike;
  total_amount: DecimalLike;
  currency: string;
  created_at: Date;
  valid_until: Date | null;
  issued_at: Date | null;
  accepted_at: Date | null;
  quote_items: Array<{
    id: string;
    ring_item_id: string | null;
    component_type: string;
    description: string | null;
    quantity: DecimalLike;
    unit_amount: DecimalLike;
    line_amount: DecimalLike;
    price_source_type: string;
  }>;
}

export interface PaymentTransactionDetailInput {
  id: string;
  order_id: string | null;
  payment_stage: string;
  transaction_type: string;
  amount: DecimalLike;
  currency: string;
  status: string;
  provider: string | null;
  payment_method: string | null;
  provider_order_code: bigint | number | string | null;
  provider_transaction_id: string | null;
  provider_reference: string | null;
  related_transaction_id: string | null;
  requested_at: Date;
  completed_at: Date | null;
  failed_at: Date | null;
  failure_reason: string | null;
  receipt_no: string | null;
  receipt_issued_at: Date | null;
  metadata_json: unknown;
}

export function mapQuoteToDetail(quote: QuoteDetailInput): FullQuoteDetail {
  return {
    id: quote.id,
    quoteNo: quote.quote_no,
    quoteType: quote.quote_type,
    versionNo: quote.version_no,
    status: quote.status,
    subtotalAmount: Number(quote.subtotal_amount),
    deliveryAmount: Number(quote.delivery_amount),
    adjustmentAmount: Number(quote.adjustment_amount),
    totalAmount: Number(quote.total_amount),
    currency: quote.currency,
    createdAt: quote.created_at.toISOString(),
    validUntil: quote.valid_until ? quote.valid_until.toISOString() : undefined,
    issuedAt: quote.issued_at ? quote.issued_at.toISOString() : undefined,
    acceptedAt: quote.accepted_at ? quote.accepted_at.toISOString() : undefined,
    items: quote.quote_items.map((i) => ({
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

export function mapPaymentTransactionDetail(
  p: PaymentTransactionDetailInput,
): PaymentTransactionDetail {
  return {
    id: p.id,
    orderId: p.order_id || '',
    paymentStage: p.payment_stage,
    transactionType: p.transaction_type,
    amount: Number(p.amount),
    currency: p.currency,
    status: p.status,
    provider: p.provider ?? undefined,
    paymentMethod: p.payment_method ?? undefined,
    providerOrderCode: p.provider_order_code
      ? p.provider_order_code.toString()
      : undefined,
    providerTransactionId: p.provider_transaction_id ?? undefined,
    providerReference: p.provider_reference ?? undefined,
    relatedTransactionId: p.related_transaction_id ?? undefined,
    requestedAt: p.requested_at.toISOString(),
    completedAt: p.completed_at ? p.completed_at.toISOString() : undefined,
    failedAt: p.failed_at ? p.failed_at.toISOString() : undefined,
    failureReason: p.failure_reason ?? undefined,
    receiptNo: p.receipt_no ?? undefined,
    receiptIssuedAt: p.receipt_issued_at
      ? p.receipt_issued_at.toISOString()
      : undefined,
    metadataJson: p.metadata_json ? JSON.stringify(p.metadata_json) : undefined,
  };
}
