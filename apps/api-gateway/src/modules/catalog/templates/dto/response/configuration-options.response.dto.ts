import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TemplateVariantOptionResponseDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id!: string;

  @ApiProperty({ example: '8fa85f64-5717-4562-b3fc-2c963f66afa7' })
  material_id!: string;

  @ApiProperty({ example: 14.0 })
  standard_size!: number;

  @ApiProperty({ example: 1.8 })
  local_wall_thickness_mm!: number;

  @ApiProperty({ example: 0.4 })
  max_safe_engraving_depth_mm!: number;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;
}

export class MaterialOptionResponseDto {
  @ApiProperty({ example: '8fa85f64-5717-4562-b3fc-2c963f66afa7' })
  id!: string;

  @ApiProperty({ example: 'MAT-18K-YG' })
  code!: string;

  @ApiProperty({ example: '18K Yellow Gold' })
  name!: string;

  @ApiPropertyOptional({ example: 'GOLD' })
  material_family?: string;

  @ApiPropertyOptional({ example: 75.0 })
  purity_percent?: number;

  @ApiPropertyOptional({ example: '#E6CA65' })
  color?: string;
}

export class GemstoneSlotOptionResponseDto {
  @ApiProperty({ example: '1fa85f64-5717-4562-b3fc-2c963f66afa8' })
  id!: string;

  @ApiProperty({ example: 1 })
  slot_index!: number;

  @ApiProperty({ example: 'SLOT_CENTER_01' })
  code!: string;

  @ApiProperty({ example: 'node_gem_center_01' })
  glb_node_name!: string;
}

export class GemstoneGroupOptionResponseDto {
  @ApiProperty({ example: '2fa85f64-5717-4562-b3fc-2c963f66afa9' })
  id!: string;

  @ApiProperty({ example: 'GRP_CENTER' })
  code!: string;

  @ApiPropertyOptional({ example: 'Center Gemstone' })
  name?: string;

  @ApiProperty({ example: 'INDEPENDENT' })
  selection_mode!: string;

  @ApiProperty({ example: true })
  is_required!: boolean;

  @ApiProperty({ example: 1 })
  sequence_no!: number;

  @ApiProperty({ type: [GemstoneSlotOptionResponseDto] })
  slots!: GemstoneSlotOptionResponseDto[];
}

export class GemstoneOptionItemResponseDto {
  @ApiProperty({ example: '4fa85f64-5717-4562-b3fc-2c963f66afb0' })
  id!: string;

  @ApiProperty({ example: 'GEM-DIA-RD-050' })
  code!: string;

  @ApiProperty({ example: 'Round Brilliant Diamond 0.50ct' })
  name!: string;

  @ApiProperty({ example: 'DIAMOND' })
  stone_type!: string;

  @ApiProperty({ example: 'ROUND' })
  shape!: string;

  @ApiProperty({ example: 5.1 })
  length_mm!: number;

  @ApiProperty({ example: 5.1 })
  width_mm!: number;

  @ApiPropertyOptional({ example: 'E' })
  color_grade?: string;

  @ApiPropertyOptional({ example: 'VVS1' })
  clarity_grade?: string;

  @ApiProperty({ example: true })
  certified_required!: boolean;

  @ApiProperty({ example: ['2fa85f64-5717-4562-b3fc-2c963f66afa9'] })
  compatible_group_ids!: string[];
}

export class ConfigurationOptionsResponseDto {
  @ApiProperty({ type: [TemplateVariantOptionResponseDto] })
  variants!: TemplateVariantOptionResponseDto[];

  @ApiProperty({ type: [MaterialOptionResponseDto] })
  materials!: MaterialOptionResponseDto[];

  @ApiProperty({ type: [GemstoneGroupOptionResponseDto] })
  gemstone_groups!: GemstoneGroupOptionResponseDto[];

  @ApiProperty({ type: [GemstoneOptionItemResponseDto] })
  compatible_gemstones!: GemstoneOptionItemResponseDto[];
}
