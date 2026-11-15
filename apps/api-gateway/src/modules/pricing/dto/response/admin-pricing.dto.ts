import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PriceVersionResponseDto {
  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  id!: string;

  @ApiProperty({ example: '22222222-2222-2222-2222-222222222222' })
  priceItemId!: string;

  @ApiProperty({ example: 3500000 })
  amount!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ example: 1 })
  versionNo!: number;

  @ApiProperty({
    enum: ['DRAFT', 'ACTIVE', 'REJECTED', 'SUPERSEDED'],
    example: 'ACTIVE',
  })
  status!: string;

  @ApiPropertyOptional({ example: '2026-11-15T00:00:00.000Z' })
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2027-11-15T00:00:00.000Z' })
  effectiveTo?: string;

  @ApiProperty({ example: 'MANUAL' })
  sourceType!: string;

  @ApiPropertyOptional({ example: '{"spotPrice": 2450.5}' })
  marketSnapshotJson?: string;

  @ApiPropertyOptional({ example: 'Approved by pricing manager' })
  reviewNote?: string;

  @ApiPropertyOptional({ example: '33333333-3333-3333-3333-333333333333' })
  createdByUserId?: string;

  @ApiPropertyOptional({ example: '44444444-4444-4444-4444-444444444444' })
  reviewedByUserId?: string;

  @ApiPropertyOptional({ example: '2026-11-14T10:00:00.000Z' })
  reviewedAt?: string;

  @ApiProperty({ example: '2026-11-14T09:00:00.000Z' })
  createdAt!: string;
}

export class PriceItemResponseDto {
  @ApiProperty({ example: '22222222-2222-2222-2222-222222222222' })
  id!: string;

  @ApiProperty({
    enum: ['RING_BLANK', 'GEMSTONE', 'CERTIFIED_GEMSTONE', 'PERSONALIZATION'],
    example: 'RING_BLANK',
  })
  priceType!: string;

  @ApiPropertyOptional({ example: '55555555-5555-5555-5555-555555555555' })
  templateVariantId?: string;

  @ApiPropertyOptional({ example: '66666666-6666-6666-6666-666666666666' })
  gemstoneOptionId?: string;

  @ApiPropertyOptional({ example: '77777777-7777-7777-7777-777777777777' })
  certifiedGemstoneId?: string;

  @ApiPropertyOptional({ example: 'AUDIO_ENGRAVING' })
  personalizationPackage?: string;

  @ApiProperty({ example: 'PI-RB-SOL-14KW-52' })
  code!: string;

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'], example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ example: '2026-11-14T08:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-11-14T08:00:00.000Z' })
  updatedAt!: string;

  @ApiPropertyOptional({ type: () => PriceVersionResponseDto })
  activePriceVersion?: PriceVersionResponseDto;
}

export class PriceItemListResponseDto {
  @ApiProperty({ type: () => [PriceItemResponseDto] })
  items!: PriceItemResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;
}

export class PriceVersionListResponseDto {
  @ApiProperty({ type: () => [PriceVersionResponseDto] })
  versions!: PriceVersionResponseDto[];

  @ApiProperty({ example: 5 })
  total!: number;
}

export class PricingRuleResponseDto {
  @ApiProperty({ example: '88888888-8888-8888-8888-888888888888' })
  id!: string;

  @ApiProperty({
    enum: ['DELIVERY_FEE', 'CANCELLATION_FEE', 'REDELIVERY_FEE', 'RESIZE_FEE'],
    example: 'DELIVERY_FEE',
  })
  ruleType!: string;

  @ApiProperty({ example: 'RULE-DELIV-INNER-HCM' })
  code!: string;

  @ApiProperty({ example: 'Phí giao hàng nội thành TP.HCM' })
  name!: string;

  @ApiPropertyOptional({ example: '55555555-5555-5555-5555-555555555555' })
  templateVariantId?: string;

  @ApiPropertyOptional({ enum: ['UP', 'DOWN'], example: 'UP' })
  resizeDirection?: string;

  @ApiPropertyOptional({ example: 'ZONE_HCM_INNER' })
  deliveryZoneCode?: string;

  @ApiPropertyOptional({ example: 'IN_PRODUCTION' })
  cancellationStage?: string;

  @ApiPropertyOptional({ example: 'CUSTOMER_UNREACHABLE_ONCE' })
  redeliveryReason?: string;

  @ApiPropertyOptional({ example: '{"fixedFee":50000}' })
  configJson?: string;

  @ApiProperty({ example: 1 })
  versionNo!: number;

  @ApiProperty({ enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'], example: 'ACTIVE' })
  status!: string;

  @ApiPropertyOptional({ example: '2026-11-15T00:00:00.000Z' })
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2027-11-15T00:00:00.000Z' })
  effectiveTo?: string;

  @ApiPropertyOptional({ example: '33333333-3333-3333-3333-333333333333' })
  createdByUserId?: string;

  @ApiPropertyOptional({ example: '44444444-4444-4444-4444-444444444444' })
  approvedByUserId?: string;

  @ApiPropertyOptional({ example: '2026-11-14T10:00:00.000Z' })
  approvedAt?: string;

  @ApiProperty({ example: '2026-11-14T08:00:00.000Z' })
  createdAt!: string;
}

export class PricingRuleListResponseDto {
  @ApiProperty({ type: () => [PricingRuleResponseDto] })
  rules!: PricingRuleResponseDto[];

  @ApiProperty({ example: 12 })
  total!: number;
}
