import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RingTemplateSummaryResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the ring template (UUID)',
    example: 'd9b9a6b2-658f-4c55-b04f-e224e78b7b25',
  })
  id!: string;

  @ApiProperty({
    description: 'Unique human-readable SKU or template code',
    example: 'RNG-SOLITAIRE-01',
  })
  code!: string;

  @ApiProperty({
    description: 'Display name of the ring template',
    example: 'Classic Solitaire Ring',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Detailed description of styling and geometry',
    example: 'Timeless single gemstone solitaire with delicate band.',
  })
  description?: string;

  @ApiProperty({
    description: 'Public asset key for the 3D GLB mesh file',
    example: 'catalog/templates/solitaire-01.glb',
  })
  glb_asset_key!: string;

  @ApiProperty({
    description: 'Gemstone layout type',
    enum: ['NONE', 'SINGLE', 'MULTI'],
    example: 'SINGLE',
  })
  stone_layout!: string;

  @ApiProperty({
    description: 'Supported personalization packages',
    example: ['FINGERPRINT', 'SOUNDWAVE'],
    isArray: true,
  })
  design_supported_personalization_packages!: string[];

  @ApiProperty({
    description: 'Catalog publication status',
    example: 'ACTIVE',
  })
  status!: string;
}
