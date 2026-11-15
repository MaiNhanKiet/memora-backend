import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateDesignShareLinkBodyDto {
  @ApiPropertyOptional({
    description: 'Expiration duration in days (default: 7)',
    example: 7,
    minimum: 1,
    maximum: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays?: number;
}

export class CreateDesignShareLinkResponseDto {
  @ApiProperty({ description: 'Link unique ID', example: 'd0b81e4b-70c1-4ebc-b391-4770ff901234' })
  linkId: string;

  @ApiProperty({ description: 'Plain share code', example: 'MMR-A8X9-2K1Z' })
  code: string;

  @ApiProperty({
    description: 'Direct frontend preview URL',
    example: 'https://memora.vn/design/shared?code=MMR-A8X9-2K1Z',
  })
  shareUrl: string;

  @ApiProperty({ description: 'Link status', example: 'ACTIVE' })
  status: string;

  @ApiProperty({ description: 'Expiration date ISO string' })
  expiresAt: string;
}

export class RevokeDesignShareLinkResponseDto {
  @ApiProperty({ description: 'Operation success flag', example: true })
  success: boolean;

  @ApiProperty({ description: 'Result message', example: 'Share link revoked successfully' })
  message: string;
}
