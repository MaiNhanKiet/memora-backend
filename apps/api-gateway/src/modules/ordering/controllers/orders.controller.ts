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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrderingGrpcClient } from '../clients/ordering-grpc.client';
import { toVerifiedActor } from '../../../common/grpc/verified-actor';
import {
  CreateOrderBodyDto,
  ListOrdersQueryDto,
  UpdateCurrentRingItemVersionBodyDto,
} from '../dto/ordering.dto';
import {
  ApiCreateOrderDocs,
  ApiGetOrderByIdDocs,
  ApiGetOrderTimelineDocs,
  ApiGetRingItemDetailsDocs,
  ApiListOrderQuotesDocs,
  ApiListOrdersDocs,
  ApiListRingItemVersionsDocs,
  ApiUpdateCurrentRingItemVersionDocs,
} from '../docs/ordering.swagger';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
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
    return this.orderingClient.createOrder({
      actor,
      selectedDraftIds: body.selectedDraftIds,
      fulfillmentMode: body.fulfillmentMode || 'DELIVERY',
      recipientName: body.recipientName,
      recipientPhone: body.recipientPhone,
      recipientEmail: body.recipientEmail,
      deliveryAddressJson: JSON.stringify(body.deliveryAddress),
      sourcePlanMode: body.sourcePlanMode,
      preP1Acknowledgement: body.preP1Acknowledgement
        ? {
            noticeVersion: body.preP1Acknowledgement.noticeVersion,
            privacyNoticeAcknowledged:
              body.preP1Acknowledgement.privacyNoticeAcknowledged,
            p1NonrefundAcknowledged:
              body.preP1Acknowledgement.p1NonrefundAcknowledged,
          }
        : undefined,
    });
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
    return this.orderingClient.listOrders({
      actor,
      page: query.page,
      limit: query.limit,
      status: query.status,
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
    return this.orderingClient.getOrderById({
      actor,
      orderId,
    });
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
    return this.orderingClient.getOrderTimeline({
      actor,
      orderId,
    });
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
    return this.orderingClient.getRingItemDetails({
      actor,
      orderId,
      ringItemId,
    });
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
    return this.orderingClient.listRingItemVersions({
      actor,
      orderId,
      ringItemId,
    });
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
    return this.orderingClient.updateCurrentRingItemVersion({
      actor,
      orderId,
      ringItemId,
      targetSize: body.targetSize,
      changeReason: body.changeReason,
      memoryEnabled: body.memoryEnabled,
      gemstoneSelections: body.gemstoneSelections,
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-010] GET /api/v1/orders/:orderId/quotes
  // ---------------------------------------------------------------------------
  @Get(':orderId/quotes')
  @ApiListOrderQuotesDocs()
  async listOrderQuotes(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    const actor = toVerifiedActor(principal);
    return this.orderingClient.listOrderQuotes({
      actor,
      orderId,
    });
  }
}
