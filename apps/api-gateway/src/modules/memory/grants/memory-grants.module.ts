import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import {
  experienceMemoryGrpcClientOptions,
  MemoryGrpcClient,
} from '../clients/memory-grpc.client';
import { MemoryGrantsController } from './controllers/memory-grants.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([experienceMemoryGrpcClientOptions()]),
  ],
  controllers: [MemoryGrantsController],
  providers: [MemoryGrpcClient],
  exports: [MemoryGrpcClient],
})
export class MemoryGrantsModule {}
