import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { CONSENT_TYPES } from '@app/contracts';

export class AcceptConsentRequestDto {
  @ApiProperty({ enum: CONSENT_TYPES, example: 'FINGERPRINT_PROCESSING' })
  @IsIn(CONSENT_TYPES)
  consentType!: (typeof CONSENT_TYPES)[number];

  @ApiProperty({
    description: 'Consent policy version that the client displayed',
    example: 'v1',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  policyVersion!: string;

  @ApiProperty({
    description: 'Ring Item ids covered by this consent (1-2, unique)',
    type: [String],
    format: 'uuid',
    minItems: 1,
    maxItems: 2,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  ringItemIds!: string[];
}
