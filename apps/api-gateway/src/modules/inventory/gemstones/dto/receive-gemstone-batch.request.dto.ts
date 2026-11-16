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

export class ReceiveGemstoneBatchBodyDto {
  @ApiProperty({
    description: 'Gemstone option ID for this batch',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsUUID()
  gemstoneOptionId!: string;

  @ApiPropertyOptional({
    description: 'Physical batch / lot code',
    example: 'LOT-GEM-DIA-1.5MM',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lotCode?: string;

  @ApiPropertyOptional({
    description: 'Supplier reference',
    example: 'SUP-GEM-993',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  supplierRef?: string;

  @ApiProperty({
    description: 'Quantity of stones received',
    example: 100,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Unit cost per stone in VND',
    example: 350000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({
    description: 'Storage bin location code',
    example: 'VAULT-GEM-02',
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
