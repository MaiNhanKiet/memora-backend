import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import {
  experienceMemoryGrpcClientOptions,
  MemoryGrpcClient,
} from '../clients/memory-grpc.client';
import { MemoryContentsController } from './controllers/memory-contents.controller';

@Module({
  imports: [ClientsModule.registerAsync([experienceMemoryGrpcClientOptions()])],
  controllers: [MemoryContentsController],
  providers: [MemoryGrpcClient],
  exports: [MemoryGrpcClient],
})
export class MemoryContentsModule {}
