import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateMaterialBodyDto {
  @ApiPropertyOptional({
    description: 'Material display name',
    example: 'Vàng trắng 18K Ý',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Material family', example: 'GOLD' })
  @IsOptional()
  @IsString()
  materialFamily?: string;

  @ApiPropertyOptional({ description: 'Purity percentage', example: 75.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  purityPercent?: number;

  @ApiPropertyOptional({ description: 'Color description', example: 'WHITE' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    description: 'Material status (ACTIVE, INACTIVE)',
    example: 'ACTIVE',
  })
  @IsOptional()
  @IsString()
  status?: string;
}
