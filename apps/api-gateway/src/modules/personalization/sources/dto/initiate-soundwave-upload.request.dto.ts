import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import {
  SOUNDWAVE_CONTENT_TYPES,
  SOUNDWAVE_MAX_DURATION_MS,
  SOUNDWAVE_MAX_SIZE_BYTES,
  SOUNDWAVE_MIN_DURATION_MS,
  SOUNDWAVE_UPLOAD_ORIGINS,
} from '@app/contracts';

const AUDIO_DURATION_INVALID = 'AUDIO_DURATION_INVALID';

export class InitiateSoundwaveUploadRequestDto {
  @ApiProperty({
    description: 'Accepted SOUNDWAVE_PROCESSING consent of the order',
    format: 'uuid',
  })
  @IsUUID('all')
  consentId!: string;

  @ApiProperty({ enum: SOUNDWAVE_CONTENT_TYPES })
  @IsIn(SOUNDWAVE_CONTENT_TYPES)
  contentType!: string;

  @ApiProperty({
    description: 'Exact byte length of the file the client will PUT',
    minimum: 1,
    maximum: SOUNDWAVE_MAX_SIZE_BYTES,
  })
  @IsInt()
  @Min(1)
  @Max(SOUNDWAVE_MAX_SIZE_BYTES)
  sizeBytes!: number;

  @ApiProperty({
    description: 'SHA-256 of the file, 64 hex characters (stored lower-case)',
    pattern: '^[0-9a-fA-F]{64}$',
  })
  @IsString()
  @Matches(/^[0-9a-fA-F]{64}$/)
  sha256!: string;

  @ApiProperty({ enum: SOUNDWAVE_UPLOAD_ORIGINS })
  @IsIn(SOUNDWAVE_UPLOAD_ORIGINS)
  origin!: string;

  @ApiProperty({
    description:
      'Duration measured by the client. Out of range answers 400 AUDIO_DURATION_INVALID. Operations measures the real duration later.',
    minimum: SOUNDWAVE_MIN_DURATION_MS,
    maximum: SOUNDWAVE_MAX_DURATION_MS,
  })
  @IsInt({ message: AUDIO_DURATION_INVALID })
  @Min(SOUNDWAVE_MIN_DURATION_MS, { message: AUDIO_DURATION_INVALID })
  @Max(SOUNDWAVE_MAX_DURATION_MS, { message: AUDIO_DURATION_INVALID })
  durationMs!: number;
}
