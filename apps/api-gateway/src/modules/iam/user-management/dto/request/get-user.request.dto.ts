import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GetUserParamsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;
}
