import { ApiProperty } from '@nestjs/swagger';
import { CONSENT_STATUSES, CONSENT_TYPES } from '@app/contracts';

export class ConsentResponseDto {
  @ApiProperty({ format: 'uuid' })
  consentId!: string;

  @ApiProperty({ format: 'uuid' })
  orderId!: string;

  @ApiProperty({ enum: CONSENT_TYPES })
  consentType!: string;

  @ApiProperty({ example: 'v1' })
  policyVersion!: string;

  @ApiProperty({ enum: CONSENT_STATUSES })
  status!: string;

  @ApiProperty({ format: 'date-time' })
  acceptedAt!: string;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  revokedAt!: string | null;

  @ApiProperty({ type: [String], format: 'uuid' })
  ringItemIds!: string[];
}

export class ConsentListResponseDto {
  @ApiProperty({ type: [ConsentResponseDto] })
  items!: ConsentResponseDto[];
}
