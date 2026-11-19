import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class EstimatePriceBodyDto {
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

  @ApiPropertyOptional({
    description: 'Array of selected gemstone option UUIDs',
    type: [String],
    example: ['g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  gemstoneOptionIds?: string[];

  @ApiPropertyOptional({
    description: 'Personalization package (NONE, FINGERPRINT, SOUNDWAVE)',
    example: 'SOUNDWAVE',
  })
  @IsOptional()
  @IsString()
  personalizationPackage?: string;
}
