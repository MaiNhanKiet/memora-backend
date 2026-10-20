import { ApiProperty } from '@nestjs/swagger';
import { RBAC_V1_ROLE_CODES } from '@app/contracts';
import { IsIn } from 'class-validator';

export class AssignUserRoleRequestDto {
  @ApiProperty({ enum: RBAC_V1_ROLE_CODES })
  @IsIn(RBAC_V1_ROLE_CODES)
  roleCode!: (typeof RBAC_V1_ROLE_CODES)[number];
}
