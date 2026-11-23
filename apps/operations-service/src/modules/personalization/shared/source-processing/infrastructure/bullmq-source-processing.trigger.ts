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

/**
 * Producer side of PERSO-013. Job id = `${sourceId}-r${revision}` (BullMQ refuses a `:` in a
 * custom id), so a repeated enqueue of the same revision is a no-op while a re-segmentation
 * (PERSO-035, new revision) is a new job. Jobs queued before this change keep the id
 * `sourceId` and carry no revision; the consumer treats them as current.
 */
@Injectable()
export class BullMqSourceProcessingTrigger implements SourceProcessingTrigger {
  constructor(
    @InjectQueue(SOURCE_PROCESSING_QUEUE) private readonly queue: Queue,
  ) {}

  async enqueue(sourceId: string, revision = 0): Promise<void> {
    await this.queue.add(
      SOURCE_PROCESSING_JOB_NAME,
      { sourceId, revision },
      {
        jobId: `${sourceId}-r${revision}`,
        attempts: SOURCE_PROCESSING_ATTEMPTS,
        backoff: { type: SOURCE_PROCESSING_BACKOFF_TYPE },
      },
    );
  }
}
