import { UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '@app/auth';

export function requireActorUserId(
  principal: AuthenticatedPrincipal | undefined,
): string {
  if (principal === undefined || principal.userId.trim() === '') {
    throw new UnauthorizedException();
  }
  return principal.userId;
}
