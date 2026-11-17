import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTemplateBodyDto {
  @ApiProperty({ description: 'Unique template code', example: 'T-SOL-01' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    description: 'Ring template display name',
    example: 'Solitaire Classic Ring',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'Detailed description',
    example: 'Classic 4-prong solitaire engagement ring',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '3D model glb asset key or storage path',
    example: 'models/rings/solitaire-classic.glb',
  })
  @IsString()
  @IsNotEmpty()
  glbAssetKey!: string;

  @ApiPropertyOptional({
    description:
      'Stone layout pattern (e.g. NONE, SOLITAIRE, THREE_STONE, HALO, CHANNEL)',
    example: 'SOLITAIRE',
    default: 'NONE',
  })
  @IsOptional()
  @IsString()
  stoneLayout?: string;

  @ApiPropertyOptional({
    description: 'Supported personalization packages',
    example: ['NONE', 'FINGERPRINT', 'SOUNDWAVE'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  designSupportedPersonalizationPackages?: string[];

  @ApiPropertyOptional({
    description: 'Target gender (MEN, WOMEN, UNISEX)',
    example: 'WOMEN',
  })
  @IsOptional()
  @IsString()
  gender?: string;
}
