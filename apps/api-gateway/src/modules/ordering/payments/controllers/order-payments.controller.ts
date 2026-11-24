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
import { CreateOrderPaymentLinkBodyDto } from '../dto';
import {
  ApiCreateOrderPaymentLink,
  ApiGetOrderPaymentByIdDocs,
  ApiListOrderPaymentsDocs,
} from '../docs/payments.swagger';
import {
  toCreateOrderPaymentLinkGrpcRequest,
  toGetOrderPaymentByIdGrpcRequest,
  toListOrderPaymentsGrpcRequest,
} from '../mappers/payments-http.mapper';

@ApiTags('commerce-orders')
@Controller('orders')
export class OrderPaymentsController {
  constructor(private readonly orderingClient: OrderingGrpcClient) {}

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
    return this.orderingClient.createOrderPaymentLink(
      toCreateOrderPaymentLinkGrpcRequest(orderId, body, actor),
    );
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
    return this.orderingClient.listOrderPayments(
      toListOrderPaymentsGrpcRequest(actor, orderId),
    );
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
    return this.orderingClient.getOrderPaymentById(
      toGetOrderPaymentByIdGrpcRequest(actor, orderId, transactionId),
    );
  }
}
