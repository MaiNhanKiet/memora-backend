import { BadRequestException } from '@nestjs/common';
import type { StageGateItem } from '@app/contracts';

export const ORDER_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  AWAITING_P1: ['PENDING_FINAL_QUOTE', 'CANCELLED'],
  PENDING_FINAL_QUOTE: ['AWAITING_CUSTOMER_CONFIRMATION', 'CANCELLED'],
  AWAITING_CUSTOMER_CONFIRMATION: ['AWAITING_P2', 'CANCELLED'],
  AWAITING_P2: ['MANUFACTURING', 'CANCELLED'],
  MANUFACTURING: ['COMPLETED_MANUFACTURING', 'READY_FOR_DELIVERY', 'CANCELLED'],
  COMPLETED_MANUFACTURING: ['READY_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const CANCELLABLE_ORDER_STATUSES: readonly string[] = [
  'AWAITING_P1',
  'PENDING_FINAL_QUOTE',
  'AWAITING_CUSTOMER_CONFIRMATION',
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
): StageGateItem[] {
  const isAllNone = orderStatus === 'PENDING_FINAL_QUOTE';

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
        : orderStatus === 'COLLECTING_SOURCE'
          ? 'ACTIVE'
          : 'PENDING',
      isCurrent: orderStatus === 'COLLECTING_SOURCE',
    },
    {
      stageCode: 'FINAL_QUOTE_APPROVAL',
      stageName: 'Thẩm định báo giá & Chốt thiết kế',
      status:
        orderStatus === 'PENDING_FINAL_QUOTE'
          ? 'ACTIVE'
          : orderStatus === 'FINAL_QUOTE_ACCEPTED'
            ? 'COMPLETED'
            : 'PENDING',
      isCurrent: orderStatus === 'PENDING_FINAL_QUOTE',
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
      isCurrent: orderStatus === 'DELIVERING',
    },
  ];
}

export function resolvePaymentStageForOrderStatus(
  orderStatus: string,
  requestedStage?: string,
): string {
  if (requestedStage) {
    return requestedStage;
  }
  if (orderStatus === 'AWAITING_P1') {
    return 'DEPOSIT_P1';
  }
  if (orderStatus === 'AWAITING_P2') {
    return 'MILESTONE_P2';
  }
  if (orderStatus === 'AWAITING_P3' || orderStatus === 'READY_FOR_DELIVERY') {
    return 'FINAL_P3';
  }
  if (orderStatus === 'PENDING_FINAL_QUOTE') {
    return 'FULL_PAYMENT';
  }
  throw new BadRequestException(
    `Cannot create payment link for order in status '${orderStatus}'`,
  );
}

export function resolveNextOrderStatusAfterPayment(
  paymentStage: string,
  currentOrderStatus?: string,
): string | undefined {
  if (paymentStage === 'DEPOSIT_P1') {
    return 'PENDING_FINAL_QUOTE';
  }
  if (paymentStage === 'MILESTONE_P2') {
    return 'MANUFACTURING';
  }
  if (paymentStage === 'FINAL_P3' || paymentStage === 'FULL_PAYMENT') {
    return currentOrderStatus === 'READY_FOR_DELIVERY'
      ? 'DELIVERING'
      : undefined;
  }
  return undefined;
}
