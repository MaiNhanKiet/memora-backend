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
import { Public } from '@app/common';
import { OrderingGrpcClient } from '../clients/ordering-grpc.client';
import {
  ExtractOrderActor,
  type OrderActor,
} from '../decorators/extract-order-actor.decorator';
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
  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateOrderDocs()
  async createOrder(
    @ExtractOrderActor() actor: OrderActor,
    @Body() body: CreateOrderBodyDto,
  ) {
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
  @Public()
  @Get()
  @ApiListOrdersDocs()
  async listOrders(
    @ExtractOrderActor() actor: OrderActor,
    @Query() query: ListOrdersQueryDto,
  ) {
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
  @Public()
  @Get(':orderId')
  @ApiGetOrderByIdDocs()
  async getOrderById(
    @ExtractOrderActor() actor: OrderActor,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.orderingClient.getOrderById({
      actor,
      orderId,
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-004] GET /api/v1/orders/:orderId/timeline
  // ---------------------------------------------------------------------------
  @Public()
  @Get(':orderId/timeline')
  @ApiGetOrderTimelineDocs()
  async getOrderTimeline(
    @ExtractOrderActor() actor: OrderActor,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.orderingClient.getOrderTimeline({
      actor,
      orderId,
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-007] GET /api/v1/orders/:orderId/items/:ringItemId
  // ---------------------------------------------------------------------------
  @Public()
  @Get(':orderId/items/:ringItemId')
  @ApiGetRingItemDetailsDocs()
  async getRingItemDetails(
    @ExtractOrderActor() actor: OrderActor,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('ringItemId', ParseUUIDPipe) ringItemId: string,
  ) {
    return this.orderingClient.getRingItemDetails({
      actor,
      orderId,
      ringItemId,
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-008] GET /api/v1/orders/:orderId/items/:ringItemId/versions
  // ---------------------------------------------------------------------------
  @Public()
  @Get(':orderId/items/:ringItemId/versions')
  @ApiListRingItemVersionsDocs()
  async listRingItemVersions(
    @ExtractOrderActor() actor: OrderActor,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('ringItemId', ParseUUIDPipe) ringItemId: string,
  ) {
    return this.orderingClient.listRingItemVersions({
      actor,
      orderId,
      ringItemId,
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-009] PATCH /api/v1/orders/:orderId/items/:ringItemId/versions/current
  // ---------------------------------------------------------------------------
  @Public()
  @Patch(':orderId/items/:ringItemId/versions/current')
  @HttpCode(HttpStatus.OK)
  @ApiUpdateCurrentRingItemVersionDocs()
  async updateCurrentRingItemVersion(
    @ExtractOrderActor() actor: OrderActor,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('ringItemId', ParseUUIDPipe) ringItemId: string,
    @Body() body: UpdateCurrentRingItemVersionBodyDto,
  ) {
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
  @Public()
  @Get(':orderId/quotes')
  @ApiListOrderQuotesDocs()
  async listOrderQuotes(
    @ExtractOrderActor() actor: OrderActor,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.orderingClient.listOrderQuotes({
      actor,
      orderId,
    });
  }
}
