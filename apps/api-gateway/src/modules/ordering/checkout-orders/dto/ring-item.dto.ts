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

export class MemoryCardSummaryDto {
  @ApiProperty({ example: 'm1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  id!: string;

  @ApiProperty({ example: 'PENDING' })
  status!: string;
}

export class RingItemDetailResponseDto {
  @ApiProperty({ example: 'r1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  id!: string;

  @ApiProperty({ example: 'o1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  orderId!: string;

  @ApiProperty({ example: 1 })
  itemNo!: number;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  sourceRingDesignDraftId!: string;

  @ApiProperty({ example: 'v1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  currentVersionId!: string;

  @ApiProperty({ example: 1 })
  versionNo!: number;

  @ApiProperty({ example: 'RT-CLASSIC-01' })
  templateCode!: string;

  @ApiProperty({ example: 'Classic Solitaire' })
  templateName!: string;

  @ApiProperty({ example: 'Yellow Gold 18K' })
  materialName!: string;

  @ApiProperty({ example: 13.0 })
  targetSize!: number;

  @ApiProperty({ example: 'SOUNDWAVE' })
  personalizationPackage!: string;

  @ApiProperty({ example: true })
  memoryEnabled!: boolean;

  @ApiPropertyOptional({ example: 'LIFETIME_POLISHING' })
  maintenancePlan?: string;

  @ApiPropertyOptional({ type: MemoryCardSummaryDto })
  memoryCard?: MemoryCardSummaryDto;

  @ApiProperty({ example: '2026-11-14T10:00:00.000Z' })
  createdAt!: string;
}
