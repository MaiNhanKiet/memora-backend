import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class RolePermissionParamsDto {
  @ApiProperty()
  @IsString()
  @MaxLength(80)
  roleCode!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  permissionCode!: string;
}
