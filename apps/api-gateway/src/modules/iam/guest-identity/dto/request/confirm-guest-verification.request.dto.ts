import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches, MaxLength } from 'class-validator';

export class ConfirmGuestVerificationRequestDto {
  @ApiProperty()
  @IsString()
  @MaxLength(128)
  challengeId!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  otp!: string;
}
