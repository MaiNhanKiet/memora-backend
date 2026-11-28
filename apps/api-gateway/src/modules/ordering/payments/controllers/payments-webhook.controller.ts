import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@app/common';
import { OrderingGrpcClient } from '../../clients/ordering-grpc.client';
import { PayosWebhookBodyDto, PayosWebhookResponseDto } from '../dto';
import { ApiProcessPayosWebhook } from '../docs/payments.swagger';
import { toProcessPayosWebhookGrpcRequest } from '../mappers/payments-http.mapper';
import { PaymentEventsService } from '../services/payment-events.service';

@ApiTags('commerce-payments')
@Controller('payments')
export class PaymentsWebhookController {
  constructor(
    private readonly orderingClient: OrderingGrpcClient,
    private readonly paymentEventsService: PaymentEventsService,
  ) {}

  // ---------------------------------------------------------------------------
  // [ORDER-019] POST /api/v1/payments/payos/webhook
  // ---------------------------------------------------------------------------
  @Public()
  @Post('payos/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiProcessPayosWebhook()
  async processPayosWebhook(
    @Body() body: PayosWebhookBodyDto,
  ): Promise<PayosWebhookResponseDto> {
    // 1. PayOS test/confirm webhook endpoint validation
    if (body.webhookUrl && !body.signature && !body.data) {
      return {
        success: true,
        message: 'Webhook URL verified successfully',
      };
    }

    // 2. Normal PayOS IPN payment processing
    const res = await this.orderingClient.processPayosWebhook(
      toProcessPayosWebhookGrpcRequest(body),
    );

    if (res.applied && res.orderId) {
      this.paymentEventsService.emitPaymentSucceeded({
        orderId: res.orderId,
        transactionId: res.transactionId,
        status: res.status ?? 'SUCCEEDED',
      });
    }

    const { applied: _applied, ...response } = res;
    return response;
  }
}
