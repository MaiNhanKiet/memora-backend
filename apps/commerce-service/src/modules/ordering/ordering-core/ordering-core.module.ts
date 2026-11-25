import { Module } from '@nestjs/common';
import { CreateOrderUseCase } from './application/create-order.use-case';
import { OrderLifecycleUseCases } from './application/order-lifecycle.use-cases';
import { OrderQueryUseCases } from './application/order-query.use-cases';
import { ORDERING_REPOSITORY } from './application/ordering.repository';
import { PaymentUseCases } from './application/payment.use-cases';
import { QuoteUseCases } from './application/quote.use-cases';
import { PayosProvider } from './infrastructure/payment/payos.provider';
import { PrismaOrderingRepository } from './infrastructure/prisma-ordering.repository';
import { OrderingGrpcController } from './presentation/ordering.grpc.controller';

@Module({
  controllers: [OrderingGrpcController],
  providers: [
    CreateOrderUseCase,
    OrderQueryUseCases,
    OrderLifecycleUseCases,
    QuoteUseCases,
    PaymentUseCases,
    PayosProvider,
    { provide: ORDERING_REPOSITORY, useClass: PrismaOrderingRepository },
  ],
  exports: [ORDERING_REPOSITORY, PayosProvider],
})
export class OrderingCoreModule {}
