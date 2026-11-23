import { ApiProperty } from '@nestjs/swagger';
import {
  SOURCE_BINDING_MODES,
  SOURCE_STATUSES,
  SOURCE_TYPES,
} from '@app/contracts';

export class PersonalizationSourceResponseDto {
  @ApiProperty({ format: 'uuid' })
  sourceId!: string;

  @ApiProperty({ enum: SOURCE_TYPES })
  sourceType!: string;

  @ApiProperty({ enum: SOURCE_STATUSES })
  status!: string;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Set only when processing failed.',
  })
  failureCode!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  acceptedAt!: string | null;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'Ring Items of the order bound to this source.',
  })
  ringItemIds!: string[];

  @ApiProperty({
    enum: SOURCE_BINDING_MODES,
    nullable: true,
    description: 'Null while the source has no active binding in the order.',
  })
  bindingMode!: string | null;
}
