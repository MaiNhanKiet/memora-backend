import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoleCatalogItemResponseDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  isActive!: boolean;
}

export class RolePermissionGrantResponseDto {
  @ApiProperty()
  roleCode!: string;

  @ApiProperty()
  permissionCode!: string;
}

export class RolePermissionsResponseDto {
  @ApiProperty()
  roleCode!: string;

  @ApiProperty({ type: [String] })
  permissionCodes!: string[];
}
