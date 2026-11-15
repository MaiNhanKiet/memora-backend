import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { OrderingGrpcClient } from '../clients/ordering-grpc.client';
import { ApiProcessPayosWebhook } from '../docs/payos-payments.swagger';
import {
  PayosWebhookBodyDto,
  PayosWebhookResponseDto,
} from '../dto/payos-payments.dto';

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
    const dataJson =
      typeof body.data === 'string' ? body.data : JSON.stringify(body.data);

    const result = await this.orderingClient.processPayosWebhook({
      code: body.code,
      desc: body.desc,
      success: body.success,
      dataJson,
      signature: body.signature,
    });

    return result;
  }
}
