import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePriceItemBodyDto {
  @ApiProperty({
    description: 'Price item category',
    enum: ['RING_BLANK', 'GEMSTONE', 'CERTIFIED_GEMSTONE', 'PERSONALIZATION'],
    example: 'RING_BLANK',
  })
  @IsString()
  @IsIn(['RING_BLANK', 'GEMSTONE', 'CERTIFIED_GEMSTONE', 'PERSONALIZATION'])
  priceType!: string;

  @ApiProperty({
    description: 'Unique price item code',
    example: 'PI-RB-SOL-14KW-52',
    maxLength: 80,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  code!: string;

  @ApiPropertyOptional({
    description: 'Template variant ID if priceType is RING_BLANK',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsOptional()
  @IsUUID()
  templateVariantId?: string;

  @ApiPropertyOptional({
    description: 'Gemstone option ID if priceType is GEMSTONE',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsOptional()
  @IsUUID()
  gemstoneOptionId?: string;

  @ApiPropertyOptional({
    description: 'Certified gemstone ID if priceType is CERTIFIED_GEMSTONE',
    example: '33333333-3333-3333-3333-333333333333',
  })
  @IsOptional()
  @IsUUID()
  certifiedGemstoneId?: string;

  @ApiPropertyOptional({
    description: 'Personalization package code if priceType is PERSONALIZATION',
    example: 'FINGERPRINT',
  })
  @IsOptional()
  @IsString()
  personalizationPackage?: string;

  @ApiPropertyOptional({
    description: 'Initial status',
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE',
  })
  @IsOptional()
  @IsString()
  status?: string = 'ACTIVE';
}
