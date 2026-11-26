import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../../persistence/prisma/prisma.module';
import { MemoryCardsModule } from '../cards/memory-cards.module';
import { MEMORY_CONTENT_REPOSITORY } from './application/memory-content.repository';
import {
  InitiateMediaUploadUseCase,
  ListCardContentsUseCase,
  UpdateCardContentsUseCase,
} from './application/memory-content.use-cases';
import {
  MEMORY_STORAGE_PORT,
  type MemoryStoragePort,
} from './application/memory-storage.port';
import { MemoryStorageAdapter } from './infrastructure/memory-storage.adapter';
import { PrismaMemoryContentRepository } from './infrastructure/prisma-memory-content.repository';
import { UnconfiguredMemoryStorageAdapter } from './infrastructure/unconfigured-memory-storage.adapter';
import { MemoryContentGrpcController } from './presentation/memory-content.grpc.controller';

@Module({
  imports: [PrismaModule, MemoryCardsModule],
  controllers: [MemoryContentGrpcController],
  providers: [
    {
      provide: MEMORY_STORAGE_PORT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): MemoryStoragePort => {
        const logger = new Logger(MemoryContentsModule.name);
        const endpoint = configService.get<string>(
          'experience.storage.endpoint',
        );
        const publicEndpoint = configService.get<string>(
          'experience.storage.publicEndpoint',
        );
        const region = configService.get<string>('experience.storage.region');
        const bucket = configService.get<string>('experience.storage.bucket');
        const accessKeyId = configService.get<string>(
          'experience.storage.accessKeyId',
        );
        const secretAccessKey = configService.get<string>(
          'experience.storage.secretAccessKey',
        );

        if (
          !endpoint ||
          !region ||
          !bucket ||
          !accessKeyId ||
          !secretAccessKey
        ) {
          logger.warn(
            'Memory object storage is not configured; binding UnconfiguredMemoryStorageAdapter',
          );
          return new UnconfiguredMemoryStorageAdapter();
        }

        return new MemoryStorageAdapter({
          endpoint,
          publicEndpoint: publicEndpoint || endpoint,
          region,
          bucket,
          accessKeyId,
          secretAccessKey,
        });
      },
    },
    {
      provide: MEMORY_CONTENT_REPOSITORY,
      useClass: PrismaMemoryContentRepository,
    },
    ListCardContentsUseCase,
    UpdateCardContentsUseCase,
    InitiateMediaUploadUseCase,
  ],
  exports: [MEMORY_CONTENT_REPOSITORY, MEMORY_STORAGE_PORT],
})
export class MemoryContentsModule {}
