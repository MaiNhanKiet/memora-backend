import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

// -----------------------------------------------------------------------------
// [PRICI-002] List Price Items Query
// -----------------------------------------------------------------------------
export class ListPriceItemsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by price type',
    enum: ['RING_BLANK', 'GEMSTONE', 'CERTIFIED_GEMSTONE', 'PERSONALIZATION'],
  })
  @IsOptional()
  @IsIn(['RING_BLANK', 'GEMSTONE', 'CERTIFIED_GEMSTONE', 'PERSONALIZATION'])
  priceType?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['ACTIVE', 'INACTIVE'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Maximum records to return',
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Records offset',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

// -----------------------------------------------------------------------------
// [PRICI-003] Create Price Item Body
// -----------------------------------------------------------------------------
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
    example: 'AUDIO_ENGRAVING',
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

// -----------------------------------------------------------------------------
// [PRICI-004] List Price Versions Query
// -----------------------------------------------------------------------------
export class ListPriceVersionsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by price item ID',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsOptional()
  @IsUUID()
  priceItemId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['DRAFT', 'ACTIVE', 'REJECTED', 'SUPERSEDED'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Maximum records to return',
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Records offset',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

// -----------------------------------------------------------------------------
// [PRICI-005] Create Price Version Body (DRAFT)
// -----------------------------------------------------------------------------
export class CreatePriceVersionBodyDto {
  @ApiProperty({
    description: 'Target price item ID',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsUUID()
  priceItemId!: string;

  @ApiProperty({
    description: 'Price amount',
    example: 3500000,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({
    description: 'Currency code ISO 4217',
    example: 'VND',
    default: 'VND',
  })
  @IsOptional()
  @IsString()
  currency?: string = 'VND';

  @ApiPropertyOptional({
    description: 'Effective from timestamp ISO 8601',
    example: '2026-11-15T00:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  effectiveFrom?: string;

  @ApiPropertyOptional({
    description: 'Effective to timestamp ISO 8601',
    example: '2027-11-15T00:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  effectiveTo?: string;

  @ApiPropertyOptional({
    description: 'Source type',
    example: 'MANUAL',
    default: 'MANUAL',
  })
  @IsOptional()
  @IsString()
  sourceType?: string = 'MANUAL';

  @ApiPropertyOptional({
    description: 'Market snapshot or pricing context metadata',
    example: { goldSpotPrice: 2450.5, supplierQuoteId: 'SUP-991' },
  })
  @IsOptional()
  @IsObject()
  marketSnapshot?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// [PRICI-006] Approve Price Version Body
// -----------------------------------------------------------------------------
export class ApprovePriceVersionBodyDto {
  @ApiPropertyOptional({
    description: 'Review approval note',
    example: 'Approved based on updated material exchange rate.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNote?: string;
}

// -----------------------------------------------------------------------------
// [PRICI-007] Reject Price Version Body
// -----------------------------------------------------------------------------
export class RejectPriceVersionBodyDto {
  @ApiProperty({
    description: 'Review rejection reason',
    example: 'Proposed price does not cover overhead cost ratio.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reviewNote!: string;
}

// -----------------------------------------------------------------------------
// [PRICI-008] List Pricing Rules Query
// -----------------------------------------------------------------------------
export class ListPricingRulesQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by rule type',
    enum: ['DELIVERY_FEE', 'CANCELLATION_FEE', 'REDELIVERY_FEE', 'RESIZE_FEE'],
  })
  @IsOptional()
  @IsIn(['DELIVERY_FEE', 'CANCELLATION_FEE', 'REDELIVERY_FEE', 'RESIZE_FEE'])
  ruleType?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Maximum records to return',
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Records offset',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

// -----------------------------------------------------------------------------
// [PRICI-009] Create Pricing Rule Body (DRAFT)
// -----------------------------------------------------------------------------
export class CreatePricingRuleBodyDto {
  @ApiProperty({
    description: 'Pricing rule type',
    enum: ['DELIVERY_FEE', 'CANCELLATION_FEE', 'REDELIVERY_FEE', 'RESIZE_FEE'],
    example: 'DELIVERY_FEE',
  })
  @IsString()
  @IsIn(['DELIVERY_FEE', 'CANCELLATION_FEE', 'REDELIVERY_FEE', 'RESIZE_FEE'])
  ruleType!: string;

  @ApiProperty({
    description: 'Unique pricing rule code',
    example: 'RULE-DELIV-INNER-HCM',
    maxLength: 80,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  code!: string;

  @ApiProperty({
    description: 'Rule display name',
    example: 'Phí giao hàng nội thành TP.HCM',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({
    description: 'Template variant ID if ruleType is RESIZE_FEE',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsOptional()
  @IsUUID()
  templateVariantId?: string;

  @ApiPropertyOptional({
    description: 'Resize direction if ruleType is RESIZE_FEE',
    enum: ['UP', 'DOWN'],
  })
  @IsOptional()
  @IsIn(['UP', 'DOWN'])
  resizeDirection?: string;

  @ApiPropertyOptional({
    description: 'Delivery zone code if ruleType is DELIVERY_FEE',
    example: 'ZONE_HCM_INNER',
  })
  @IsOptional()
  @IsString()
  deliveryZoneCode?: string;

  @ApiPropertyOptional({
    description: 'Cancellation stage if ruleType is CANCELLATION_FEE',
    example: 'IN_PRODUCTION',
  })
  @IsOptional()
  @IsString()
  cancellationStage?: string;

  @ApiPropertyOptional({
    description: 'Redelivery reason if ruleType is REDELIVERY_FEE',
    example: 'CUSTOMER_UNREACHABLE_ONCE',
  })
  @IsOptional()
  @IsString()
  redeliveryReason?: string;

  @ApiPropertyOptional({
    description: 'Rule calculation configuration (fee, percentage, limits)',
    example: { fixedFee: 50000, freeThreshold: 5000000 },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Effective from timestamp ISO 8601',
    example: '2026-11-15T00:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  effectiveFrom?: string;

  @ApiPropertyOptional({
    description: 'Effective to timestamp ISO 8601',
    example: '2027-11-15T00:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  effectiveTo?: string;
}
