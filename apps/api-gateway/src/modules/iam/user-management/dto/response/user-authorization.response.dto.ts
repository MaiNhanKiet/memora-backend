import { ApiProperty } from '@nestjs/swagger';

export class UserAuthorizationResponseDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: [String] })
  roleCodes!: string[];

  @ApiProperty({ type: [String] })
  permissionCodes!: string[];
}
