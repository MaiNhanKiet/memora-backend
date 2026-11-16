import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreatePriceVersionBodyDto {
  @ApiProperty({
    description: 'Target price item ID',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsUUID()
  priceItemId!: string;

  @ApiProperty({
    description: 'Price amount in currency minor units (e.g., VND)',
    example: 3500000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    default: 'VND',
    example: 'VND',
  })
  @IsOptional()
  @IsString()
  currency?: string = 'VND';

  @ApiPropertyOptional({
    description: 'ISO-8601 string when price becomes effective',
    example: '2026-11-15T00:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  effectiveFrom?: string;

  @ApiPropertyOptional({
    description: 'ISO-8601 string when price expires',
    example: '2027-11-15T00:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  effectiveTo?: string;

  @ApiPropertyOptional({
    description: 'Price source type',
    enum: ['MANUAL', 'SCRAPED', 'FORMULA'],
    default: 'MANUAL',
    example: 'MANUAL',
  })
  @IsOptional()
  @IsIn(['MANUAL', 'SCRAPED', 'FORMULA'])
  sourceType?: string = 'MANUAL';

  @ApiPropertyOptional({
    description: 'Snapshot of market data at creation time',
    example: { spotPrice: 2450.5, provider: 'SJC' },
  })
  @IsOptional()
  @IsObject()
  marketSnapshot?: Record<string, unknown>;
}
