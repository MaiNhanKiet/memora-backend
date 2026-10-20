import { ApiProperty } from '@nestjs/swagger';

export class ProvisionUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  roleCode!: string;

  @ApiProperty({
    description: 'One-time initial password. Do not log this value.',
  })
  initialPassword!: string;
}
