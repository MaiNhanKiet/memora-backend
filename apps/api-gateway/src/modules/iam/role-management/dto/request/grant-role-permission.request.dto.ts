import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class GrantRolePermissionRequestDto {
  @ApiProperty()
  @IsString()
  @MaxLength(80)
  permissionCode!: string;
}
