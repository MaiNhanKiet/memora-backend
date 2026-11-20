import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import {
  experienceMemoryGrpcClientOptions,
  MemoryGrpcClient,
} from '../clients/memory-grpc.client';
import { MemoryCardsController } from './controllers/memory-cards.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([experienceMemoryGrpcClientOptions()]),
  ],
  controllers: [MemoryCardsController],
  providers: [MemoryGrpcClient],
  exports: [MemoryGrpcClient],
})
export class MemoryCardsModule {}
