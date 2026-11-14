import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import type {
  CreateOrderRequest,
  CreateOrderResponse,
  GetOrderByIdRequest,
  GetOrderByIdResponse,
  GetOrderTimelineRequest,
  GetOrderTimelineResponse,
  GetRingItemDetailsRequest,
  GetRingItemDetailsResponse,
  ListOrdersRequest,
  ListOrdersResponse,
  OrderingServiceHandler,
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
}
