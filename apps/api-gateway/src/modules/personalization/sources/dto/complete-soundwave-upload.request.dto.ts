import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import {
  SOUNDWAVE_DEFAULT_WAVECODE_STYLE,
  SOUNDWAVE_SEGMENT_MS,
  SOUNDWAVE_WAVECODE_STYLES,
} from '@app/contracts';

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

  @ApiPropertyOptional({
    enum: SOUNDWAVE_WAVECODE_STYLES,
    default: SOUNDWAVE_DEFAULT_WAVECODE_STYLE,
    description:
      'Visual style of the WAVECODE (see GET /personalization/soundwave/styles). Defaults to CLASSIC.',
  })
  @IsOptional()
  @IsIn(SOUNDWAVE_WAVECODE_STYLES)
  wavecodeStyle?: string;
}
