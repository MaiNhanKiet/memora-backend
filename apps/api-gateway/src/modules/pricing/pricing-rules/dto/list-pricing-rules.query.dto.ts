import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListPricingRulesQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by rule type',
    enum: [
      'RESIZE_MATRIX',
      'RUSH_ORDER_TIER',
      'DELIVERY_ZONE',
      'CANCELLATION_FEE_TIER',
      'REDELIVERY_FEE',
    ],
  })
  @IsOptional()
  @IsIn([
    'RESIZE_MATRIX',
    'RUSH_ORDER_TIER',
    'DELIVERY_ZONE',
    'CANCELLATION_FEE_TIER',
    'REDELIVERY_FEE',
  ])
  ruleType?: string;

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
