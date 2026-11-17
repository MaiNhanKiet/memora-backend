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
import { Roles } from '@app/auth';
import type { AuthenticatedPrincipal } from '@app/auth';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { toPaginatedSuccessResponse } from '../../../../common/mappers/paginated-success.mapper';
import { OrderingGrpcClient } from '../../clients/ordering-grpc.client';
import {
  CreateFinalQuoteBodyDto,
  ListAdminOrdersQueryDto,
  UpdateFinalQuoteBodyDto,
  UpdateOrderStatusBodyDto,
} from '../dto';
import {
  ApiCreateFinalQuoteDocs,
  ApiGetAdminOrderDetailsDocs,
  ApiListAdminOrdersDocs,
  ApiPublishFinalQuoteDocs,
  ApiUpdateFinalQuoteDocs,
  ApiUpdateOrderStatusDocs,
} from '../docs/order-management.swagger';
import {
  toCreateFinalQuoteGrpcRequest,
  toGetAdminOrderDetailsGrpcRequest,
  toListAdminOrdersGrpcRequest,
  toPublishFinalQuoteGrpcRequest,
  toUpdateFinalQuoteGrpcRequest,
  toUpdateOrderStatusGrpcRequest,
} from '../mappers/order-management-http.mapper';

@ApiTags('commerce-admin-orders')
@Controller('admin/orders')
@Roles('STORE_MANAGER', 'STORE_STAFF', 'SUPER_ADMIN', 'ADMIN', 'MANAGER')
export class AdminOrdersController {
  constructor(private readonly orderingClient: OrderingGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [ORDER-006] GET /api/v1/admin/orders
  // ---------------------------------------------------------------------------
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiListAdminOrdersDocs()
  async listAdminOrders(@Query() query: ListAdminOrdersQueryDto) {
    const res = await this.orderingClient.listAdminOrders(
      toListAdminOrdersGrpcRequest(query),
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
  // [ORDER-ADMIN-01] GET /api/v1/admin/orders/:orderId
  // ---------------------------------------------------------------------------
  @Get(':orderId')
  @HttpCode(HttpStatus.OK)
  @ApiGetAdminOrderDetailsDocs()
  async getAdminOrderDetails(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.orderingClient.getAdminOrderDetails(
      toGetAdminOrderDetailsGrpcRequest(orderId),
    );
  }

  // ---------------------------------------------------------------------------
  // [ORDER-ADMIN-02] PATCH /api/v1/admin/orders/:orderId/status
  // ---------------------------------------------------------------------------
  @Patch(':orderId/status')
  @HttpCode(HttpStatus.OK)
  @ApiUpdateOrderStatusDocs()
  async updateOrderStatus(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() body: UpdateOrderStatusBodyDto,
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    return this.orderingClient.updateOrderStatus(
      toUpdateOrderStatusGrpcRequest(orderId, body, user?.userId),
    );
  }

  // ---------------------------------------------------------------------------
  // [ORDER-011] POST /api/v1/admin/orders/:orderId/quotes
  // ---------------------------------------------------------------------------
  @Post(':orderId/quotes')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateFinalQuoteDocs()
  async createFinalQuote(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() body: CreateFinalQuoteBodyDto,
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    return this.orderingClient.createFinalQuote(
      toCreateFinalQuoteGrpcRequest(orderId, body, user?.userId),
    );
  }

  // ---------------------------------------------------------------------------
  // [ORDER-012] PATCH /api/v1/admin/orders/:orderId/quotes/:quoteId
  // ---------------------------------------------------------------------------
  @Patch(':orderId/quotes/:quoteId')
  @HttpCode(HttpStatus.OK)
  @ApiUpdateFinalQuoteDocs()
  async updateFinalQuote(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
    @Body() body: UpdateFinalQuoteBodyDto,
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    return this.orderingClient.updateFinalQuote(
      toUpdateFinalQuoteGrpcRequest(orderId, quoteId, body, user?.userId),
    );
  }

  // ---------------------------------------------------------------------------
  // [ORDER-013 Part A] POST /api/v1/admin/orders/:orderId/quotes/:quoteId/publish
  // ---------------------------------------------------------------------------
  @Post(':orderId/quotes/:quoteId/publish')
  @HttpCode(HttpStatus.OK)
  @ApiPublishFinalQuoteDocs()
  async publishFinalQuote(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    return this.orderingClient.publishFinalQuote(
      toPublishFinalQuoteGrpcRequest(orderId, quoteId, user?.userId),
    );
  }
}
