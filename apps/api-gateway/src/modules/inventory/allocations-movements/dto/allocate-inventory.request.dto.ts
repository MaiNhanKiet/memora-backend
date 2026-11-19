import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AllocateInventoryBodyDto {
  @ApiProperty({
    description: 'Production attempt ID binding this allocation',
    example: '44444444-4444-4444-4444-444444444444',
  })
  @IsUUID()
  productionAttemptId!: string;
}
