import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedPrincipal } from '@app/auth';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { toVerifiedActor } from '../../../../common/grpc/verified-actor';
import { toPaginatedSuccessResponse } from '../../../../common/mappers/paginated-success.mapper';
import { OrderingGrpcClient } from '../../clients/ordering-grpc.client';
import {
  CancelOrderBodyDto,
  CreateOrderBodyDto,
  ListOrdersQueryDto,
  UpdateCurrentRingItemVersionBodyDto,
} from '../dto';
import {
  ApiCancelOrderDocs,
  ApiCreateOrderDocs,
  ApiGetOrderByIdDocs,
  ApiGetOrderTimelineDocs,
  ApiGetRingItemDetailsDocs,
  ApiListOrdersDocs,
  ApiListRingItemVersionsDocs,
  ApiUpdateCurrentRingItemVersionDocs,
} from '../docs/checkout-orders.swagger';
import {
  toCancelOrderGrpcRequest,
  toCreateOrderGrpcRequest,
  toGetOrderByIdGrpcRequest,
  toGetOrderTimelineGrpcRequest,
  toGetRingItemDetailsGrpcRequest,
  toListOrdersGrpcRequest,
  toListRingItemVersionsGrpcRequest,
  toUpdateCurrentRingItemVersionGrpcRequest,
} from '../mappers/checkout-orders-http.mapper';

@ApiTags('commerce-orders')
@Controller('orders')
export class CheckoutOrdersController {
  constructor(private readonly orderingClient: OrderingGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [ORDER-001] POST /api/v1/orders
  // ---------------------------------------------------------------------------
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateOrderDocs()
  async createOrder(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: CreateOrderBodyDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.orderingClient.createOrder(
      toCreateOrderGrpcRequest(actor, body),
    );
  }

  // ---------------------------------------------------------------------------
  // [ORDER-002] GET /api/v1/orders
  // ---------------------------------------------------------------------------
  @Get()
  @ApiListOrdersDocs()
  async listOrders(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Query() query: ListOrdersQueryDto,
  ) {
    const actor = toVerifiedActor(principal);
    const res = await this.orderingClient.listOrders(
      toListOrdersGrpcRequest(actor, query),
    );
    const page = res.page ?? query.page ?? 1;
    const limit = res.limit ?? query.limit ?? 20;
    const total = res.total ?? 0;
    const totalPages = total <= 0 ? 0 : Math.ceil(total / limit);

    return toPaginatedSuccessResponse({
      data: res.items ?? [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-003] GET /api/v1/orders/:orderId
  // ---------------------------------------------------------------------------
  @Get(':orderId')
  @ApiGetOrderByIdDocs()
  async getOrderById(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    const actor = toVerifiedActor(principal);
    return this.orderingClient.getOrderById(
      toGetOrderByIdGrpcRequest(actor, orderId),
    );
  }

  // ---------------------------------------------------------------------------
  // [ORDER-004] GET /api/v1/orders/:orderId/timeline
  // ---------------------------------------------------------------------------
  @Get(':orderId/timeline')
  @ApiGetOrderTimelineDocs()
  async getOrderTimeline(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    const actor = toVerifiedActor(principal);
    return this.orderingClient.getOrderTimeline(
      toGetOrderTimelineGrpcRequest(actor, orderId),
    );
  }

  // ---------------------------------------------------------------------------
  // [ORDER-007] GET /api/v1/orders/:orderId/items/:ringItemId
  // ---------------------------------------------------------------------------
  @Get(':orderId/items/:ringItemId')
  @ApiGetRingItemDetailsDocs()
  async getRingItemDetails(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('ringItemId', ParseUUIDPipe) ringItemId: string,
  ) {
    const actor = toVerifiedActor(principal);
    return this.orderingClient.getRingItemDetails(
      toGetRingItemDetailsGrpcRequest(actor, orderId, ringItemId),
    );
  }

  // ---------------------------------------------------------------------------
  // [ORDER-008] GET /api/v1/orders/:orderId/items/:ringItemId/versions
  // ---------------------------------------------------------------------------
  @Get(':orderId/items/:ringItemId/versions')
  @ApiListRingItemVersionsDocs()
  async listRingItemVersions(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('ringItemId', ParseUUIDPipe) ringItemId: string,
  ) {
    const actor = toVerifiedActor(principal);
    return this.orderingClient.listRingItemVersions(
      toListRingItemVersionsGrpcRequest(actor, orderId, ringItemId),
    );
  }

  // ---------------------------------------------------------------------------
  // [ORDER-009] PATCH /api/v1/orders/:orderId/items/:ringItemId/versions/current
  // ---------------------------------------------------------------------------
  @Patch(':orderId/items/:ringItemId/versions/current')
  @HttpCode(HttpStatus.OK)
  @ApiUpdateCurrentRingItemVersionDocs()
  async updateCurrentRingItemVersion(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('ringItemId', ParseUUIDPipe) ringItemId: string,
    @Body() body: UpdateCurrentRingItemVersionBodyDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.orderingClient.updateCurrentRingItemVersion(
      toUpdateCurrentRingItemVersionGrpcRequest(actor, orderId, ringItemId, body),
    );
  }

  // ---------------------------------------------------------------------------
  // [ORDER-005] POST /api/v1/orders/:orderId/cancel (and /cancel-requests)
  // ---------------------------------------------------------------------------
  @Post(':orderId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiCancelOrderDocs()
  async cancelOrder(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() body: CancelOrderBodyDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.orderingClient.cancelOrder(
      toCancelOrderGrpcRequest(actor, orderId, body),
    );
  }

  @Post(':orderId/cancel-requests')
  @HttpCode(HttpStatus.OK)
  @ApiCancelOrderDocs()
  async cancelOrderRequest(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() body: CancelOrderBodyDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.orderingClient.cancelOrder(
      toCancelOrderGrpcRequest(actor, orderId, body),
    );
  }
}
