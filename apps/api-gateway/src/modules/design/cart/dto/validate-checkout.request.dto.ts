import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ValidateCheckoutBodyDto {
  @ApiProperty({
    description: 'List of draft UUIDs to checkout (1 or 2 items per BM04)',
    type: [String],
    example: ['d1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsUUID('all', { each: true })
  selectedDraftIds!: string[];
}
