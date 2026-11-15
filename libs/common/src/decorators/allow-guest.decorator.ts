import { SetMetadata } from '@nestjs/common';
import { AUTH_METADATA } from '../constants/auth-metadata.constants';

export interface AllowGuestOptions {
  /** Chấp nhận `X-Guest-Session` (khách ẩn danh, Guest Cart). */
  readonly session?: boolean;
  /** Chấp nhận `X-Guest-Access` (khách đã xác minh email, đơn All-NONE). */
  readonly verified?: boolean;
}

/**
 * Cho phép route nhận credential khách vãng lai khi không có Bearer.
 * Không dùng chung với `@Roles`/`@RequirePermissions`/`@RequireAnyPermissions`:
 * Gateway fail closed (startup check + guard).
 */
export const AllowGuest = (options: AllowGuestOptions = {}) =>
  SetMetadata(AUTH_METADATA.ALLOW_GUEST, {
    session: options.session === true,
    verified: options.verified === true,
  } satisfies Required<AllowGuestOptions>);
