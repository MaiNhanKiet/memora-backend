import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class ReceiveRingBlankStockBodyDto {
  @ApiProperty({
    description: 'Template variant ID of the ring blank',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsUUID()
  templateVariantId!: string;

  @ApiPropertyOptional({
    description: 'Physical batch / lot code',
    example: 'LOT-RB-2026-11A',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lotCode?: string;

  @ApiPropertyOptional({
    description: 'Supplier invoice / batch reference',
    example: 'INV-SUP-8821',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  supplierRef?: string;

  @ApiProperty({
    description: 'Quantity received into inventory',
    example: 10,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Unit purchase cost in VND',
    example: 2500000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({
    description: 'Storage bin / shelf location code',
    example: 'BIN-A1-04',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  locationCode?: string;

  @ApiPropertyOptional({
    description: 'Receipt timestamp ISO 8601',
    example: '2026-11-14T10:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  receivedAt?: string;
}
