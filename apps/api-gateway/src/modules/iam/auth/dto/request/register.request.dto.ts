import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
  ValidateBy,
  type ValidationArguments,
} from 'class-validator';
import { IsStrongPassword } from '../../decorators/is-strong-password.decorator';

export class RegisterRequestDto {
  @ApiProperty({ example: 'Ada Lovelace', maxLength: 150 })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  fullName!: string;

  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

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
        return value === (args.object as RegisterRequestDto).password;
      },
      defaultMessage(): string {
        return 'confirmPassword must match password';
      },
    },
  })
  confirmPassword!: string;

  @ApiPropertyOptional({ example: '0912345678', maxLength: 30 })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @IsPhoneNumber('VN')
  phone?: string;
}
