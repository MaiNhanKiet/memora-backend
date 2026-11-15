import { Module } from '@nestjs/common';
import { OrderingGrpcController } from '../../presentation/grpc/ordering.grpc.controller';
import { OrderingService } from '../../application/ordering/ordering.service';
import { RepositoriesModule } from '../../repositories/repositories.module';
import { PayosProvider } from '../../infrastructure/payment/payos.provider';

@Module({
  imports: [RepositoriesModule],
  controllers: [OrderingGrpcController],
  providers: [OrderingService, PayosProvider],
  exports: [OrderingService, PayosProvider],
})
export class OrderingModule {}
