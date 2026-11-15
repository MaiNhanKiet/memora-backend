import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, Matches } from 'class-validator';

export const DEVICE_CODE_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;

export class CreateCaptureSessionRequestDto {
  @ApiProperty({
    description: 'Accepted FINGERPRINT_PROCESSING consent of the order',
    format: 'uuid',
  })
  @IsUUID('all')
  consentId!: string;

  @ApiProperty({
    description: 'Registered capture device code',
    example: 'store-hcm-01',
    maxLength: 80,
    pattern: DEVICE_CODE_PATTERN.source,
  })
  @IsString()
  @Matches(DEVICE_CODE_PATTERN)
  deviceCode!: string;
}
