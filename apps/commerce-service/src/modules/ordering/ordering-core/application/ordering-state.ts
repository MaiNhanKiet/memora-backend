import { BadRequestException, ConflictException } from '@nestjs/common';
import type { OrderNextPayment, StageGateItem } from '@app/contracts';
import type {
  OrderingDetailRecord,
  OrderingQuoteSummaryRecord,
  OrderingPaymentTransactionRecord,
} from './ordering.repository';

export const ORDER_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  AWAITING_P1: ['CANCELLED'],
  DESIGN_IN_PROGRESS: ['CANCELLED'],
  PENDING_FINAL_QUOTE: ['CANCELLED'],
  AWAITING_FINAL_CONFIRMATION: ['CANCELLED'],
  AWAITING_P2: ['CANCELLED'],
  MANUFACTURING: ['COMPLETED_MANUFACTURING', 'READY_FOR_DELIVERY', 'CANCELLED'],
  COMPLETED_MANUFACTURING: ['READY_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const CANCELLABLE_ORDER_STATUSES: readonly string[] = [
  'AWAITING_P1',
  'PENDING_FINAL_QUOTE',
  'AWAITING_FINAL_CONFIRMATION',
];

export function assertValidOrderStatusTransition(
  previousStatus: string,
  targetStatus: string,
): void {
  const allowed = ORDER_STATUS_TRANSITIONS[previousStatus] ?? [];
  if (!allowed.includes(targetStatus)) {
    throw new BadRequestException(
      `Cannot transition order status from '${previousStatus}' to '${targetStatus}'. Allowed: [${allowed.join(', ')}]`,
    );
  }
}

interface FinalQuoteRingItem {
  readonly id: string;
  readonly version: {
    readonly id: string;
    readonly ringItemId: string;
    readonly status: string;
    readonly personalizationPackage: string;
  } | null;
}

export function resolveFinalQuotePreparationStatus(
  items: readonly FinalQuoteRingItem[],
) {
  return items.some(
    ({ version }) =>
      version?.personalizationPackage === 'FINGERPRINT' ||
      version?.personalizationPackage === 'SOUNDWAVE',
  )
    ? 'DESIGN_IN_PROGRESS'
    : 'PENDING_FINAL_QUOTE';
}

export function resolveFinalQuoteVersions(
  orderStatus: string,
  action: 'prepare' | 'confirm',
  items: readonly FinalQuoteRingItem[],
): Record<string, string> {
  const expectedStatus =
    action === 'confirm'
      ? 'AWAITING_FINAL_CONFIRMATION'
      : resolveFinalQuotePreparationStatus(items);
  if (orderStatus !== expectedStatus || items.length === 0) {
    throw new ConflictException(
      `The order must contain ring items and be in ${expectedStatus} for this final quote action`,
    );
  }

  return Object.fromEntries(
    items.map(({ id, version }) => {
      const expectedVersionStatus =
        version?.personalizationPackage === 'NONE'
          ? 'REVIEW_NOT_REQUIRED'
          : 'MANAGER_APPROVED';
      if (
        version?.ringItemId !== id ||
        version.status !== expectedVersionStatus ||
        !['NONE', 'FINGERPRINT', 'SOUNDWAVE'].includes(
          version.personalizationPackage,
        )
      ) {
        throw new ConflictException(
          `Ring item ${id} does not have a current version ready for the final quote`,
        );
      }
      return [id, version.id];
    }),
  );
}

export function assertOrderCancellable(status: string): void {
  if (!CANCELLABLE_ORDER_STATUSES.includes(status)) {
    throw new BadRequestException(
      `Order in status '${status}' cannot be cancelled. Only pre-production orders can be cancelled.`,
    );
  }
}

export function resolveOrderStageGates(
  orderStatus: string,
  createdAtIso: string,
  hasPersonalization: boolean,
): StageGateItem[] {
  const isAllNone = !hasPersonalization;

  return [
    {
      stageCode: 'CREATION',
      stageName: 'Khởi tạo đơn hàng',
      status: 'COMPLETED',
      isCurrent: false,
      completedAt: createdAtIso,
    },
    {
      stageCode: 'DEPOSIT_P1',
      stageName: 'Đặt cọc P1 (30%)',
      status: isAllNone
        ? 'SKIPPED'
        : orderStatus === 'AWAITING_P1'
          ? 'ACTIVE'
          : 'COMPLETED',
      isCurrent: orderStatus === 'AWAITING_P1',
    },
    {
      stageCode: 'PERSONALIZATION_SOURCE',
      stageName: 'Thu thập dữ liệu cá nhân hóa',
      status: isAllNone
        ? 'SKIPPED'
        : orderStatus === 'DESIGN_IN_PROGRESS'
          ? 'ACTIVE'
          : 'PENDING',
      isCurrent: orderStatus === 'DESIGN_IN_PROGRESS',
    },
    {
      stageCode: 'FINAL_QUOTE_APPROVAL',
      stageName: 'Thẩm định báo giá & Chốt thiết kế',
      status:
        orderStatus === 'PENDING_FINAL_QUOTE' ||
        orderStatus === 'AWAITING_FINAL_CONFIRMATION'
          ? 'ACTIVE'
          : [
                'AWAITING_P2',
                'PRODUCTION_AUTHORIZED',
                'IN_PRODUCTION',
                'READY_FOR_HANDOVER',
                'COMPLETED',
              ].includes(orderStatus)
            ? 'COMPLETED'
            : 'PENDING',
      isCurrent:
        orderStatus === 'PENDING_FINAL_QUOTE' ||
        orderStatus === 'AWAITING_FINAL_CONFIRMATION',
    },
    {
      stageCode: 'PRODUCTION',
      stageName: 'Chế tác & Kiểm định chất lượng',
      status: orderStatus === 'IN_PRODUCTION' ? 'ACTIVE' : 'PENDING',
      isCurrent: orderStatus === 'IN_PRODUCTION',
    },
    {
      stageCode: 'FULFILLMENT',
      stageName: 'Bàn giao / Giao hàng',
      status: orderStatus === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
      isCurrent: orderStatus === 'READY_FOR_HANDOVER',
    },
  ];
}

