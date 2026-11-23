import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnrecoverableError, Worker, type Job } from 'bullmq';
import type { QueueRedisEnv } from '@app/config';
import {
  createMemoraWorkerOptions,
  registerWorkerJobLogging,
} from '@app/queue';
import { ProcessSourceUseCase } from '../application/process-source.use-case';
import {
  SOURCE_PROCESSING_BACKOFF_TYPE,
  SOURCE_PROCESSING_CONCURRENCY,
  SOURCE_PROCESSING_QUEUE,
  SOURCE_PROCESSING_RETRY_DELAYS_MS,
} from '../source-processing.constants';

/**
 * Consumer of the PERSO-013 queue. It uses its own worker connection (role=worker); the
 * producer connection stays fail-fast for the gRPC path. Retries use the 30 s / 2 min / 8 min
 * schedule; a terminal failure throws UnrecoverableError so BullMQ does not retry it.
 */
@Injectable()
export class SourceProcessingWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SourceProcessingWorker.name);
  private worker: Worker | undefined;

  constructor(
    private readonly config: ConfigService,
    private readonly processSource: ProcessSourceUseCase,
  ) {}

  onModuleInit(): void {
    const queueRedis = this.config.getOrThrow<QueueRedisEnv>('queueRedis');
    const options = createMemoraWorkerOptions({
      ...queueRedis,
      role: 'worker',
      workerConcurrency: SOURCE_PROCESSING_CONCURRENCY,
    });
    this.worker = new Worker(
      SOURCE_PROCESSING_QUEUE,
      (job: Job) => this.handle(job),
      {
        ...options,
        settings: {
          backoffStrategy: (attemptsMade: number, type?: string) =>
            type === SOURCE_PROCESSING_BACKOFF_TYPE
              ? retryDelayMs(attemptsMade)
              : 0,
        },
      },
    );
    registerWorkerJobLogging(this.worker, SOURCE_PROCESSING_QUEUE, this.logger);
    this.worker.on('error', (error: Error) => {
      this.logger.error(`Processing queue worker error: ${error.name}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async handle(job: Job): Promise<void> {
    const data: unknown = job.data;
    const sourceId =
      typeof data === 'object' &&
      data !== null &&
      'sourceId' in data &&
      typeof data.sourceId === 'string'
        ? data.sourceId
        : undefined;
    if (sourceId === undefined) {
      throw new UnrecoverableError('Job has no sourceId');
    }
    const revision =
      typeof data === 'object' &&
      data !== null &&
      'revision' in data &&
      typeof data.revision === 'number'
        ? data.revision
        : undefined;
    const attempts = job.opts.attempts ?? 1;
    const isFinalAttempt = job.attemptsMade + 1 >= attempts;
    const outcome = await this.processSource.execute(
      sourceId,
      isFinalAttempt,
      revision,
    );
    if (outcome.kind === 'FAILED') {
      throw new UnrecoverableError(outcome.failureCode);
    }
  }
}

/** attemptsMade counts the failure that just happened: 1 -> 30 s, 2 -> 2 min, 3 -> 8 min. */
export function retryDelayMs(attemptsMade: number): number {
  const delays = SOURCE_PROCESSING_RETRY_DELAYS_MS;
  return delays[Math.min(Math.max(attemptsMade, 1), delays.length) - 1] ?? 0;
}
