import { ApiProperty } from '@nestjs/swagger';

export class UserStatusResponseDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  status!: string;
}
