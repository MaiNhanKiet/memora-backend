import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import type { QueueRedisEnv } from '@app/config';
import { createBullMqSharedOptions } from '@app/queue';
import {
  PROCESSING_WORKER_PORT,
  type ProcessingWorkerPort,
} from './application/processing-worker.port';
import { ProcessSourceUseCase } from './application/process-source.use-case';
import { SOURCE_PROCESSING_REPOSITORY } from './application/source-processing.repository';
import { BullMqSourceProcessingTrigger } from './infrastructure/bullmq-source-processing.trigger';
import { HttpProcessingWorkerAdapter } from './infrastructure/http-processing-worker.adapter';
import { PrismaSourceProcessingRepository } from './infrastructure/prisma-source-processing.repository';
import { SourceProcessingWorker } from './infrastructure/source-processing.worker';
import { UnconfiguredProcessingWorkerAdapter } from './infrastructure/unconfigured-processing-worker.adapter';
import { SOURCE_PROCESSING_QUEUE } from './source-processing.constants';
import { SOURCE_PROCESSING_TRIGGER } from './source-processing.port';

/**
 * PERSO-013. Producer (queue + trigger) and consumer (worker + use case) both live in
 * Operations. Needs QUEUE_REDIS_* (queueRedisConfig) loaded by the service module.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createBullMqSharedOptions({
          ...config.getOrThrow<QueueRedisEnv>('queueRedis'),
          role: 'producer',
        }),
    }),
    BullModule.registerQueue({ name: SOURCE_PROCESSING_QUEUE }),
  ],
  providers: [
    ProcessSourceUseCase,
    SourceProcessingWorker,
    {
      provide: SOURCE_PROCESSING_TRIGGER,
      useClass: BullMqSourceProcessingTrigger,
    },
    {
      provide: SOURCE_PROCESSING_REPOSITORY,
      useClass: PrismaSourceProcessingRepository,
    },
    {
      provide: PROCESSING_WORKER_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ProcessingWorkerPort => {
        const baseUrl = config.get<string>('operations.processingWorkerUrl');
        const secret = config.get<string>('operations.processingWorkerSecret');
        if (baseUrl === undefined || secret === undefined) {
          new Logger('ProcessingWorker').warn(
            'OPERATIONS_PROCESSING_WORKER_* is not fully set: processing jobs will fail with WORKER_UNAVAILABLE',
          );
          return new UnconfiguredProcessingWorkerAdapter();
        }
        return new HttpProcessingWorkerAdapter({
          baseUrl: baseUrl.replace(/\/+$/, ''),
          secret,
        });
      },
    },
  ],
  exports: [SOURCE_PROCESSING_TRIGGER, PROCESSING_WORKER_PORT],
})
export class SourceProcessingModule {}
