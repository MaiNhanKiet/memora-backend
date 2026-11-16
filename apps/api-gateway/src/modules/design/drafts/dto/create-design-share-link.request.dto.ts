import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateDesignShareLinkBodyDto {
  @ApiPropertyOptional({
    description: 'Lifetime of the link in days (1-30, default: 7)',
    example: 7,
    minimum: 1,
    maximum: 30,
    default: 7,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays?: number;
}
