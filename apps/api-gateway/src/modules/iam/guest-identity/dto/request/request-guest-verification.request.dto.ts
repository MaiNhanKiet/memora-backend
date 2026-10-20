import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

export class RequestGuestVerificationRequestDto {
  @ApiProperty({ example: 'guest@example.com' })
  @IsEmail()
  @MaxLength(320)
  contactEmail!: string;
}
