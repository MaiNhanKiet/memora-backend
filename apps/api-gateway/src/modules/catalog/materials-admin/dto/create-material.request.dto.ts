import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMaterialBodyDto {
  @ApiProperty({ description: 'Material code', example: 'WG18K' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    description: 'Material display name',
    example: 'Vàng trắng 18K',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Material family', example: 'GOLD' })
  @IsOptional()
  @IsString()
  materialFamily?: string;

  @ApiPropertyOptional({
    description: 'Purity percentage (e.g. 75.00 for 18K)',
    example: 75.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  purityPercent?: number;

  @ApiPropertyOptional({
    description: 'Color description or hex',
    example: 'WHITE',
  })
  @IsOptional()
  @IsString()
  color?: string;
}
