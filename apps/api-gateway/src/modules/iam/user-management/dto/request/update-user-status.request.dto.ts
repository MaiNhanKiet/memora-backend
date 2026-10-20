import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

const USER_STATUSES = ['ACTIVE', 'LOCKED', 'DISABLED'] as const;

export class UpdateUserStatusRequestDto {
  @ApiProperty({ enum: USER_STATUSES })
  @IsIn(USER_STATUSES)
  status!: (typeof USER_STATUSES)[number];
}
