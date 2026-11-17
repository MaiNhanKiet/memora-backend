import {
  Controller,
  Param,
  ParseUUIDPipe,
  Sse,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { MessageEvent } from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { AuthenticatedPrincipal } from '@app/auth';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { toVerifiedActor } from '../../../../common/grpc/verified-actor';
import { OrderingGrpcClient } from '../../clients/ordering-grpc.client';
import { ApiPaymentSseStreamDocs } from '../docs/payments.swagger';
import { toListOrderPaymentsGrpcRequest } from '../mappers/payments-http.mapper';
import { PaymentEventsService } from '../services/payment-events.service';

@ApiTags('commerce-orders')
@Controller('orders')
export class OrderPaymentsSseController {
  constructor(
    private readonly orderingClient: OrderingGrpcClient,
    private readonly paymentEventsService: PaymentEventsService,
  ) {}

  // ---------------------------------------------------------------------------
  // [ORDER-019-SSE] GET /api/v1/orders/:orderId/payments/stream
  // ---------------------------------------------------------------------------
  @Sse(':orderId/payments/stream')
  @ApiPaymentSseStreamDocs()
  async paymentStream(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<Observable<MessageEvent>> {
    // 1. Verify resource ownership via gRPC
    const actor = toVerifiedActor(principal);
    await this.orderingClient.listOrderPayments(
      toListOrderPaymentsGrpcRequest(actor, orderId),
    );

    // 2. Return SSE Observable stream
    return this.paymentEventsService.subscribePaymentEvents(orderId);
  }
}
