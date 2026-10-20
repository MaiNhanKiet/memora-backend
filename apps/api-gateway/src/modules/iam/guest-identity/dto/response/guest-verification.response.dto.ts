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
