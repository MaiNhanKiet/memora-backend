import { Module } from '@nestjs/common';
import { OrderingGrpcController } from '../../presentation/grpc/ordering.grpc.controller';
import { OrderingService } from '../../application/ordering/ordering.service';
import { RepositoriesModule } from '../../repositories/repositories.module';

@Module({
  imports: [RepositoriesModule],
  controllers: [OrderingGrpcController],
  providers: [OrderingService],
  exports: [OrderingService],
})
export class OrderingModule {}
