import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateVariantBodyDto {
  @ApiPropertyOptional({
    description: 'Standard base size in scale',
    example: 14.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  standardSize?: number;

  @ApiPropertyOptional({
    description: 'Max size expansion allowed',
    example: 2.5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxUpDelta?: number;

  @ApiPropertyOptional({
    description: 'Max size reduction allowed',
    example: 2.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxDownDelta?: number;

  @ApiPropertyOptional({
    description: 'Physical resize method',
    example: 'STRETCH_COMPRESS',
  })
  @IsOptional()
  @IsString()
  resizeMethod?: string;

  @ApiPropertyOptional({
    description: 'Whether adding metal is permitted',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  addedMetalAllowed?: boolean;

  @ApiPropertyOptional({
    description: 'Local wall thickness in mm',
    example: 1.8,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  localWallThicknessMm?: number;

  @ApiPropertyOptional({
    description: 'Minimum remaining wall thickness in mm',
    example: 1.2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minRemainingWallThicknessMm?: number;

  @ApiPropertyOptional({
    description: 'Max safe engraving depth in mm',
    example: 0.35,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxSafeEngravingDepthMm?: number;

  @ApiPropertyOptional({
    description: 'Variant status (DRAFT, ACTIVE, ARCHIVED)',
    example: 'ACTIVE',
  })
  @IsOptional()
  @IsString()
  status?: string;
}
