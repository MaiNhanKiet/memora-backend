import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedPrincipal } from '@app/auth';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { toVerifiedActor } from '../../../../common/grpc/verified-actor';
import { OrderingGrpcClient } from '../../clients/ordering-grpc.client';
import {
  ConfirmFinalQuoteBodyDto,
  RejectFinalQuoteBodyDto,
} from '../dto';
import {
  ApiConfirmFinalQuoteDocs,
  ApiGetOrderFinalConfirmationsDocs,
  ApiGetOrderQuoteByIdDocs,
  ApiListOrderQuotesDocs,
  ApiRejectFinalQuoteDocs,
} from '../docs/order-quotes.swagger';
import {
  toConfirmFinalQuoteGrpcRequest,
  toGetOrderFinalConfirmationsGrpcRequest,
  toGetOrderQuoteByIdGrpcRequest,
  toListOrderQuotesGrpcRequest,
  toRejectFinalQuoteGrpcRequest,
} from '../mappers/order-quotes-http.mapper';

@ApiTags('commerce-orders')
@Controller('orders')
export class OrderQuotesController {
  constructor(private readonly orderingClient: OrderingGrpcClient) {}

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
    return this.orderingClient.listOrderQuotes(
      toListOrderQuotesGrpcRequest(actor, orderId),
    );
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
    return this.orderingClient.getOrderQuoteById(
      toGetOrderQuoteByIdGrpcRequest(actor, orderId, quoteId),
    );
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
    return this.orderingClient.confirmFinalQuote(
      toConfirmFinalQuoteGrpcRequest(actor, orderId, body),
    );
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
    return this.orderingClient.confirmFinalQuote(
      toConfirmFinalQuoteGrpcRequest(actor, orderId, body),
    );
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
    return this.orderingClient.rejectFinalQuote(
      toRejectFinalQuoteGrpcRequest(actor, orderId, body),
    );
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
    return this.orderingClient.rejectFinalQuote(
      toRejectFinalQuoteGrpcRequest(actor, orderId, body, quoteId),
    );
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
    return this.orderingClient.getOrderFinalConfirmations(
      toGetOrderFinalConfirmationsGrpcRequest(actor, orderId),
    );
  }
}
