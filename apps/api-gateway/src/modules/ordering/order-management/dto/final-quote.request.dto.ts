import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class CreateQuoteLineItemDto {
  @ApiPropertyOptional({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  @IsOptional()
  @IsUUID('4')
  ringItemId?: string;

  @ApiProperty({ example: 'GOLD_MATERIAL' })
  @IsString()
  @IsNotEmpty()
  componentType!: string;

  @ApiPropertyOptional({ example: '18K White Gold Setting 4.2g' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  quantity?: number;

  @ApiProperty({ example: 8500000 })
  @Type(() => Number)
  unitAmount!: number;

  @ApiProperty({ example: 8500000 })
  @Type(() => Number)
  lineAmount!: number;

  @ApiPropertyOptional({ example: 'CATALOG_RULE', default: 'MANUAL' })
  @IsOptional()
  @IsString()
  priceSourceType?: string;
}

export class CreateFinalQuoteBodyDto {
  @ApiPropertyOptional({ example: 15000000 })
  @IsOptional()
  @Type(() => Number)
  subtotalAmount?: number;

  @ApiPropertyOptional({ example: 50000, default: 0 })
  @IsOptional()
  @Type(() => Number)
  deliveryAmount?: number;

  @ApiPropertyOptional({ example: -500000, default: 0 })
  @IsOptional()
  @Type(() => Number)
  adjustmentAmount?: number;

  @ApiProperty({ example: 14550000 })
  @Type(() => Number)
  totalAmount!: number;

  @ApiPropertyOptional({ example: 'VND', default: 'VND' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: '2026-11-22T23:59:59.000Z' })
  @IsOptional()
  @IsString()
  validUntil?: string;

  @ApiProperty({ type: [CreateQuoteLineItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteLineItemDto)
  items!: CreateQuoteLineItemDto[];
}

export class UpdateQuoteLineItemDto {
  @ApiPropertyOptional({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  @IsOptional()
  @IsUUID('4')
  id?: string;

  @ApiPropertyOptional({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  @IsOptional()
  @IsUUID('4')
  ringItemId?: string;

  @ApiProperty({ example: 'GOLD_MATERIAL' })
  @IsString()
  @IsNotEmpty()
  componentType!: string;

  @ApiPropertyOptional({ example: '18K White Gold Setting 4.2g' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  quantity?: number;

  @ApiProperty({ example: 8500000 })
  @Type(() => Number)
  unitAmount!: number;

  @ApiProperty({ example: 8500000 })
  @Type(() => Number)
  lineAmount!: number;

  @ApiPropertyOptional({ example: 'MANUAL' })
  @IsOptional()
  @IsString()
  priceSourceType?: string;
}

export class UpdateFinalQuoteBodyDto {
  @ApiPropertyOptional({ example: 15000000 })
  @IsOptional()
  @Type(() => Number)
  subtotalAmount?: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @Type(() => Number)
  deliveryAmount?: number;

  @ApiPropertyOptional({ example: -500000 })
  @IsOptional()
  @Type(() => Number)
  adjustmentAmount?: number;

  @ApiPropertyOptional({ example: 14550000 })
  @Type(() => Number)
  totalAmount?: number;

  @ApiPropertyOptional({ example: '2026-11-22T23:59:59.000Z' })
  @IsOptional()
  @IsString()
  validUntil?: string;

  @ApiPropertyOptional({ type: [UpdateQuoteLineItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateQuoteLineItemDto)
  items?: UpdateQuoteLineItemDto[];
}
