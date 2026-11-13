import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class GemstoneSelectionDto {
  @ApiProperty({ description: 'Slot index/number on the template', example: 1 })
  @IsInt()
  slotNumber!: number;

  @ApiProperty({
    description: 'Selected gemstone option UUID',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID()
  gemstoneOptionId!: string;
}

export class ValidateConfigurationBodyDto {
  @ApiProperty({
    description: 'Template UUID',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID()
  templateId!: string;

  @ApiProperty({
    description: 'Material UUID',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
  })
  @IsUUID()
  materialId!: string;

  @ApiProperty({
    description: 'Standard size of the base variant',
    example: 12.0,
  })
  @IsNumber()
  standardSize!: number;

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
}
