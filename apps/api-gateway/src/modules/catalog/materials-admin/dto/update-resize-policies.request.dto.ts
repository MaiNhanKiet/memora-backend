import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateResizePoliciesBodyDto {
  @ApiPropertyOptional({
    description: 'Max size expansion allowed in scale',
    example: 2.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxUpDelta?: number;

  @ApiPropertyOptional({
    description: 'Max size reduction allowed in scale',
    example: 2.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
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
    description: 'Minimum remaining wall thickness in mm',
    example: 1.2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minRemainingWallThicknessMm?: number;

  @ApiPropertyOptional({
    description: 'Max safe engraving depth in mm',
    example: 0.3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxSafeEngravingDepthMm?: number;
}
