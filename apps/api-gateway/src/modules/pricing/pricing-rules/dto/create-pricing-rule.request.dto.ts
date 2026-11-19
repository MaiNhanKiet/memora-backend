import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePricingRuleBodyDto {
  @ApiProperty({
    description: 'Rule category',
    enum: [
      'RESIZE_MATRIX',
      'RUSH_ORDER_TIER',
      'DELIVERY_ZONE',
      'CANCELLATION_FEE_TIER',
      'REDELIVERY_FEE',
    ],
    example: 'RESIZE_MATRIX',
  })
  @IsString()
  @IsIn([
    'RESIZE_MATRIX',
    'RUSH_ORDER_TIER',
    'DELIVERY_ZONE',
    'CANCELLATION_FEE_TIER',
    'REDELIVERY_FEE',
  ])
  ruleType!: string;

  @ApiProperty({
    description: 'Unique rule code',
    example: 'PR-RS-UP-18KW',
    maxLength: 80,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  code!: string;

  @ApiProperty({
    description: 'Human-readable rule name',
    example: 'Resize Up 18K White Gold Surcharge',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({
    description: 'Template variant ID if rule applies to a specific variant',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsOptional()
  @IsUUID()
  templateVariantId?: string;

  @ApiPropertyOptional({
    description: 'Resize direction',
    enum: ['UP', 'DOWN', 'NONE'],
    example: 'UP',
  })
  @IsOptional()
  @IsIn(['UP', 'DOWN', 'NONE'])
  resizeDirection?: string;

  @ApiPropertyOptional({
    description: 'Delivery zone code if ruleType is DELIVERY_ZONE',
    example: 'VN-SG-Q1',
  })
  @IsOptional()
  @IsString()
  deliveryZoneCode?: string;

  @ApiPropertyOptional({
    description: 'Cancellation stage if ruleType is CANCELLATION_FEE_TIER',
    example: 'BEFORE_PRODUCTION',
  })
  @IsOptional()
  @IsString()
  cancellationStage?: string;

  @ApiPropertyOptional({
    description: 'Redelivery reason code if ruleType is REDELIVERY_FEE',
    example: 'RECIPIENT_UNAVAILABLE',
  })
  @IsOptional()
  @IsString()
  redeliveryReason?: string;

  @ApiPropertyOptional({
    description: 'Rule calculation payload',
    example: { baseFee: 200000, perSizeDeltaFee: 50000 },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'ISO-8601 string when rule becomes effective',
    example: '2026-11-15T00:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  effectiveFrom?: string;

  @ApiPropertyOptional({
    description: 'ISO-8601 string when rule expires',
    example: '2027-11-15T00:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  effectiveTo?: string;
}
