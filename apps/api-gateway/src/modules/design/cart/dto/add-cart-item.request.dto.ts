import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class GemstoneSelectionDto {
  @ApiProperty({ description: 'Slot index on the template', example: 1 })
  @IsInt()
  slotNumber!: number;

  @ApiProperty({
    description: 'Selected gemstone option UUID',
    example: 'g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
  })
  @IsUUID()
  gemstoneOptionId!: string;

  @ApiPropertyOptional({
    description:
      'Exact inventory gemstone UUID, required for a certified option',
  })
  @IsOptional()
  @IsUUID()
  certifiedGemstoneId?: string;
}

export class AddCartItemBodyDto {
  @ApiProperty({
    description: 'Template Variant UUID',
    example: 'v1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
  })
  @IsUUID()
  templateVariantId!: string;

  @ApiProperty({
    description: 'Target desired size for the ring',
    example: 13.0,
  })
  @IsNumber()
  targetSize!: number;

  @ApiProperty({
    description: 'Array of gemstone selections per slot',
    type: [GemstoneSelectionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GemstoneSelectionDto)
  gemstoneSelections!: GemstoneSelectionDto[];

  @ApiPropertyOptional({
    description: 'Personalization package (NONE, FINGERPRINT, SOUNDWAVE)',
    example: 'SOUNDWAVE',
  })
  @IsOptional()
  @IsString()
  personalizationPackage?: string;

  @ApiPropertyOptional({
    description: 'Whether to enable Digital Memory (free for FP/SW)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  memoryEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Maintenance plan (NONE, LIFETIME_POLISHING)',
    enum: ['NONE', 'LIFETIME_POLISHING'],
    example: 'LIFETIME_POLISHING',
    default: 'NONE',
  })
  @IsOptional()
  @IsString()
  maintenancePlan?: string;
}
