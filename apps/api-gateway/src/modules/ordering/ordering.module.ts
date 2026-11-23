import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { domainGrpcClientOptions } from '../../common/grpc/domain-grpc';
import { CheckoutOrdersController } from './checkout-orders/controllers/checkout-orders.controller';
import { AdminOrdersController } from './order-management/controllers/admin-orders.controller';
import { OrderQuotesController } from './quotes/controllers/order-quotes.controller';
import { OrderPaymentsController } from './payments/controllers/order-payments.controller';
import { OrderPaymentsSseController } from './payments/controllers/order-payments-sse.controller';
import { AdminPaymentsController } from './payments/controllers/admin-payments.controller';
import { PaymentsWebhookController } from './payments/controllers/payments-webhook.controller';
import { ReceiptsInvoicesController } from './receipts-invoices/controllers/receipts-invoices.controller';
import { ClaimQuotesController } from './claims/controllers/claim-quotes.controller';
import {
  COMMERCE_ORDERING_GRPC_CLIENT,
  OrderingGrpcClient,
} from './clients/ordering-grpc.client';
import { PaymentEventsService } from './payments/services/payment-events.service';
import { MemoryCardsModule } from '../memory/cards/memory-cards.module';

@Module({
  imports: [
    MemoryCardsModule,
    ClientsModule.registerAsync([
      domainGrpcClientOptions({
        name: COMMERCE_ORDERING_GRPC_CLIENT,
        urlConfigKey: 'apiGateway.commerceGrpcUrl',
        protoPackage: 'memora.commerce.v1',
        protoFile: 'commerce/v1/ordering.proto',
      }),
    ]),
  ],
  controllers: [
    CheckoutOrdersController,
    AdminOrdersController,
    OrderQuotesController,
    OrderPaymentsController,
    OrderPaymentsSseController,
    AdminPaymentsController,
    PaymentsWebhookController,
    ReceiptsInvoicesController,
    ClaimQuotesController,
  ],
  providers: [OrderingGrpcClient, PaymentEventsService],
  exports: [OrderingGrpcClient, PaymentEventsService],
})
export class OrderingModule {}
