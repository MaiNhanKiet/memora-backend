import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TemplateSlotAnchorResponseDto {
  @ApiProperty({
    example: '1fa85f64-5717-4562-b3fc-2c963f66afa8',
    description: 'Unique UUID of the gemstone slot',
  })
  slot_id!: string;

  @ApiProperty({
    example: '2fa85f64-5717-4562-b3fc-2c963f66afa9',
    description: 'UUID of the parent gemstone group',
  })
  group_id!: string;

  @ApiProperty({
    example: 1,
    description: 'Index of the slot in sequence within the group',
  })
  slot_index!: number;

  @ApiProperty({
    example: 'SLOT_CENTER_01',
    description: 'Logical code/name identifier of the slot',
  })
  slot_code!: string;

  @ApiProperty({
    example: 'node_gem_center_01',
    description: 'GLB mesh node name to attach the 3D gemstone model to',
  })
  glb_node_name!: string;
}

export class TemplateEngraveSurfaceResponseDto {
  @ApiPropertyOptional({
    example: 0.0,
    description: 'Minimum angle in degrees for cylindrical engraving bounds',
  })
  theta_min_deg?: number;

  @ApiPropertyOptional({
    example: 360.0,
    description: 'Maximum angle in degrees for cylindrical engraving bounds',
  })
  theta_max_deg?: number;

  @ApiPropertyOptional({
    example: -1.5,
    description: 'Minimum vertical position in mm along the ring width',
  })
  v_min_mm?: number;

  @ApiPropertyOptional({
    example: 1.5,
    description: 'Maximum vertical position in mm along the ring width',
  })
  v_max_mm?: number;

  @ApiPropertyOptional({
    example: { type: 'Polygon', coordinates: [] },
    description: 'GeoJSON/JSON bounding polygon for the engraving surface',
  })
  boundary_json?: unknown;

  @ApiPropertyOptional({
    example: [],
    description: 'Forbidden exclusion zones on the engraving surface',
  })
  forbidden_zones_json?: unknown;

  @ApiPropertyOptional({
    example: 0.05,
    description: 'Machine placement tolerance in mm',
  })
  placement_tolerance_mm?: number;
}

export class Template3DAssetsResponseDto {
  @ApiProperty({
    example: 'd9b9a6b2-658f-4c55-b04f-e224e78b7b25',
    description: 'Unique UUID of the ring template',
  })
  template_id!: string;

  @ApiProperty({
    example: 'catalog/templates/solitaire-classic.glb',
    description: 'Public 3D asset key for the GLB model',
  })
  glb_asset_key!: string;

  @ApiPropertyOptional({
    type: TemplateEngraveSurfaceResponseDto,
    description: 'Cylindrical engraving surface boundaries and forbidden zones',
  })
  engrave_surface?: TemplateEngraveSurfaceResponseDto;

  @ApiProperty({
    type: [TemplateSlotAnchorResponseDto],
    description: 'List of gemstone placement anchors and GLB mesh node mappings',
  })
  slot_anchors!: TemplateSlotAnchorResponseDto[];
}
