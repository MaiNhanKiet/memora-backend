import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ListRingBlankStocksQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by template variant ID',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsOptional()
  @IsUUID()
  templateVariantId?: string;

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
