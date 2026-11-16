import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class ListInventoryMovementsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by stock lot ID',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsOptional()
  @IsUUID()
  stockLotId?: string;

  @ApiPropertyOptional({
    description: 'Filter by certified gemstone ID',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsOptional()
  @IsUUID()
  certifiedGemstoneId?: string;

  @ApiPropertyOptional({
    description: 'Filter by movement type',
    enum: [
      'RECEIPT',
      'HOLD',
      'RESERVATION',
      'ALLOCATION',
      'CONSUMPTION',
      'RELEASE',
      'ADJUSTMENT',
    ],
  })
  @IsOptional()
  @IsIn([
    'RECEIPT',
    'HOLD',
    'RESERVATION',
    'ALLOCATION',
    'CONSUMPTION',
    'RELEASE',
    'ADJUSTMENT',
  ])
  movementType?: string;

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
