import { Module } from '@nestjs/common';
import { LoggingSourceProcessingTrigger } from './logging-source-processing.trigger';
import { SOURCE_PROCESSING_TRIGGER } from './source-processing.port';

/** Binds the processing seam. PERSO-013 swaps the useClass for the queue producer. */
@Module({
  providers: [
    {
      provide: SOURCE_PROCESSING_TRIGGER,
      useClass: LoggingSourceProcessingTrigger,
    },
  ],
  exports: [SOURCE_PROCESSING_TRIGGER],
})
export class SourceProcessingModule {}
