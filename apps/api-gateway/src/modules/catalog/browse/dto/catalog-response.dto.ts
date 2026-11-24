import { ApiProperty } from '@nestjs/swagger';

export class TemplateResponseDto {
  @ApiProperty({ example: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  id!: string;

  @ApiProperty({ example: 'RT-CLASSIC-01' })
  templateCode!: string;

  @ApiProperty({ example: 'Classic Solitaire' })
  name!: string;

  @ApiProperty({ example: 'Timeless solitaire design with a clean profile' })
  description!: string;

  @ApiProperty({ example: 'WOMEN' })
  gender!: string;

  @ApiProperty({ example: 'INNER_FLAT' })
  engraveSurfaceType!: string;

  @ApiProperty({ example: 'models/templates/rt-classic-01/v1.glb' })
  model3dAssetKey!: string;

  @ApiProperty({
    example: 'https://cdn.memora.style/models/templates/rt-classic-01/v1.glb',
  })
  glbUrl!: string;

  @ApiProperty({ example: '1.0' })
  mappingVersion!: string;

  @ApiProperty({ example: '' })
  defaultMaterialId!: string;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ example: '2026-11-14T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-11-14T00:00:00.000Z' })
  updatedAt!: string;
}

export class MaterialResponseDto {
  @ApiProperty({ example: 'm1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  id!: string;

  @ApiProperty({ example: 'YG-18K' })
  materialCode!: string;

  @ApiProperty({ example: 'Yellow Gold 18K' })
  name!: string;

  @ApiProperty({ example: 'GOLD' })
  metalType!: string;

  @ApiProperty({ example: 18 })
  purityKarat!: number;

  @ApiProperty({ example: 15.58 })
  densityGCm3!: number;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;
}

export class TemplateVariantResponseDto {
  @ApiProperty({ example: 'v1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  id!: string;

  @ApiProperty({ example: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  ringTemplateId!: string;

  @ApiProperty({ example: 'm1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  materialId!: string;

  @ApiProperty({ example: 12.0 })
  standardSize!: number;

  @ApiProperty({ example: 2.0, required: false })
  maxUpDelta?: number;

  @ApiProperty({ example: 1.5, required: false })
  maxDownDelta?: number;

  @ApiProperty({ example: 'COMPRESSION_STRETCH', required: false })
  resizeMethod?: string;

  @ApiProperty({ example: false })
  addedMetalAllowed!: boolean;

  @ApiProperty({ example: 1.8 })
  localWallThicknessMm!: number;

  @ApiProperty({ example: 1.4 })
  minRemainingWallThicknessMm!: number;

  @ApiProperty({ example: 0.4 })
  maxSafeEngravingDepthMm!: number;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;
}

export class GemstoneOptionResponseDto {
  @ApiProperty({ example: 'g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  id!: string;

  @ApiProperty({ example: 'DIA-RD-050-VS1' })
  stoneCode!: string;

  @ApiProperty({ example: 'Natural Diamond Round 0.50ct' })
  name!: string;

  @ApiProperty({ example: 'DIAMOND' })
  stoneType!: string;

  @ApiProperty({ example: 'ROUND' })
  shape!: string;

  @ApiProperty({ example: 'F' })
  color!: string;

  @ApiProperty({ example: 'VS1' })
  clarity!: string;

  @ApiProperty({ example: 5.1 })
  dimensionLengthMm!: number;

  @ApiProperty({ example: 5.1 })
  dimensionWidthMm!: number;

  @ApiProperty({ example: true })
  isCertified!: boolean;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;
}

export class GemstoneSlotResponseDto {
  @ApiProperty({ example: 's1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  id!: string;

  @ApiProperty({ example: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  ringTemplateId!: string;

  @ApiProperty({ example: 1 })
  slotNumber!: number;

  @ApiProperty({ example: 'CENTER_STONE' })
  slotType!: string;

  @ApiProperty({ example: 'grp-uuid' })
  gemstoneGroupId!: string;

  @ApiProperty({ example: 'Stone_Center_Anchor' })
  anchorNodeName!: string;

  @ApiProperty({ example: true })
  isRequired!: boolean;
}

export class AnchorNodeDto {
  @ApiProperty({ example: 'Stone_Center_Anchor' })
  nodeName!: string;

  @ApiProperty({ example: 1, required: false })
  slotNumber?: number;

  @ApiProperty({ example: 'CENTER_STONE', required: false })
  slotType?: string;

  @ApiProperty({ example: 'INNER_FLAT', required: false })
  surfaceType?: string;
}

export class Template3DAssetsResponseDto {
  @ApiProperty({ example: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  templateId!: string;

  @ApiProperty({ example: 'models/templates/rt-classic-01/v1.glb' })
  model3dAssetKey!: string;

  @ApiProperty({
    example: 'https://cdn.memora.style/models/templates/rt-classic-01/v1.glb',
  })
  glbUrl!: string;

  @ApiProperty({ example: '1.0' })
  mappingVersion!: string;

  @ApiProperty({ type: [AnchorNodeDto] })
  anchors!: AnchorNodeDto[];
}

export class TemplateConfigurationOptionsResponseDto {
  @ApiProperty({ example: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  templateId!: string;

  @ApiProperty({ type: [MaterialResponseDto] })
  availableMaterials!: MaterialResponseDto[];

  @ApiProperty({ type: [TemplateVariantResponseDto] })
  availableVariants!: TemplateVariantResponseDto[];

  @ApiProperty({ type: [GemstoneSlotResponseDto] })
  gemstoneSlots!: GemstoneSlotResponseDto[];

  @ApiProperty({
    type: [String],
    example: ['NONE', 'FINGERPRINT', 'SOUNDWAVE'],
  })
  allowedPersonalizationPackages!: string[];
}

export class ValidationErrorDto {
  @ApiProperty({ example: 'RESIZE_OUT_OF_BOUNDS' })
  code!: string;

  @ApiProperty({
    example: 'Target size 15.0 exceeds max up delta 2.0 for standard size 12.0',
  })
  message!: string;

  @ApiProperty({ example: 'targetSize' })
  field!: string;
}

export class ValidateConfigurationResponseDto {
  @ApiProperty({ example: true })
  isValid!: boolean;

  @ApiProperty({ type: [ValidationErrorDto] })
  validationErrors!: ValidationErrorDto[];

  @ApiProperty({ example: 'v1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  templateVariantId!: string;

  @ApiProperty({ example: 0.4 })
  safeEngravingDepthMm!: number;

  @ApiProperty({ example: 1.0 })
  resizeDelta!: number;

  @ApiProperty({ example: true })
  isResizeAllowed!: boolean;
}
