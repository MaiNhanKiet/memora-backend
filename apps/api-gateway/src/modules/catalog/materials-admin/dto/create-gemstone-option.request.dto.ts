import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateGemstoneOptionBodyDto {
  @ApiProperty({ description: 'Gemstone code', example: 'DIA-RD-050-VS1-E' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    description: 'Display name',
    example: 'Kim cương tròn 0.5ct VS1 E',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Stone type (DIAMOND, SAPPHIRE, RUBY, EMERALD)',
    example: 'DIAMOND',
  })
  @IsString()
  @IsNotEmpty()
  stoneType!: string;

  @ApiProperty({
    description: 'Stone shape (ROUND, PRINCESS, OVAL, CUSHION, EMERALD)',
    example: 'ROUND',
  })
  @IsString()
  @IsNotEmpty()
  shape!: string;

  @ApiProperty({ description: 'Length/diameter in mm', example: 5.1 })
  @Type(() => Number)
  @IsNumber()
  lengthMm!: number;

  @ApiProperty({ description: 'Width in mm', example: 5.1 })
  @Type(() => Number)
  @IsNumber()
  widthMm!: number;

  @ApiPropertyOptional({
    description: 'Color grade (D, E, F, G, H, etc.)',
    example: 'E',
  })
  @IsOptional()
  @IsString()
  colorGrade?: string;

  @ApiPropertyOptional({
    description: 'Clarity grade (FL, IF, VVS1, VS1, SI1, etc.)',
    example: 'VS1',
  })
  @IsOptional()
  @IsString()
  clarityGrade?: string;

  @ApiPropertyOptional({
    description: 'Whether laboratory certificate is required',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  certifiedRequired?: boolean;
}
