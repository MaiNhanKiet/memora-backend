import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type { SourceProcessingTrigger } from '../source-processing.port';
import {
  SOURCE_PROCESSING_ATTEMPTS,
  SOURCE_PROCESSING_BACKOFF_TYPE,
  SOURCE_PROCESSING_JOB_NAME,
  SOURCE_PROCESSING_QUEUE,
} from '../source-processing.constants';

/** Producer side of PERSO-013. Job id = source id, so a second enqueue is a no-op. */
@Injectable()
export class BullMqSourceProcessingTrigger implements SourceProcessingTrigger {
  constructor(
    @InjectQueue(SOURCE_PROCESSING_QUEUE) private readonly queue: Queue,
  ) {}

  async enqueue(sourceId: string): Promise<void> {
    await this.queue.add(
      SOURCE_PROCESSING_JOB_NAME,
      { sourceId },
      {
        jobId: sourceId,
        attempts: SOURCE_PROCESSING_ATTEMPTS,
        backoff: { type: SOURCE_PROCESSING_BACKOFF_TYPE },
      },
    );
  }
}
