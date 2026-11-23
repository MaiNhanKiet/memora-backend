import { ApiProperty } from '@nestjs/swagger';
import { SOURCE_STATUSES } from '@app/contracts';

export class InitiateSoundwaveUploadResponseDto {
  @ApiProperty({ format: 'uuid', description: 'The new source id.' })
  uploadId!: string;

  @ApiProperty({
    description:
      'Short-lived presigned PUT URL bound to the content type and length. A credential: do not log or cache it.',
  })
  uploadUrl!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    description: 'Headers the PUT must send.',
    example: { 'Content-Type': 'audio/wav' },
  })
  uploadHeaders!: Record<string, string>;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;
}

export class CompleteSoundwaveUploadResponseDto {
  @ApiProperty({ format: 'uuid' })
  sourceId!: string;

  @ApiProperty({ enum: ['SOUNDWAVE'] })
  sourceType!: string;

  @ApiProperty({ enum: SOURCE_STATUSES })
  status!: string;
}
