import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  MinLength,
  ValidateBy,
  type ValidationArguments,
} from 'class-validator';
import { IsStrongPassword } from '../../decorators/is-strong-password.decorator';

export class ChangePasswordRequestDto {
  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @IsStrongPassword()
  password!: string;

  @ApiProperty({
    minLength: 8,
    maxLength: 128,
    description: 'Must match password. This value is not stored.',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @ValidateBy({
    name: 'matchesPassword',
    validator: {
      validate(value: unknown, args: ValidationArguments): boolean {
        if (typeof value !== 'string') {
          return false;
        }
        return value === (args.object as ChangePasswordRequestDto).password;
      },
      defaultMessage(): string {
        return 'confirmPassword must match password';
      },
    },
  })
  confirmPassword!: string;
}
