import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PricingRuleResponseDto {
  @ApiProperty({ example: '55555555-5555-5555-5555-555555555555' })
  id!: string;

  @ApiProperty({
    enum: [
      'RESIZE_MATRIX',
      'RUSH_ORDER_TIER',
      'DELIVERY_ZONE',
      'CANCELLATION_FEE_TIER',
      'REDELIVERY_FEE',
    ],
    example: 'RESIZE_MATRIX',
  })
  ruleType!: string;

  @ApiProperty({ example: 'PR-RS-UP-18KW' })
  code!: string;

  @ApiProperty({ example: 'Resize Up 18K White Gold Surcharge' })
  name!: string;

  @ApiPropertyOptional({ example: '11111111-1111-1111-1111-111111111111' })
  templateVariantId?: string;

  @ApiPropertyOptional({ enum: ['UP', 'DOWN', 'NONE'], example: 'UP' })
  resizeDirection?: string;

  @ApiPropertyOptional({ example: 'VN-SG-Q1' })
  deliveryZoneCode?: string;

  @ApiPropertyOptional({ example: 'BEFORE_PRODUCTION' })
  cancellationStage?: string;

  @ApiPropertyOptional({ example: 'RECIPIENT_UNAVAILABLE' })
  redeliveryReason?: string;

  @ApiPropertyOptional({ example: '{"baseFee": 200000, "perSizeDeltaFee": 50000}' })
  configJson?: string;

  @ApiProperty({ enum: ['DRAFT', 'ACTIVE', 'INACTIVE'], example: 'ACTIVE' })
  status!: string;

  @ApiPropertyOptional({ example: '2026-11-15T00:00:00.000Z' })
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2027-11-15T00:00:00.000Z' })
  effectiveTo?: string;

  @ApiPropertyOptional({ example: '33333333-3333-3333-3333-333333333333' })
  createdByUserId?: string;

  @ApiPropertyOptional({ example: '44444444-4444-4444-4444-444444444444' })
  approvedByUserId?: string;

  @ApiProperty({ example: '2026-11-14T09:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-11-14T09:00:00.000Z' })
  updatedAt!: string;
}

export class PricingRuleListResponseDto {
  @ApiProperty({ type: [PricingRuleResponseDto] })
  rules!: PricingRuleResponseDto[];

  @ApiProperty({ example: 1 })
  total!: number;
}
