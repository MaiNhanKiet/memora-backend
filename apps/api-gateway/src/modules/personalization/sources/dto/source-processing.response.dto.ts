import { ApiProperty } from '@nestjs/swagger';
import { SOURCE_TYPES } from '@app/contracts';

export class SourceProcessingResponseDto {
  @ApiProperty({ format: 'uuid' })
  sourceId!: string;

  @ApiProperty({ enum: SOURCE_TYPES })
  sourceType!: string;

  @ApiProperty({
    enum: ['ACCEPTED', 'PROCESSING', 'READY', 'PROCESSING_FAILED'],
  })
  status!: string;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Set only when processing failed.',
  })
  failureCode!: string | null;

  @ApiProperty({
    format: 'date-time',
    nullable: true,
    type: String,
    description: 'Null until the processing job starts.',
  })
  startedAt!: string | null;

  @ApiProperty({
    format: 'date-time',
    nullable: true,
    type: String,
    description: 'Null until the source is READY or PROCESSING_FAILED.',
  })
  finishedAt!: string | null;
}
