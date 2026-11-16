import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateCartItemBodyDto {
  @ApiPropertyOptional({
    description: 'New target size for the ring',
    example: 12.5,
  })
  @IsOptional()
  @IsNumber()
  targetSize?: number;

  @ApiPropertyOptional({
    description: 'Personalization package (NONE, FINGERPRINT, SOUNDWAVE)',
    example: 'NONE',
  })
  @IsOptional()
  @IsString()
  personalizationPackage?: string;

  @ApiPropertyOptional({
    description: 'Whether to enable Digital Memory',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  memoryEnabled?: boolean;
}
