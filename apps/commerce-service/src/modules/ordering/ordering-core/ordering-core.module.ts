import { Module } from '@nestjs/common';
import { OPERATIONS_CLAIM_ACCESS } from './application/operations-claim-access.port';
import { GrpcOperationsClaimAccess } from './infrastructure/grpc-operations-claim-access';
import {
  AcceptServiceQuoteUseCase,
  ListClaimQuotesUseCase,
} from './application/claim-quote.use-cases';
import { ApplyRingItemReviewTransitionUseCase } from './application/apply-ring-item-review-transition.use-case';
import { CreateOrderUseCase } from './application/create-order.use-case';
import {
  ConfirmFinalQuoteUseCase,
  CreateFinalQuoteUseCase,
  PublishFinalQuoteUseCase,
  RejectFinalQuoteUseCase,
  UpdateFinalQuoteUseCase,
} from './application/final-quote.use-cases';
import {
  CancelOrderUseCase,
  UpdateOrderStatusUseCase,
} from './application/order-lifecycle.use-cases';
import {
  GetAdminOrderDetailsUseCase,
  GetOrderByIdUseCase,
  GetOrderPersonalizationContextUseCase,
  GetOrderTimelineUseCase,
  ListAdminOrdersUseCase,
  ListOrdersUseCase,
} from './application/order-query.use-cases';
import {
  GetOrderFinalConfirmationsUseCase,
  GetOrderQuoteByIdUseCase,
  ListOrderQuotesUseCase,
} from './application/order-quote-query.use-cases';
import { ORDERING_REPOSITORY } from './application/ordering.repository';
import {
  CreateRefundRequestUseCase,
  GetOrderInvoiceUseCase,
  GetOrderPaymentByIdUseCase,
  GetPaymentReceiptUseCase,
  ListOrderPaymentsUseCase,
} from './application/payment-query-and-refund.use-cases';
import {
  CreateClaimPaymentLinkUseCase,
  CreateOrderPaymentLinkUseCase,
  ProcessPayosWebhookUseCase,
  ReconcilePaymentTransactionUseCase,
} from './application/payos-payment.use-cases';
import { PAYOS_GATEWAY } from './application/payos.gateway';
import {
  GetRingItemDetailsUseCase,
  ListRingItemVersionsUseCase,
  UpdateCurrentRingItemVersionUseCase,
} from './application/ring-item.use-cases';
import { PayosProvider } from './infrastructure/payment/payos.provider';
import { PrismaOrderingRepository } from './infrastructure/prisma-ordering.repository';
import { OrderingGrpcController } from './presentation/ordering.grpc.controller';

@Module({
  controllers: [OrderingGrpcController],
  providers: [
    { provide: OPERATIONS_CLAIM_ACCESS, useClass: GrpcOperationsClaimAccess },
    ApplyRingItemReviewTransitionUseCase,
    CreateOrderUseCase,
    ListOrdersUseCase,
    GetOrderByIdUseCase,
    GetOrderTimelineUseCase,
    ListAdminOrdersUseCase,
    GetAdminOrderDetailsUseCase,
    GetOrderPersonalizationContextUseCase,
    GetRingItemDetailsUseCase,
    ListRingItemVersionsUseCase,
    UpdateCurrentRingItemVersionUseCase,
    UpdateOrderStatusUseCase,
    CancelOrderUseCase,
    ListOrderQuotesUseCase,
    GetOrderQuoteByIdUseCase,
    GetOrderFinalConfirmationsUseCase,
    CreateFinalQuoteUseCase,
    UpdateFinalQuoteUseCase,
    PublishFinalQuoteUseCase,
    ConfirmFinalQuoteUseCase,
    RejectFinalQuoteUseCase,
    ListClaimQuotesUseCase,
    AcceptServiceQuoteUseCase,
    ListOrderPaymentsUseCase,
    GetOrderPaymentByIdUseCase,
    GetPaymentReceiptUseCase,
    GetOrderInvoiceUseCase,
    CreateRefundRequestUseCase,
    CreateOrderPaymentLinkUseCase,
    ProcessPayosWebhookUseCase,
    ReconcilePaymentTransactionUseCase,
    CreateClaimPaymentLinkUseCase,
    PayosProvider,
    { provide: PAYOS_GATEWAY, useExisting: PayosProvider },
    { provide: ORDERING_REPOSITORY, useClass: PrismaOrderingRepository },
  ],
  exports: [ORDERING_REPOSITORY, PAYOS_GATEWAY, PayosProvider],
})
export class OrderingCoreModule {}
