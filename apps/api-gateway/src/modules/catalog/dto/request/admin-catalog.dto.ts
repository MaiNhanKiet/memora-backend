import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

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

export class UpdateCompatibilitiesBodyDto {
  @ApiProperty({
    description: 'Template Variant UUID',
    example: 'v1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
  })
  @IsUUID('4')
  templateVariantId!: string;

  @ApiProperty({
    description: 'Gemstone Group UUID',
    example: 'g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
  })
  @IsUUID('4')
  gemstoneGroupId!: string;

  @ApiProperty({
    description: 'Array of compatible gemstone option UUIDs',
    example: ['opt-1-uuid', 'opt-2-uuid'],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  gemstoneOptionIds!: string[];
}

export class GetResizePoliciesQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by Template Variant UUID',
    example: 'v1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
  })
  @IsOptional()
  @IsUUID('4')
  templateVariantId?: string;

  @ApiPropertyOptional({
    description: 'Filter by Ring Template UUID',
    example: 't1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
  })
  @IsOptional()
  @IsUUID('4')
  templateId?: string;
}

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
