import { ApiProperty } from '@nestjs/swagger';

export class UserRoleAssignmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  assignmentId!: string;

  @ApiProperty()
  roleCode!: string;

  @ApiProperty()
  roleName!: string;

  @ApiProperty()
  assignedAt!: string;
}

export class AssignUserRoleResponseDto {
  @ApiProperty({ format: 'uuid' })
  assignmentId!: string;

  @ApiProperty()
  roleCode!: string;

  @ApiProperty()
  assignedAt!: string;
}

export class RevokeUserRoleResponseDto {
  @ApiProperty({ format: 'uuid' })
  assignmentId!: string;

  @ApiProperty()
  roleCode!: string;

  @ApiProperty()
  revokedAt!: string;
}
