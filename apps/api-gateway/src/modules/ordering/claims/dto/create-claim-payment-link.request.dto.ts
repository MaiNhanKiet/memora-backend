import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUrl } from 'class-validator';

export class CreateClaimPaymentLinkBodyDto {
  @ApiPropertyOptional({
    description: 'Client return URL on successful redirect',
    example: 'https://memora.vn/claims/claim-123/success',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  returnUrl?: string;

  @ApiPropertyOptional({
    description: 'Client cancel URL on cancellation',
    example: 'https://memora.vn/claims/claim-123/cancel',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  cancelUrl?: string;
}
