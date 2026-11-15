import { UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '@app/auth';
import type { VerifiedActor } from '@app/contracts';
import type { GatewayGuest } from './gateway-guest';

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

/**
 * Tạo `VerifiedActor` cho khách vãng lai từ `request.guest` (do JwtAuthGuard gắn
 * sau khi IAM xác thực credential, D-P-17). Chỉ có `customerIdentityId` hoặc
 * `guestSessionId`, không bao giờ kèm `userId`.
 */
export function toGuestVerifiedActor(
  guest: GatewayGuest | undefined,
): VerifiedActor {
  if (guest === undefined) {
    throw new UnauthorizedException();
  }
  if (guest.kind === 'VERIFIED_GUEST') {
    if (guest.customerIdentityId.trim() === '') {
      throw new UnauthorizedException();
    }
    return { customerIdentityId: guest.customerIdentityId };
  }
  if (guest.guestSessionId.trim() === '') {
    throw new UnauthorizedException();
  }
  return { guestSessionId: guest.guestSessionId };
}

/**
 * Trích xuất `VerifiedActor` cho route chấp nhận cả User đã đăng nhập và Khách vãng lai
 * (ví dụ Cart, Design Drafts).
 */
export function toActorFromUserOrGuest(
  user: AuthenticatedPrincipal | undefined,
  guest: GatewayGuest | undefined,
): VerifiedActor {
  if (user !== undefined && user.userId.trim() !== '') {
    return toVerifiedActor(user);
  }
  if (guest !== undefined) {
    return toGuestVerifiedActor(guest);
  }
  throw new UnauthorizedException();
}
