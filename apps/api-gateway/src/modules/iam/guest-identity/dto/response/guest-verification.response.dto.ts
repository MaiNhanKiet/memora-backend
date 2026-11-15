import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GuestVerificationChallengeResponseDto {
  @ApiProperty()
  challengeId!: string;

  @ApiProperty({ example: 300 })
  expiresInSeconds!: number;
}

export class GuestVerificationProofResponseDto {
  @ApiProperty()
  customerIdentityId!: string;

  @ApiProperty()
  guestProof!: string;

  @ApiProperty({ example: 900 })
  expiresInSeconds!: number;

  @ApiProperty({
    description:
      'Guest access token for guest order routes (header X-Guest-Access). Not a login token.',
  })
  guestAccessToken!: string;

  @ApiProperty({ example: 86400 })
  guestAccessExpiresInSeconds!: number;
}

export class GuestSessionResponseDto {
  @ApiProperty({
    description:
      'Anonymous guest session token (header X-Guest-Session). Returned once.',
  })
  guestSessionToken!: string;

  @ApiProperty({ example: '2026-11-22T00:00:00.000Z' })
  expiresAt!: string;
}

export class CustomerIdentityProjectionDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  displayName?: string;

  @ApiProperty()
  contactEmail!: string;

  @ApiPropertyOptional()
  emailVerifiedAt?: string;

  @ApiProperty()
  isPrimaryForUser!: boolean;

  @ApiPropertyOptional()
  accountLinkedAt?: string;
}

export class MyCustomerIdentityResponseDto {
  @ApiPropertyOptional({ type: CustomerIdentityProjectionDto, nullable: true })
  primary!: CustomerIdentityProjectionDto | null;
}

export class LinkedGuestIdentityResponseDto {
  @ApiProperty()
  customerIdentityId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  isPrimaryForUser!: boolean;

  @ApiProperty()
  accountLinkedAt!: string;
}
