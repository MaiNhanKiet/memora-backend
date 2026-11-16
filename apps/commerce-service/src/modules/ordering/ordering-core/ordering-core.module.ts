import { Module } from '@nestjs/common';
import { OrderingGrpcController } from './presentation/ordering.grpc.controller';
import { OrderingService } from './application/ordering.service';
import { OrderingRepository } from './infrastructure/ordering.repository';
import { PayosProvider } from './infrastructure/payment/payos.provider';

@Module({
  controllers: [OrderingGrpcController],
  providers: [OrderingService, OrderingRepository, PayosProvider],
  exports: [OrderingService, OrderingRepository, PayosProvider],
})
export class OrderingCoreModule {}
