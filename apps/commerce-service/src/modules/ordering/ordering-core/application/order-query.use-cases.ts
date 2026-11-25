import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  GetAdminOrderDetailsRequest,
  GetAdminOrderDetailsResponse,
  GetOrderByIdRequest,
  GetOrderByIdResponse,
  GetOrderPersonalizationContextRequest,
  GetOrderPersonalizationContextResponse,
  GetOrderTimelineRequest,
  GetOrderTimelineResponse,
  ListAdminOrdersRequest,
  ListAdminOrdersResponse,
  ListOrdersRequest,
  ListOrdersResponse,
  TimelineEventItem,
} from '@app/contracts';
import { resolveOrderStageGates } from './ordering-state';
import {
  mapAdminOrderDetail,
  mapAdminOrderSummary,
  mapOrderDetail,
  mapOrderSummary,
} from './ordering.mapper';
import {
  ORDERING_REPOSITORY,
  type OrderingRepository,
} from './ordering.repository';
import {
  resolveOrderingActorId,
  validateOrderUuid,
  validateOrderingActor,
} from './ordering.validation';

@Injectable()
export class ListOrdersUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(request: ListOrdersRequest): Promise<ListOrdersResponse> {
    const actor = validateOrderingActor(request.actor);
    const { actorId, guestSessionId } = resolveOrderingActorId(actor);
    const page = Math.max(request.page || 1, 1);
    const limit = Math.min(Math.max(request.limit || 20, 1), 100);
    const skip = (page - 1) * limit;

    const { items, total } = await this.repository.listOrders(
      actorId,
      guestSessionId,
      request.status,
      skip,
      limit,
    );

    return {
      items: items.map((o) => mapOrderSummary(o)),
      total,
      page,
      limit,
    };
  }
}

@Injectable()
export class GetOrderByIdUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(request: GetOrderByIdRequest): Promise<GetOrderByIdResponse> {
    const actor = validateOrderingActor(request.actor);
    const { actorId, guestSessionId } = resolveOrderingActorId(actor);

    const order = await this.repository.findOrderById(
      request.orderId,
      actorId,
      guestSessionId,
    );
    if (!order) {
      throw new NotFoundException('Order not found or access denied');
    }

    return mapOrderDetail(order);
  }
}

@Injectable()
export class GetOrderTimelineUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(
    request: GetOrderTimelineRequest,
  ): Promise<GetOrderTimelineResponse> {
    const actor = validateOrderingActor(request.actor);
    const { actorId, guestSessionId } = resolveOrderingActorId(actor);

    const order = await this.repository.findOrderById(
      request.orderId,
      actorId,
      guestSessionId,
    );
    if (!order) {
      throw new NotFoundException('Order not found or access denied');
    }

    const events: TimelineEventItem[] = [
      {
        eventType: 'ORDER_CREATED',
        title: 'Tạo đơn hàng',
        description: `Đơn hàng ${order.orderNo} được khởi tạo thành công`,
        occurredAt: order.createdAt.toISOString(),
        status: 'COMPLETED',
      },
    ];

    if (order.privacyNoticeAcknowledgedAt) {
      events.push({
        eventType: 'PRE_P1_ACKNOWLEDGED',
        title: 'Xác nhận thông báo trước P1 & quy tắc cọc',
        description:
          'Khách hàng đã xác nhận điều khoản cá nhân hóa và hiểu rõ chính sách cọc P1',
        occurredAt: order.privacyNoticeAcknowledgedAt.toISOString(),
        status: 'COMPLETED',
      });
    }

    if (order.cancelledAt) {
      events.push({
        eventType: 'ORDER_CANCELLED',
        title: 'Đơn hàng bị hủy',
        description:
          order.cancellationReason || 'Đơn hàng đã được hủy theo yêu cầu',
        occurredAt: order.cancelledAt.toISOString(),
        status: 'CANCELLED',
      });
    }

    return {
      orderId: order.id,
      orderNo: order.orderNo,
      currentStatus: order.status,
      events,
      stageGates: resolveOrderStageGates(
        order.status,
        order.createdAt.toISOString(),
      ),
    };
  }
}

@Injectable()
export class ListAdminOrdersUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(
    request: ListAdminOrdersRequest,
  ): Promise<ListAdminOrdersResponse> {
    const { items, total, page, limit } = await this.repository.listAdminOrders(
      {
        page: request.page,
        limit: request.limit,
        status: request.status,
        search: request.search,
        dateFrom: request.dateFrom,
        dateTo: request.dateTo,
      },
    );

    return {
      items: items.map((o) => mapAdminOrderSummary(o)),
      total,
      page,
      limit,
    };
  }
}

@Injectable()
export class GetAdminOrderDetailsUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(
    request: GetAdminOrderDetailsRequest,
  ): Promise<GetAdminOrderDetailsResponse> {
    const order = await this.repository.findAdminOrderById(request.orderId);
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }
    return mapAdminOrderDetail(order);
  }
}

@Injectable()
export class GetOrderPersonalizationContextUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(
    request: GetOrderPersonalizationContextRequest,
  ): Promise<GetOrderPersonalizationContextResponse> {
    const orderId = validateOrderUuid(request?.orderId);
    const order =
      await this.repository.findOrderPersonalizationContext(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return {
      orderId: order.id,
      ownerCustomerIdentityId: order.ownerCustomerIdentityId,
      status: order.status,
      p1Paid: order.p1Paid,
      sourcePlanMode: order.sourcePlanMode,
      ringItems: [...order.ringItems],
    };
  }
}
