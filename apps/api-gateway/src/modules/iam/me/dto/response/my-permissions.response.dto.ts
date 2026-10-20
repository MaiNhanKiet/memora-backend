import { ApiProperty } from '@nestjs/swagger';

export class MyPermissionsResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: [String] })
  roleCodes!: string[];

  @ApiProperty({ type: [String] })
  permissionCodes!: string[];
}
