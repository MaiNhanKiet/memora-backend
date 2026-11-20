import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../persistence/prisma/prisma.module';
import { MemoryCardsModule } from '../cards/memory-cards.module';
import { MemoryContentService } from './application/memory-content.service';
import { MemoryContentRepository } from './infrastructure/memory-content.repository';
import { MemoryStorageAdapter } from './infrastructure/memory-storage.adapter';
import { MemoryContentGrpcController } from './presentation/memory-content.grpc.controller';

@Module({
  imports: [PrismaModule, MemoryCardsModule],
  controllers: [MemoryContentGrpcController],
  providers: [
    MemoryStorageAdapter,
    MemoryContentRepository,
    MemoryContentService,
  ],
  exports: [MemoryContentService, MemoryContentRepository, MemoryStorageAdapter],
})
export class MemoryContentsModule {}
