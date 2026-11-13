import { UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '@app/auth';
import type { VerifiedActor } from '@app/contracts';

/**
 * Tạo `memora.common.v1.VerifiedActor` cho RPC Commerce/Operations/Experience (D-P-03).
 * Chỉ nhận principal từ `@CurrentUser()` (JwtAuthGuard đã xác thực).
 * Không truyền access token, không lấy actor từ body/query/header của client.
 */
export function toVerifiedActor(
  principal: AuthenticatedPrincipal | undefined,
): VerifiedActor {
  if (principal === undefined || principal.userId.trim() === '') {
    throw new UnauthorizedException();
  }
  const customerIdentityId = readCustomerIdentityId(principal);
  return customerIdentityId === undefined
    ? { userId: principal.userId }
    : { userId: principal.userId, customerIdentityId };
}

function readCustomerIdentityId(
  principal: AuthenticatedPrincipal,
): string | undefined {
  if (!('customerIdentityId' in principal)) {
    return undefined;
  }
  const value: unknown = principal.customerIdentityId;
  return typeof value === 'string' && value !== '' ? value : undefined;
}
