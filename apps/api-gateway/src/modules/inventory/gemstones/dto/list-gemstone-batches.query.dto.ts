import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ListGemstoneBatchesQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by gemstone option ID',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsOptional()
  @IsUUID()
  gemstoneOptionId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['AVAILABLE', 'EXHAUSTED', 'LOCKED'],
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
