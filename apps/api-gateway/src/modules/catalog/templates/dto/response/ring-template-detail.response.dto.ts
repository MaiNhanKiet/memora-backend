import { ApiPropertyOptional } from '@nestjs/swagger';
import { RingTemplateSummaryResponseDto } from './ring-template-summary.response.dto';

export class RingTemplateDetailResponseDto extends RingTemplateSummaryResponseDto {
  @ApiPropertyOptional({
    description: 'Minimum theta angle on the cylindrical engraving surface in degrees',
    example: -180.0,
  })
  theta_min_deg?: number;

  @ApiPropertyOptional({
    description: 'Maximum theta angle on the cylindrical engraving surface in degrees',
    example: 180.0,
  })
  theta_max_deg?: number;

  @ApiPropertyOptional({
    description: 'Minimum vertical coordinate on the cylindrical engraving surface in millimeters',
    example: 0.0,
  })
  v_min_mm?: number;

  @ApiPropertyOptional({
    description: 'Maximum vertical coordinate on the cylindrical engraving surface in millimeters',
    example: 5.5,
  })
  v_max_mm?: number;

  @ApiPropertyOptional({
    description: 'GeoJSON polygon / boundary definition of the safe engraving zone',
    example: { type: 'Polygon', coordinates: [] },
  })
  boundary_json?: unknown;

  @ApiPropertyOptional({
    description: 'Forbidden engraving zones such as hallmark areas or gemstone seats',
    example: [],
  })
  forbidden_zones_json?: unknown;

  @ApiPropertyOptional({
    description: 'Laser placement tolerance in millimeters',
    example: 0.05,
  })
  placement_tolerance_mm?: number;
}
