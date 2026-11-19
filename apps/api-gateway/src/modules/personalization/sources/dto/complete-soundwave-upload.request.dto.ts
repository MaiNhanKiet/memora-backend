import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';
import { SOUNDWAVE_SEGMENT_MS } from '@app/contracts';

export class CompleteSoundwaveUploadRequestDto {
  @ApiProperty({
    description: 'The uploadId returned by initiate',
    format: 'uuid',
  })
  @IsUUID('all')
  uploadId!: string;

  @ApiProperty({
    description: `Start of the ${SOUNDWAVE_SEGMENT_MS} ms segment the customer picked; segmentStartMs + ${SOUNDWAVE_SEGMENT_MS} must not exceed the declared duration (else 400 SEGMENT_OUT_OF_RANGE)`,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  segmentStartMs!: number;
}
