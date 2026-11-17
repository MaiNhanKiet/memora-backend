import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListAdminOrdersQueryDto {
  @ApiPropertyOptional({
    description: 'Page index (1-based)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Page item count limit',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by order status',
    example: 'AWAITING_P1',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Search by order number or recipient info',
    example: 'ORD-173158',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter orders created on or after this ISO date',
    example: '2026-11-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter orders created on or before this ISO date',
    example: '2026-11-30T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  dateTo?: string;
}
