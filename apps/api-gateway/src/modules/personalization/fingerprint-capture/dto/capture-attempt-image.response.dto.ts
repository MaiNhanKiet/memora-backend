import { ApiProperty } from '@nestjs/swagger';

export class CaptureAttemptImageResponseDto {
  @ApiProperty({ example: 1 })
  attemptNo!: number;

  @ApiProperty({
    description: 'Presigned GET URL valid 60 seconds. Do not cache or log it.',
  })
  imageUrl!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;

  @ApiProperty({ example: 'image/bmp' })
  contentType!: string;
}
