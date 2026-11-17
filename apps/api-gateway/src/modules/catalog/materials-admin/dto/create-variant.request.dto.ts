import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateVariantBodyDto {
  @ApiProperty({
    description: 'Ring template UUID',
    example: 't1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
  })
  @IsUUID('4')
  ringTemplateId!: string;

  @ApiProperty({
    description: 'Material UUID',
    example: 'm1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
  })
  @IsUUID('4')
  materialId!: string;

  @ApiProperty({
    description: 'Standard base size in VN/US scale',
    example: 14.0,
  })
  @Type(() => Number)
  @IsNumber()
  standardSize!: number;

  @ApiPropertyOptional({
    description: 'Max size expansion allowed',
    example: 2.0,
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
    description: 'Whether adding metal is permitted during resize',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  addedMetalAllowed?: boolean;

  @ApiProperty({ description: 'Local wall thickness in mm', example: 1.8 })
  @Type(() => Number)
  @IsNumber()
  localWallThicknessMm!: number;

  @ApiProperty({
    description:
      'Minimum remaining wall thickness in mm after engraving/resize',
    example: 1.2,
  })
  @Type(() => Number)
  @IsNumber()
  minRemainingWallThicknessMm!: number;

  @ApiProperty({ description: 'Max safe engraving depth in mm', example: 0.3 })
  @Type(() => Number)
  @IsNumber()
  maxSafeEngravingDepthMm!: number;
}
