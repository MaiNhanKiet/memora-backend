import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrderingGrpcClient } from '../../clients/ordering-grpc.client';
import {
  PayosWebhookBodyDto,
  PayosWebhookResponseDto,
} from '../dto';
import { ApiProcessPayosWebhook } from '../docs/payments.swagger';
import { toProcessPayosWebhookGrpcRequest } from '../mappers/payments-http.mapper';

@ApiTags('commerce-payments')
@Controller('payments')
export class PaymentsWebhookController {
  constructor(private readonly orderingClient: OrderingGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [ORDER-019] POST /api/v1/payments/payos/webhook
  // ---------------------------------------------------------------------------
  @Post('payos/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiProcessPayosWebhook()
  async processPayosWebhook(
    @Body() body: PayosWebhookBodyDto,
  ): Promise<PayosWebhookResponseDto> {
    return this.orderingClient.processPayosWebhook(
      toProcessPayosWebhookGrpcRequest(body),
    );
  }
}
