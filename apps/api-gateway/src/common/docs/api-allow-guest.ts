import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { AllowGuest, type AllowGuestOptions } from '@app/common';

/**
 * `@AllowGuest` plus matching Swagger security (D-P-17). Use this on Gateway routes
 * instead of `@AllowGuest` alone so Swagger shows which credentials the route accepts:
 * Bearer (signed-in user) and the allowed guest headers.
 */
export function ApiAllowGuest(options: AllowGuestOptions) {
  const decorators: (ClassDecorator | MethodDecorator)[] = [
    AllowGuest(options),
    ApiBearerAuth('bearer'),
  ];
  if (options.session === true) {
    decorators.push(ApiSecurity('guest-session'));
  }
  if (options.verified === true) {
    decorators.push(ApiSecurity('guest-access'));
  }
  decorators.push(
    ApiResponse({
      status: 401,
      description: 'Missing or invalid Bearer token or guest credential',
    }),
  );
  return applyDecorators(...decorators);
}
