import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { IsStrongPassword } from '../../decorators/is-strong-password.decorator';

export class ResetPasswordRequestDto {
  @ApiProperty({
    description: 'Password recovery credential from the action link',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  recoveryCredential!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @IsStrongPassword()
  password!: string;
}
