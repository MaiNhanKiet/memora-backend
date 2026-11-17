import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class HoldInventoryBodyDto {
  @ApiProperty({
    description: 'Ring item ID to allocate stock for',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsUUID()
  ringItemId!: string;

  @ApiPropertyOptional({
    description: 'Stock lot ID (e.g. ring blank or melee batch)',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsOptional()
  @IsUUID()
  stockLotId?: string;

  @ApiPropertyOptional({
    description: 'Certified gemstone ID if allocating a specific stone',
    example: '33333333-3333-3333-3333-333333333333',
  })
  @IsOptional()
  @IsUUID()
  certifiedGemstoneId?: string;

  @ApiPropertyOptional({
    description: 'Quantity to hold (default 1)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number = 1;

  @ApiPropertyOptional({
    description: 'TTL in minutes before auto-release (default 60 mins)',
    default: 60,
    minimum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  ttlMinutes?: number = 60;
}
