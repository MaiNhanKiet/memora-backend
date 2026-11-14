import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ClientGrpc } from '@nestjs/microservices';
import type {
  CommerceOrderingServiceClient,
  CreateOrderRequest,
  CreateOrderResponse,
  GetAdminOrderDetailsRequest,
  GetAdminOrderDetailsResponse,
  GetOrderByIdRequest,
  GetOrderByIdResponse,
  GetOrderTimelineRequest,
  GetOrderTimelineResponse,
  GetRingItemDetailsRequest,
  GetRingItemDetailsResponse,
  ListAdminOrdersRequest,
  ListAdminOrdersResponse,
  ListOrdersRequest,
  ListOrdersResponse,
  UpdateOrderStatusRequest,
  UpdateOrderStatusResponse,
} from '@app/contracts';
import { DomainGrpcClient } from '../../../common/grpc/domain-grpc';

export const COMMERCE_ORDERING_GRPC_CLIENT = 'COMMERCE_ORDERING_GRPC_CLIENT';

@Injectable()
export class OrderingGrpcClient
  extends DomainGrpcClient
  implements OnModuleInit
{
  private orderingService!: CommerceOrderingServiceClient;

  constructor(
    @Inject(COMMERCE_ORDERING_GRPC_CLIENT)
    private readonly grpcClient: ClientGrpc,
    configService: ConfigService,
  ) {
    super(configService, 'apiGateway.commerceInternalGrpcSecret');
  }

  onModuleInit(): void {
    this.orderingService =
      this.grpcClient.getService<CommerceOrderingServiceClient>(
        'OrderingService',
      );
  }

  createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    return this.unary((metadata) =>
      this.orderingService.createOrder(request, metadata),
    );
  }

  listOrders(request: ListOrdersRequest): Promise<ListOrdersResponse> {
    return this.unary((metadata) =>
      this.orderingService.listOrders(request, metadata),
    );
  }

  getOrderById(request: GetOrderByIdRequest): Promise<GetOrderByIdResponse> {
    return this.unary((metadata) =>
      this.orderingService.getOrderById(request, metadata),
    );
  }

  getOrderTimeline(
    request: GetOrderTimelineRequest,
  ): Promise<GetOrderTimelineResponse> {
    return this.unary((metadata) =>
      this.orderingService.getOrderTimeline(request, metadata),
    );
  }

  getRingItemDetails(
    request: GetRingItemDetailsRequest,
  ): Promise<GetRingItemDetailsResponse> {
    return this.unary((metadata) =>
      this.orderingService.getRingItemDetails(request, metadata),
    );
  }

  listAdminOrders(
    request: ListAdminOrdersRequest,
  ): Promise<ListAdminOrdersResponse> {
    return this.unary((metadata) =>
      this.orderingService.listAdminOrders(request, metadata),
    );
  }

  getAdminOrderDetails(
    request: GetAdminOrderDetailsRequest,
  ): Promise<GetAdminOrderDetailsResponse> {
    return this.unary((metadata) =>
      this.orderingService.getAdminOrderDetails(request, metadata),
    );
  }

  updateOrderStatus(
    request: UpdateOrderStatusRequest,
  ): Promise<UpdateOrderStatusResponse> {
    return this.unary((metadata) =>
      this.orderingService.updateOrderStatus(request, metadata),
    );
  }
}
