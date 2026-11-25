import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  GetAdminOrderDetailsRequest,
  GetAdminOrderDetailsResponse,
  GetOrderByIdRequest,
  GetOrderByIdResponse,
  GetOrderPersonalizationContextRequest,
  GetOrderPersonalizationContextResponse,
  GetOrderTimelineRequest,
  GetOrderTimelineResponse,
  GetRingItemDetailsRequest,
  GetRingItemDetailsResponse,
  ListAdminOrdersRequest,
  ListAdminOrdersResponse,
  ListOrdersRequest,
  ListOrdersResponse,
  ListRingItemVersionsRequest,
  ListRingItemVersionsResponse,
  TimelineEventItem,
  UpdateCurrentRingItemVersionRequest,
  UpdateCurrentRingItemVersionResponse,
} from '@app/contracts';
import { resolveOrderStageGates } from './ordering-state';
import {
  mapAdminOrderDetail,
  mapAdminOrderSummary,
  mapOrderDetail,
  mapOrderSummary,
  mapRingItemDetail,
  mapRingItemVersion,
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
export class OrderQueryUseCases {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async listOrders(request: ListOrdersRequest): Promise<ListOrdersResponse> {
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

  async getOrderById(
    request: GetOrderByIdRequest,
  ): Promise<GetOrderByIdResponse> {
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

  async getOrderTimeline(
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

  async getRingItemDetails(
    request: GetRingItemDetailsRequest,
  ): Promise<GetRingItemDetailsResponse> {
    const actor = validateOrderingActor(request.actor);
    const { actorId, guestSessionId } = resolveOrderingActorId(actor);

    const item = await this.repository.findRingItemWithDetails(
      request.orderId,
      request.ringItemId,
      actorId,
      guestSessionId,
    );
    if (!item) {
      throw new NotFoundException(
        'Ring item not found in this order or access denied',
      );
    }

    return mapRingItemDetail(item);
  }

  async listAdminOrders(
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

  async getAdminOrderDetails(
    request: GetAdminOrderDetailsRequest,
  ): Promise<GetAdminOrderDetailsResponse> {
    const order = await this.repository.findAdminOrderById(request.orderId);
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }
    return mapAdminOrderDetail(order);
  }

  async listRingItemVersions(
    request: ListRingItemVersionsRequest,
  ): Promise<ListRingItemVersionsResponse> {
    const actor = validateOrderingActor(request.actor);
    const { actorId, guestSessionId } = resolveOrderingActorId(actor);

    const versions = await this.repository.listRingItemVersions(
      request.orderId,
      request.ringItemId,
      actorId,
      guestSessionId,
    );
    if (!versions) {
      throw new NotFoundException(
        'Order or ring item not found or access denied',
      );
    }

    return {
      ringItemId: request.ringItemId,
      orderId: request.orderId,
      versions: versions.map((v) => mapRingItemVersion(v)),
    };
  }

  async updateCurrentRingItemVersion(
    request: UpdateCurrentRingItemVersionRequest,
  ): Promise<UpdateCurrentRingItemVersionResponse> {
    const actor = validateOrderingActor(request.actor);
    const { actorId, guestSessionId } = resolveOrderingActorId(actor);

    const currentVersion = await this.repository.findCurrentRingItemVersion(
      request.orderId,
      request.ringItemId,
      actorId,
      guestSessionId,
    );
    if (!currentVersion) {
      throw new NotFoundException(
        'Ring item current version not found or access denied',
      );
    }

    if (
      currentVersion.status !== 'DRAFT' &&
      currentVersion.status !== 'SUBMITTED'
    ) {
      throw new BadRequestException(
        `Cannot modify ring item version in status '${currentVersion.status}'. Only DRAFT or SUBMITTED versions can be updated.`,
      );
    }

    const updated = await this.repository.updateCurrentRingItemVersion(
      currentVersion.id,
      {
        targetSize: request.targetSize,
        changeReason: request.changeReason,
        memoryEnabled: request.memoryEnabled,
      },
    );

    return {
      ringItemId: request.ringItemId,
      versionId: updated.id,
      versionNo: updated.versionNo,
      status: updated.status,
      targetSize: updated.targetSize,
      changeReason: updated.changeReason,
      updatedAt: updated.createdAt.toISOString(),
    };
  }

  async getOrderPersonalizationContext(
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
