import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class RoleCodeParamsDto {
  @ApiProperty()
  @IsString()
  @MaxLength(80)
  roleCode!: string;
}
