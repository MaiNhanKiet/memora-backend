import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty({ enum: ['ACTIVE', 'LOCKED', 'DISABLED'] })
  status!: string;

  @ApiProperty({ enum: ['LOCAL', 'GOOGLE', 'HYBRID'] })
  authProvider!: string;

  @ApiPropertyOptional()
  emailVerifiedAt?: string;

  @ApiPropertyOptional()
  lastLoginAt?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
