import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListTemplatesQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by stone layout configuration',
    enum: ['NONE', 'SINGLE', 'MULTI'],
    example: 'SINGLE',
  })
  @IsOptional()
  @IsIn(['NONE', 'SINGLE', 'MULTI'])
  stone_layout?: string;

  @ApiPropertyOptional({
    description: 'Filter by supported personalization package',
    enum: ['FINGERPRINT', 'SOUNDWAVE'],
    example: 'FINGERPRINT',
  })
  @IsOptional()
  @IsIn(['FINGERPRINT', 'SOUNDWAVE'])
  package?: string;

  @ApiPropertyOptional({
    description: 'Number of items to return (1-100)',
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Number of items to skip for pagination',
    default: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
