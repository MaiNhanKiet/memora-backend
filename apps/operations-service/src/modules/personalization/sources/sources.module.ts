import { Module } from '@nestjs/common';
import { OrderContextModule } from '../shared/order-context/order-context.module';
import { ListOrderSourcesUseCase } from './application/list-order-sources.use-case';
import { ORDER_SOURCES_REPOSITORY } from './application/order-sources.repository';
import { PrismaOrderSourcesRepository } from './infrastructure/prisma-order-sources.repository';
import { SourcesGrpcController } from './presentation/sources.grpc.controller';

@Module({
  imports: [OrderContextModule],
  controllers: [SourcesGrpcController],
  providers: [
    ListOrderSourcesUseCase,
    {
      provide: ORDER_SOURCES_REPOSITORY,
      useClass: PrismaOrderSourcesRepository,
    },
  ],
})
export class SourcesModule {}
