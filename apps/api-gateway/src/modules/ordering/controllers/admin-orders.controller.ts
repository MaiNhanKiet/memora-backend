import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '@app/auth';
import type { AuthenticatedPrincipal } from '@app/auth';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrderingGrpcClient } from '../clients/ordering-grpc.client';
import {
  ListAdminOrdersQueryDto,
  UpdateOrderStatusBodyDto,
} from '../dto/ordering.dto';
import {
  ApiGetAdminOrderDetailsDocs,
  ApiListAdminOrdersDocs,
  ApiUpdateOrderStatusDocs,
} from '../docs/ordering.swagger';

@ApiTags('Admin Orders')
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
    return this.orderingClient.listAdminOrders({
      page: query.page,
      limit: query.limit,
      status: query.status,
      search: query.search,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-ADMIN-01] GET /api/v1/admin/orders/:orderId
  // ---------------------------------------------------------------------------
  @Get(':orderId')
  @HttpCode(HttpStatus.OK)
  @ApiGetAdminOrderDetailsDocs()
  async getAdminOrderDetails(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.orderingClient.getAdminOrderDetails({ orderId });
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
    return this.orderingClient.updateOrderStatus({
      orderId,
      targetStatus: body.targetStatus,
      reason: body.reason,
      staffUserId: user?.userId,
    });
  }
}
