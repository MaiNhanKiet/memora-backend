import { ApiProperty } from '@nestjs/swagger';
import { RBAC_V1_ROLE_CODES } from '@app/contracts';
import { IsEmail, IsIn, IsNotIn, IsString, MaxLength } from 'class-validator';

const STAFF_ROLE_CODES = RBAC_V1_ROLE_CODES.filter(
  (code) => code !== 'CUSTOMER',
);

export class ProvisionUserRequestDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(150)
  fullName!: string;

  @ApiProperty({ enum: STAFF_ROLE_CODES })
  @IsIn(STAFF_ROLE_CODES)
  @IsNotIn(['CUSTOMER'])
  roleCode!: (typeof STAFF_ROLE_CODES)[number];
}
