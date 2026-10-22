import { ApiProperty } from '@nestjs/swagger';
import { RingTemplateSummaryResponseDto } from './ring-template-summary.response.dto';

export class ListTemplatesResponseDto {
  @ApiProperty({
    description: 'List of active ring template summaries',
    type: [RingTemplateSummaryResponseDto],
  })
  items!: RingTemplateSummaryResponseDto[];

  @ApiProperty({
    description: 'Total number of active ring templates matching criteria',
    example: 42,
  })
  total!: number;
}
