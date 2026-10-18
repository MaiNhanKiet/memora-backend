import { applyDecorators } from '@nestjs/common';
import { Matches } from 'class-validator';

export function IsStrongPassword() {
  return applyDecorators(
    Matches(/[A-Z]/, {
      message: 'password must contain an uppercase letter',
    }),
    Matches(/\d/, { message: 'password must contain a number' }),
    Matches(/[^A-Za-z0-9\s]/, {
      message: 'password must contain a special character',
    }),
  );
}
