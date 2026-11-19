import { Logger } from '@nestjs/common';
import type { SourceProcessingTrigger } from './source-processing.port';

/** Placeholder until PERSO-013: records that a source is waiting for processing. */
export class LoggingSourceProcessingTrigger implements SourceProcessingTrigger {
  private readonly logger = new Logger(LoggingSourceProcessingTrigger.name);

  enqueue(sourceId: string): Promise<void> {
    this.logger.log(
      `Source ${sourceId} is ACCEPTED; processing job is not wired yet (PERSO-013)`,
    );
    return Promise.resolve();
  }
}
