import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import type {
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
  ListOrderQuotesRequest,
  ListOrderQuotesResponse,
  ListOrdersRequest,
  ListOrdersResponse,
  ListRingItemVersionsRequest,
  ListRingItemVersionsResponse,
  OrderingServiceHandler,
  UpdateCurrentRingItemVersionRequest,
  UpdateCurrentRingItemVersionResponse,
  UpdateOrderStatusRequest,
  UpdateOrderStatusResponse,
} from '@app/contracts';
import { OrderingService } from '../../application/ordering/ordering.service';
import { CommerceInternalGrpcAuthGuard } from '../../grpc/commerce-internal-grpc-auth.guard';

@Controller()
@UseGuards(CommerceInternalGrpcAuthGuard)
export class OrderingGrpcController implements OrderingServiceHandler {
  constructor(private readonly orderingService: OrderingService) {}

  @GrpcMethod('OrderingService', 'CreateOrder')
  createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    return this.orderingService.createOrder(request);
  }

  @GrpcMethod('OrderingService', 'ListOrders')
  listOrders(request: ListOrdersRequest): Promise<ListOrdersResponse> {
    return this.orderingService.listOrders(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderById')
  getOrderById(request: GetOrderByIdRequest): Promise<GetOrderByIdResponse> {
    return this.orderingService.getOrderById(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderTimeline')
  getOrderTimeline(
    request: GetOrderTimelineRequest,
  ): Promise<GetOrderTimelineResponse> {
    return this.orderingService.getOrderTimeline(request);
  }

  @GrpcMethod('OrderingService', 'GetRingItemDetails')
  getRingItemDetails(
    request: GetRingItemDetailsRequest,
  ): Promise<GetRingItemDetailsResponse> {
    return this.orderingService.getRingItemDetails(request);
  }

  @GrpcMethod('OrderingService', 'ListAdminOrders')
  listAdminOrders(
    request: ListAdminOrdersRequest,
  ): Promise<ListAdminOrdersResponse> {
    return this.orderingService.listAdminOrders(request);
  }

  @GrpcMethod('OrderingService', 'GetAdminOrderDetails')
  getAdminOrderDetails(
    request: GetAdminOrderDetailsRequest,
  ): Promise<GetAdminOrderDetailsResponse> {
    return this.orderingService.getAdminOrderDetails(request);
  }

  @GrpcMethod('OrderingService', 'UpdateOrderStatus')
  updateOrderStatus(
    request: UpdateOrderStatusRequest,
  ): Promise<UpdateOrderStatusResponse> {
    return this.orderingService.updateOrderStatus(request);
  }

  @GrpcMethod('OrderingService', 'ListRingItemVersions')
  listRingItemVersions(
    request: ListRingItemVersionsRequest,
  ): Promise<ListRingItemVersionsResponse> {
    return this.orderingService.listRingItemVersions(request);
  }

  @GrpcMethod('OrderingService', 'UpdateCurrentRingItemVersion')
  updateCurrentRingItemVersion(
    request: UpdateCurrentRingItemVersionRequest,
  ): Promise<UpdateCurrentRingItemVersionResponse> {
    return this.orderingService.updateCurrentRingItemVersion(request);
  }

  @GrpcMethod('OrderingService', 'ListOrderQuotes')
  listOrderQuotes(
    request: ListOrderQuotesRequest,
  ): Promise<ListOrderQuotesResponse> {
    return this.orderingService.listOrderQuotes(request);
  }
}
