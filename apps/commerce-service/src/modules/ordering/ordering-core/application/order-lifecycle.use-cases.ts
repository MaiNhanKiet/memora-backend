import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CancelOrderRequest,
  CancelOrderResponse,
  UpdateOrderStatusRequest,
  UpdateOrderStatusResponse,
} from '@app/contracts';
import {
  assertOrderCancellable,
  assertValidOrderStatusTransition,
} from './ordering-state';
import {
  ORDERING_REPOSITORY,
  type OrderingRepository,
} from './ordering.repository';
import {
  resolveOrderingActorId,
  validateOrderingActor,
} from './ordering.validation';

@Injectable()
export class UpdateOrderStatusUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(
    request: UpdateOrderStatusRequest,
  ): Promise<UpdateOrderStatusResponse> {
    const order = await this.repository.findAdminOrderById(request.orderId);
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    const previousStatus = order.status;
    const targetStatus = request.targetStatus.trim().toUpperCase();
    assertValidOrderStatusTransition(previousStatus, targetStatus);

    const updated = await this.repository.updateOrderStatus({
      orderId: request.orderId,
      targetStatus,
      reason: request.reason,
    });

    return {
      orderId: updated.id,
      orderNo: updated.orderNo,
      previousStatus,
      currentStatus: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}

@Injectable()
export class CancelOrderUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(request: CancelOrderRequest): Promise<CancelOrderResponse> {
    const actor = validateOrderingActor(request.actor);
    const { actorId, guestSessionId } = resolveOrderingActorId(actor);

    const order = await this.repository.findOrderById(
      request.orderId,
      actorId,
      guestSessionId,
    );
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    assertOrderCancellable(order.status);

    const updated = await this.repository.cancelOrder(
      request.orderId,
      request.reason,
    );

    return {
      orderId: updated.id,
      status: updated.status,
      cancelledAt: (updated.cancelledAt ?? new Date()).toISOString(),
      cancellationReason: updated.cancellationReason,
    };
  }
}
