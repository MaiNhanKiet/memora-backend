import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

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
