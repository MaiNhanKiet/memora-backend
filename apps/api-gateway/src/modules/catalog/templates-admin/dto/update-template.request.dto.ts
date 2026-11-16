import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateTemplateBodyDto {
  @ApiPropertyOptional({
    description: 'Ring template display name',
    example: 'Solitaire Classic Ring 2026',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Detailed description',
    example: 'Updated classic 4-prong solitaire description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '3D model glb asset key',
    example: 'models/rings/solitaire-classic-v2.glb',
  })
  @IsOptional()
  @IsString()
  glbAssetKey?: string;

  @ApiPropertyOptional({
    description: 'Stone layout pattern',
    example: 'SOLITAIRE',
  })
  @IsOptional()
  @IsString()
  stoneLayout?: string;

  @ApiPropertyOptional({
    description: 'Supported personalization packages',
    example: ['NONE', 'FINGERPRINT'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  designSupportedPersonalizationPackages?: string[];

  @ApiPropertyOptional({
    description: 'Target gender',
    example: 'WOMEN',
  })
  @IsOptional()
  @IsString()
  gender?: string;
}
