import { ApiProperty } from '@nestjs/swagger';

export class CreateDesignShareLinkResponseDto {
  @ApiProperty({ example: 'sl-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d' })
  linkId!: string;

  @ApiProperty({ example: 'ABC123XYZ' })
  code!: string;

  @ApiProperty({
    example: 'https://memora.style/share/d/ABC123XYZ',
  })
  shareUrl!: string;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ example: '2026-11-21T03:30:00.000Z' })
  expiresAt!: string;
}

export class RevokeDesignShareLinkResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Share link revoked successfully' })
  message!: string;
}
