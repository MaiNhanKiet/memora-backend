import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { GemstoneSelectionDto } from './add-cart-item.request.dto';

export class UpdateCartItemBodyDto {
  @ApiPropertyOptional({
    description:
      'Replacement gemstone selections. An empty array clears the selection.',
    type: [GemstoneSelectionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GemstoneSelectionDto)
  gemstoneSelections?: GemstoneSelectionDto[];

  @ApiPropertyOptional({
    description: 'New target size for the ring',
    example: 12.5,
  })
  @IsOptional()
  @IsNumber()
  targetSize?: number;

  @ApiPropertyOptional({
    description: 'Personalization package (NONE, FINGERPRINT, SOUNDWAVE)',
    example: 'NONE',
  })
  @IsOptional()
  @IsString()
  personalizationPackage?: string;

  @ApiPropertyOptional({
    description: 'Whether to enable Digital Memory',
    example: false,
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
