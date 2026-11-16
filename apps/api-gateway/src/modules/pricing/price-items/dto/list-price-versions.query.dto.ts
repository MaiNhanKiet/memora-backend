import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class ListPriceVersionsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by price item ID',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsOptional()
  @IsUUID()
  priceItemId?: string;

  @ApiPropertyOptional({
    description: 'Filter by version status',
    enum: ['DRAFT', 'ACTIVE', 'REJECTED', 'SUPERSEDED'],
  })
  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'REJECTED', 'SUPERSEDED'])
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
