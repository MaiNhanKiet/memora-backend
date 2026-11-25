import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../persistence/prisma/prisma.module';
import { MemoryCardsModule } from '../cards/memory-cards.module';
import { MEMORY_CONTENT_REPOSITORY } from './application/memory-content.repository';
import {
  InitiateMediaUploadUseCase,
  ListCardContentsUseCase,
  UpdateCardContentsUseCase,
} from './application/memory-content.use-cases';
import { MEMORY_STORAGE_PORT } from './application/memory-storage.port';
import { MemoryStorageAdapter } from './infrastructure/memory-storage.adapter';
import { PrismaMemoryContentRepository } from './infrastructure/prisma-memory-content.repository';
import { MemoryContentGrpcController } from './presentation/memory-content.grpc.controller';

@Module({
  imports: [PrismaModule, MemoryCardsModule],
  controllers: [MemoryContentGrpcController],
  providers: [
    MemoryStorageAdapter,
    { provide: MEMORY_STORAGE_PORT, useExisting: MemoryStorageAdapter },
    {
      provide: MEMORY_CONTENT_REPOSITORY,
      useClass: PrismaMemoryContentRepository,
    },
    ListCardContentsUseCase,
    UpdateCardContentsUseCase,
    InitiateMediaUploadUseCase,
  ],
  exports: [
    MEMORY_CONTENT_REPOSITORY,
    MEMORY_STORAGE_PORT,
    MemoryStorageAdapter,
  ],
})
export class MemoryContentsModule {}
