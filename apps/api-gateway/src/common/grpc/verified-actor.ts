import { UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '@app/auth';
import type { VerifiedActor } from '@app/contracts';

/**
 * Tạo `memora.common.v1.VerifiedActor` cho RPC Commerce/Operations/Experience (D-P-03).
 * Chỉ nhận principal từ `@CurrentUser()` (JwtAuthGuard đã xác thực).
 * Không truyền access token, không lấy actor từ body/query/header của client.
 * Chỉ tạo actor USER. Actor khách vãng lai (`customerIdentityId` không kèm user,
 * `guestSessionId`) chỉ được tạo sau khi IAM kiểm tra credential của khách (D-P-17);
 * không bao giờ lấy từ header như `x-guest-session-id`.
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
