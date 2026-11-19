import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReleaseInventoryBodyDto {
  @ApiPropertyOptional({
    description: 'Reason for releasing the held/reserved allocation',
    example: 'Khách đổi mẫu thiết kế khác',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
