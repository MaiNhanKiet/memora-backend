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

export class RingItemGemstoneInputDto {
  @ApiProperty({ description: 'Gemstone Group UUID' })
  @IsUUID('4')
  gemstoneGroupId!: string;

  @ApiProperty({ description: 'Selected Gemstone Option UUID' })
  @IsUUID('4')
  gemstoneOptionId!: string;

  @ApiProperty({ description: 'Slot index in ring' })
  @IsInt()
  slotNumber!: number;
}

export class UpdateCurrentRingItemVersionBodyDto {
  @ApiPropertyOptional({
    description: 'Updated target size in scale',
    example: 14.5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  targetSize?: number;

  @ApiPropertyOptional({
    description: 'Reason for version update',
    example: 'Customer requested size increase before final quote',
  })
  @IsOptional()
  @IsString()
  changeReason?: string;

  @ApiPropertyOptional({
    description: 'Whether digital memory feature is enabled',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  memoryEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Updated gemstone selections',
    type: [RingItemGemstoneInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RingItemGemstoneInputDto)
  gemstoneSelections?: RingItemGemstoneInputDto[];
}

export class RingItemVersionSummaryDto {
  @ApiProperty({ description: 'Version UUID' })
  versionId!: string;

  @ApiProperty({ description: 'Ring Item UUID' })
  ringItemId!: string;

  @ApiProperty({ description: 'Version number (1-based)' })
  versionNumber!: number;

  @ApiProperty({ description: 'Whether this is the current active version' })
  isCurrent!: boolean;

  @ApiProperty({ description: 'Target ring size' })
  targetSize!: number;

  @ApiPropertyOptional({ description: 'Reason for change' })
  changeReason?: string;

  @ApiProperty({ description: 'Creation ISO timestamp' })
  createdAt!: string;
}

export class ListRingItemVersionsResponseDto {
  @ApiProperty({
    description: 'List of historical versions',
    type: [RingItemVersionSummaryDto],
  })
  versions!: RingItemVersionSummaryDto[];
}

export class UpdateCurrentRingItemVersionResponseDto {
  @ApiProperty({ description: 'Order UUID' })
  orderId!: string;

  @ApiProperty({ description: 'Ring Item UUID' })
  ringItemId!: string;

  @ApiProperty({ description: 'New Version UUID' })
  newVersionId!: string;

  @ApiProperty({ description: 'New version number' })
  versionNumber!: number;

  @ApiProperty({ description: 'Updated target size' })
  targetSize!: number;
}