export function resolvePaymentCredit(
  payments: readonly OrderingPaymentTransactionRecord[],
  quote: Pick<OrderingQuoteSummaryRecord, 'id' | 'currency'>,
  creditedStages: ReadonlySet<string>,
  restrictToQuote: boolean,
): number {
  const succeeded = payments.filter(
    (item) => item.status === 'SUCCEEDED' && item.currency === quote.currency,
  );
  const eligiblePayments = succeeded.filter(
    (item) =>
      item.transactionType === 'PAYMENT' &&
      creditedStages.has(item.paymentStage) &&
      (!restrictToQuote || item.quoteId === quote.id),
  );
  const paymentIds = new Set(eligiblePayments.map(({ id }) => id));
  const refundedAmount = succeeded
    .filter(
      (item) =>
        item.transactionType === 'REFUND' &&
        item.relatedTransactionId &&
        paymentIds.has(item.relatedTransactionId),
    )
    .reduce((total, item) => total + item.amount, 0);
  return Math.max(
    0,
    eligiblePayments.reduce((total, item) => total + item.amount, 0) -
      refundedAmount,
  );
}

const FINAL_PAYMENT_CREDIT_STAGES = new Set([
  'DEPOSIT_P1',
  'MILESTONE_P2',
  'FINAL_P3',
  'FULL_PAYMENT',
]);

export function isFinalPaymentSatisfied(
  order: OrderingDetailRecord,
  payments: readonly OrderingPaymentTransactionRecord[],
): boolean {
  const quote = order.currentQuote;
  if (
    quote?.quoteType !== 'FINAL' ||
    quote.status !== 'ACCEPTED' ||
    quote.currency !== 'VND' ||
    quote.totalAmount < 0
  ) {
    return false;
  }
  return (
    resolvePaymentCredit(payments, quote, FINAL_PAYMENT_CREDIT_STAGES, false) >=
    Math.round(quote.totalAmount)
  );
}

export function resolveOrderNextPayment(
  order: OrderingDetailRecord,
  payments: readonly OrderingPaymentTransactionRecord[],
  now = new Date(),
): OrderNextPayment | undefined {
  const quote = order.currentQuote;
  if (!quote || quote.totalAmount <= 0 || quote.currency !== 'VND') {
    return undefined;
  }

  const hasPersonalization = order.ringItems.some(
    ({ personalizationPackage }) =>
      personalizationPackage === 'FINGERPRINT' ||
      personalizationPackage === 'SOUNDWAVE',
  );
  let stage: string;
  let target: number;
  if (
    order.status === 'AWAITING_P1' &&
    hasPersonalization &&
    quote.quoteType === 'PROVISIONAL' &&
    quote.status === 'ISSUED'
  ) {
    stage = 'DEPOSIT_P1';
    target = Math.round(quote.totalAmount * 0.3);
  } else if (quote.quoteType === 'FINAL' && quote.status === 'ACCEPTED') {
    if (order.status === 'AWAITING_P2' && hasPersonalization) {
      stage = 'MILESTONE_P2';
      target = Math.ceil(quote.totalAmount * 0.7);
    } else if (order.status === 'READY_FOR_HANDOVER') {
      stage = hasPersonalization ? 'FINAL_P3' : 'FULL_PAYMENT';
      target = Math.round(quote.totalAmount);
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }

  const creditedStages =
    stage === 'DEPOSIT_P1'
      ? new Set(['DEPOSIT_P1'])
      : FINAL_PAYMENT_CREDIT_STAGES;
  const paidAmount = resolvePaymentCredit(
    payments,
    quote,
    creditedStages,
    stage === 'DEPOSIT_P1',
  );
  const amountDue = Math.max(0, target - paidAmount);
  const expiresAt =
    stage === 'DEPOSIT_P1'
      ? new Date(
          Math.min(
            order.createdAt.getTime() + 24 * 60 * 60 * 1000,
            quote.validUntil?.getTime() ?? Infinity,
          ),
        )
      : undefined;
  const canPay = amountDue > 0 && (!expiresAt || expiresAt > now);
  const pending = payments.find(
    (item) =>
      canPay &&
      item.transactionType === 'PAYMENT' &&
      item.provider === 'PAYOS' &&
      item.status === 'PENDING' &&
      item.paymentStage === stage &&
      item.quoteId === quote.id &&
      item.currency === quote.currency &&
      item.amount === amountDue &&
      item.expiresAt &&
      item.expiresAt > now,
  );

  return {
    stage,
    amountDue,
    paidAmount,
    orderTotal: quote.totalAmount,
    currency: quote.currency,
    canPay,
    expiresAt: expiresAt?.toISOString(),
    pendingAttempt: pending
      ? {
          transactionId: pending.id,
          expiresAt: pending.expiresAt?.toISOString(),
        }
      : undefined,
  };
}
