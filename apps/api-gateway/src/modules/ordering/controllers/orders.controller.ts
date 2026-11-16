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
import { toPaginatedSuccessResponse } from '../../../common/mappers/paginated-success.mapper';
import { OrderingGrpcClient } from '../clients/ordering-grpc.client';
import { toVerifiedActor } from '../../../common/grpc/verified-actor';
import {
  CancelOrderBodyDto,
  ConfirmFinalQuoteBodyDto,
  CreateOrderBodyDto,
  ListOrdersQueryDto,
  RejectFinalQuoteBodyDto,
  UpdateCurrentRingItemVersionBodyDto,
} from '../dto/ordering.dto';
import { CreateOrderPaymentLinkBodyDto } from '../dto/payos-payments.dto';
import { ApiCreateOrderPaymentLink } from '../docs/payos-payments.swagger';
import {
  ApiCancelOrderDocs,
  ApiConfirmFinalQuoteDocs,
  ApiCreateOrderDocs,
  ApiGetOrderByIdDocs,
  ApiGetOrderFinalConfirmationsDocs,
  ApiGetOrderInvoiceDocs,
  ApiGetOrderPaymentByIdDocs,
  ApiGetOrderQuoteByIdDocs,
  ApiGetOrderTimelineDocs,
  ApiGetPaymentReceiptDocs,
  ApiGetRingItemDetailsDocs,
  ApiListOrderPaymentsDocs,
  ApiListOrderQuotesDocs,
  ApiListOrdersDocs,
  ApiListRingItemVersionsDocs,
  ApiRejectFinalQuoteDocs,
  ApiUpdateCurrentRingItemVersionDocs,
} from '../docs/ordering.swagger';

@ApiTags('commerce-orders')
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
    const res = await this.orderingClient.listOrders({
      actor,
      page: query.page,
      limit: query.limit,
      status: query.status,
    });
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
    return this.orderingClient.cancelOrder({
      actor,
      orderId,
      reason: body?.reason,
    });
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
    return this.orderingClient.cancelOrder({
      actor,
      orderId,
      reason: body?.reason,
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-013 Part B] GET /api/v1/orders/:orderId/quotes/:quoteId
  // ---------------------------------------------------------------------------
  @Get(':orderId/quotes/:quoteId')
  @ApiGetOrderQuoteByIdDocs()
  async getOrderQuoteById(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
  ) {
    const actor = toVerifiedActor(principal);
    return this.orderingClient.getOrderQuoteById({
      actor,
      orderId,
      quoteId,
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-014] POST /api/v1/orders/:orderId/final-confirmations (and /quotes/confirm)
  // ---------------------------------------------------------------------------
  @Post(':orderId/final-confirmations')
  @HttpCode(HttpStatus.OK)
  @ApiConfirmFinalQuoteDocs()
  async confirmFinalQuote(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() body: ConfirmFinalQuoteBodyDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.orderingClient.confirmFinalQuote({
      actor,
      orderId,
      quoteId: body?.quoteId,
      notes: body?.notes,
    });
  }

  @Post(':orderId/quotes/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiConfirmFinalQuoteDocs()
  async confirmFinalQuoteAlias(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() body: ConfirmFinalQuoteBodyDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.orderingClient.confirmFinalQuote({
      actor,
      orderId,
      quoteId: body?.quoteId,
      notes: body?.notes,
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-015 Part B] POST /api/v1/orders/:orderId/quotes/reject
  // ---------------------------------------------------------------------------
  @Post(':orderId/quotes/reject')
  @HttpCode(HttpStatus.OK)
  @ApiRejectFinalQuoteDocs()
  async rejectFinalQuote(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() body: RejectFinalQuoteBodyDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.orderingClient.rejectFinalQuote({
      actor,
      orderId,
      quoteId: body?.quoteId,
      reason: body.reason,
    });
  }

  @Post(':orderId/quotes/:quoteId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiRejectFinalQuoteDocs()
  async rejectFinalQuoteWithParam(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
    @Body() body: RejectFinalQuoteBodyDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.orderingClient.rejectFinalQuote({
      actor,
      orderId,
      quoteId,
      reason: body.reason,
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-015 Part A] GET /api/v1/orders/:orderId/final-confirmations
  // ---------------------------------------------------------------------------
  @Get(':orderId/final-confirmations')
  @ApiGetOrderFinalConfirmationsDocs()
  async getOrderFinalConfirmations(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    const actor = toVerifiedActor(principal);
    return this.orderingClient.getOrderFinalConfirmations({
      actor,
      orderId,
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-017] GET /api/v1/orders/:orderId/payments
  // ---------------------------------------------------------------------------
  @Get(':orderId/payments')
  @ApiListOrderPaymentsDocs()
  async listOrderPayments(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    const actor = toVerifiedActor(principal);
    return this.orderingClient.listOrderPayments({
      actor,
      orderId,
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-018] GET /api/v1/orders/:orderId/payments/:transactionId
  // ---------------------------------------------------------------------------
  @Get(':orderId/payments/:transactionId')
  @ApiGetOrderPaymentByIdDocs()
  async getOrderPaymentById(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
  ) {
    const actor = toVerifiedActor(principal);
    return this.orderingClient.getOrderPaymentById({
      actor,
      orderId,
      transactionId,
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-021] GET /api/v1/orders/:orderId/payments/:transactionId/receipt
  // ---------------------------------------------------------------------------
  @Get(':orderId/payments/:transactionId/receipt')
  @ApiGetPaymentReceiptDocs()
  async getPaymentReceipt(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
  ) {
    const actor = toVerifiedActor(principal);
    return this.orderingClient.getPaymentReceipt({
      actor,
      orderId,
      transactionId,
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-022] GET /api/v1/orders/:orderId/invoice
  // ---------------------------------------------------------------------------
  @Get(':orderId/invoice')
  @ApiGetOrderInvoiceDocs()
  async getOrderInvoice(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    const actor = toVerifiedActor(principal);
    return this.orderingClient.getOrderInvoice({
      actor,
      orderId,
    });
  }

  // ---------------------------------------------------------------------------
  // [ORDER-016] POST /api/v1/orders/:orderId/payments
  // ---------------------------------------------------------------------------
  @Post(':orderId/payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateOrderPaymentLink()
  async createOrderPaymentLink(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() body: CreateOrderPaymentLinkBodyDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.orderingClient.createOrderPaymentLink({
      orderId,
      paymentStage: body.paymentStage,
      returnUrl: body.returnUrl,
      cancelUrl: body.cancelUrl,
      actor,
    });
  }
}
